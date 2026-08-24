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
    public function index(): JsonResponse
    {
        return response()->json(Product::with(['category', 'brand', 'images'])->latest()->paginate());
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
            'barcode'     => ['required', 'string', 'max:255', 'unique:products,barcode'],
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
            'barcode'     => $validated['barcode'],
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
        event(new ProductCreated($product));

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
                'barcode'     => ['sometimes', 'required', 'string', 'max:255', Rule::unique('products', 'barcode')->ignore($product)],
                'description' => ['nullable', 'string'],
                'cost_price'  => ['sometimes', 'nullable', 'numeric', 'min:0'],
                'price'       => ['sometimes', 'required', 'numeric', 'min:0'],
                'quantity'    => ['sometimes', 'required', 'integer', 'min:0'],
                'image'       => ['nullable', 'image', 'max:5120'],
                'image_url'   => ['nullable', 'string'],
            ]);

            $product->update($validated);

            // Update single main image if provided
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
        } else {
            // Caissier: can update product info and quantity, but NOT prices
            $validated = $request->validate([
                'category_id' => ['sometimes', 'required', 'exists:categories,id'],
                'brand_id'    => ['nullable', 'exists:brands,id'],
                'name'        => ['sometimes', 'required', 'string', 'max:255'],
                'barcode'     => ['sometimes', 'required', 'string', 'max:255', Rule::unique('products', 'barcode')->ignore($product)],
                'description' => ['nullable', 'string'],
                'quantity'    => ['sometimes', 'required', 'integer', 'min:0'],
                // price and cost_price are intentionally excluded — caissier cannot change pricing
            ]);
            $product->update($validated);
        }

        $product->refresh()->load(['category', 'brand', 'images']);
        event(new ProductUpdated($product));

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

        event(new ProductDeleted($productId));

        return response()->json(status: 204);
    }
}
