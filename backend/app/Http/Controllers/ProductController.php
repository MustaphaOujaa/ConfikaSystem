<?php

namespace App\Http\Controllers;

use App\Events\ProductCreated;
use App\Events\ProductDeleted;
use App\Events\ProductUpdated;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'brand', 'images']);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->input('brand_id'));
        }

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            // Normalize AZERTY barcode characters if barcode scanner typed into search
            $azertyMap = [
                '&' => '1', 'é' => '2', 'É' => '2', '"' => '3', "'" => '4',
                '(' => '5', '-' => '6', '§' => '6', 'è' => '7', 'È' => '7',
                '_' => '8', 'ç' => '9', 'Ç' => '9', 'à' => '0', 'À' => '0',
            ];
            $normalizedSearch = strtr($search, $azertyMap);

            $query->where(function ($q) use ($search, $normalizedSearch) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
                if ($normalizedSearch !== $search) {
                    $q->orWhere('barcode', 'like', "%{$normalizedSearch}%");
                }
            });
        }

        $sortBy = $request->input('sort_by', 'latest');
        switch ($sortBy) {
            case 'name_asc':
                $query->orderBy('name', 'asc');
                break;
            case 'name_desc':
                $query->orderBy('name', 'desc');
                break;
            case 'price_asc':
                $query->orderBy('price', 'asc');
                break;
            case 'price_desc':
                $query->orderBy('price', 'desc');
                break;
            case 'stock_asc':
            case 'quantity_asc':
                $query->orderBy('quantity', 'asc');
                break;
            case 'stock_desc':
            case 'quantity_desc':
                $query->orderBy('quantity', 'desc');
                break;
            case 'oldest':
                $query->oldest();
                break;
            case 'latest':
            default:
                $query->latest();
                break;
        }

        $perPage = (int) $request->input('per_page', 15);
        if ($perPage <= 0 || $perPage > 100) {
            $perPage = 15;
        }

        return response()->json($query->paginate($perPage));
    }

    public function lowStockAlerts(): JsonResponse
    {
        $products = Product::with(['category', 'brand', 'images'])
            ->where('quantity', '<=', Product::LOW_STOCK_THRESHOLD)
            ->latest()
            ->get();

        return response()->json([
            'count' => $products->count(),
            'items' => $products,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json([
                'message' => 'Accès refusé. Seul un administrateur peut créer des produits.'
            ], 403);
        }

        $validated = $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'brand_id'    => ['nullable', 'exists:brands,id'],
            'name'        => ['required', 'string', 'max:255'],
            'barcode'     => ['nullable', 'string', 'max:255', 'unique:products,barcode'],
            'description' => ['nullable', 'string'],
            'cost_price'  => ['nullable', 'numeric', 'min:0'],
            'price'       => ['required', 'numeric', 'min:0'],
            'quantity'    => ['required', 'integer', 'min:0'],
            'image'       => ['nullable', 'image', 'max:5120'],
            'image_url'   => ['nullable', 'string'],
        ]);

        $product = Product::create([
            'category_id' => $validated['category_id'],
            'brand_id'    => $validated['brand_id'] ?? null,
            'name'        => $validated['name'],
            'barcode'     => !empty($validated['barcode']) ? $validated['barcode'] : null,
            'description' => $validated['description'] ?? null,
            'cost_price'  => $validated['cost_price'] ?? 0,
            'price'       => $validated['price'],
            'quantity'    => $validated['quantity'],
        ]);

        // Single main image handling
        $imagePath = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $imagePath = Storage::url($path);
        } elseif (!empty($validated['image_url'])) {
            $imagePath = $validated['image_url'];
        }

        if ($imagePath) {
            $product->images()->create([
                'path'       => $imagePath,
                'alt_text'   => $product->name,
                'sort_order' => 1,
            ]);
        }

        $product->refresh()->load(['category', 'brand', 'images']);
        try {
            event(new ProductCreated($product));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('ProductCreated broadcast failed: ' . $e->getMessage());
        }

        return response()->json($product, 201);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json($product->load(['category', 'brand', 'images']));
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $isAdmin = $request->user()?->isAdmin();

        if ($isAdmin) {
            // Admin: full update of all product fields
            $validated = $request->validate([
                'category_id' => ['sometimes', 'required', 'exists:categories,id'],
                'brand_id'    => ['nullable', 'exists:brands,id'],
                'name'        => ['sometimes', 'required', 'string', 'max:255'],
                'barcode'     => ['sometimes', 'nullable', 'string', 'max:255', Rule::unique('products', 'barcode')->ignore($product)],
                'description' => ['nullable', 'string'],
                'cost_price'  => ['sometimes', 'nullable', 'numeric', 'min:0'],
                'price'       => ['sometimes', 'required', 'numeric', 'min:0'],
                'quantity'    => ['sometimes', 'required', 'integer', 'min:0'],
                'image'       => ['nullable', 'image', 'max:5120'],
                'image_url'   => ['nullable', 'string'],
            ]);

            if (array_key_exists('barcode', $validated)) {
                $validated['barcode'] = !empty($validated['barcode']) ? $validated['barcode'] : null;
            }

            $product->update($validated);
        } else {
            // Caissier: can update product info, quantity, and image, but NOT prices
            $validated = $request->validate([
                'category_id' => ['sometimes', 'required', 'exists:categories,id'],
                'brand_id'    => ['nullable', 'exists:brands,id'],
                'name'        => ['sometimes', 'required', 'string', 'max:255'],
                'barcode'     => ['sometimes', 'nullable', 'string', 'max:255', Rule::unique('products', 'barcode')->ignore($product)],
                'description' => ['nullable', 'string'],
                'quantity'    => ['sometimes', 'required', 'integer', 'min:0'],
                'image'       => ['nullable', 'image', 'max:5120'],
                'image_url'   => ['nullable', 'string'],
                // price and cost_price are intentionally excluded — caissier cannot change pricing
            ]);

            if (array_key_exists('barcode', $validated)) {
                $validated['barcode'] = !empty($validated['barcode']) ? $validated['barcode'] : null;
            }

            $product->update($validated);
        }

        // Update single main image if provided (Admin or Caissier)
        $imagePath = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $imagePath = Storage::url($path);
        } elseif (array_key_exists('image_url', $validated) && !empty($validated['image_url'])) {
            $imagePath = $validated['image_url'];
        }

        if ($imagePath) {
            $product->images()->delete();
            $product->images()->create([
                'path'       => $imagePath,
                'alt_text'   => $product->name,
                'sort_order' => 1,
            ]);
        }

        $product->refresh()->load(['category', 'brand', 'images']);
        try {
            event(new ProductUpdated($product));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('ProductUpdated broadcast failed: ' . $e->getMessage());
        }

        return response()->json($product);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json([
                'message' => 'Accès refusé. Seul un administrateur peut supprimer des produits.'
            ], 403);
        }

        $productId = $product->id;
        $product->delete();

        try {
            event(new ProductDeleted($productId));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('ProductDeleted broadcast failed: ' . $e->getMessage());
        }

        return response()->json(status: 204);
    }
}
