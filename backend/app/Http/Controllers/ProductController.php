<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * Display a listing of the products with dynamic filtering.
     */
    public function index(Request $request)
    {
        $query = Product::with(['category', 'brand']);

        // Search by Product Name or SKU
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        // Filter by Category and its Subcategories
        if ($request->filled('category_id')) {
            $categoryId = $request->category_id;
            // Get category IDs (parent + all child subcategories)
            $categoryIds = Category::where('id', $categoryId)
                ->orWhere('parent_id', $categoryId)
                ->pluck('id');
            $query->whereIn('category_id', $categoryIds);
        }

        // Filter by Brand
        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        // Filter by Price Range
        if ($request->filled('min_price')) {
            $query->where('selling_price', '>=', $request->min_price);
        }
        if ($request->filled('max_price')) {
            $query->where('selling_price', '<=', $request->max_price);
        }

        // Filter by Stock Status
        if ($request->filled('stock_status')) {
            $status = $request->stock_status;
            if ($status === 'out_of_stock') {
                $query->where('quantity', '<=', 0);
            } elseif ($status === 'low_stock') {
                $query->whereColumn('quantity', '<=', 'min_stock_alert')
                      ->where('quantity', '>', 0);
            } elseif ($status === 'in_stock') {
                $query->whereColumn('quantity', '>', 'min_stock_alert');
            }
        }

        $perPage = $request->get('per_page', 12);
        return response()->json($query->paginate($perPage));
    }

    /**
     * Store a newly created product.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sku' => 'required|string|unique:products,sku',
            'category_id' => 'nullable|exists:categories,id',
            'brand_id' => 'nullable|exists:brands,id',
            'quantity' => 'required|integer|min:0',
            'purchase_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'min_stock_alert' => 'required|integer|min:0',
            'image_url' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        $product = Product::create($validated);
        return response()->json($product->load(['category', 'brand']), 201);
    }

    /**
     * Display the specified product.
     */
    public function show(Product $product)
    {
        return response()->json($product->load(['category', 'brand']));
    }

    /**
     * Update the specified product.
     */
    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'sku' => 'sometimes|required|string|unique:products,sku,' . $product->id,
            'category_id' => 'nullable|exists:categories,id',
            'brand_id' => 'nullable|exists:brands,id',
            'quantity' => 'sometimes|required|integer|min:0',
            'purchase_price' => 'sometimes|required|numeric|min:0',
            'selling_price' => 'sometimes|required|numeric|min:0',
            'min_stock_alert' => 'sometimes|required|integer|min:0',
            'image_url' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        $product->update($validated);
        return response()->json($product->load(['category', 'brand']));
    }

    /**
     * Remove the specified product.
     */
    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(['message' => 'Product deleted successfully']);
    }

    /**
     * Dedicated Endpoint for Low-Stock / Out-of-Stock Alerts.
     */
    public function lowStockAlerts()
    {
        $lowStockProducts = Product::with(['category', 'brand'])
            ->whereColumn('quantity', '<=', 'min_stock_alert')
            ->orderBy('quantity', 'asc')
            ->get();

        return response()->json([
            'count' => $lowStockProducts->count(),
            'items' => $lowStockProducts
        ]);
    }
}
