<?php

namespace App\Http\Controllers;

use App\Events\BrandCreated;
use App\Events\BrandDeleted;
use App\Events\BrandUpdated;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BrandController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Brand::withCount('products')->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:brands,name'],
        ]);

        $brand = Brand::create($validated);
        $brand->loadCount('products');

        event(new BrandCreated($brand));

        return response()->json($brand, 201);
    }

    public function show(Brand $brand): JsonResponse
    {
        return response()->json($brand->loadCount('products')->load('products'));
    }

    public function update(Request $request, Brand $brand): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('brands', 'name')->ignore($brand)],
        ]);

        $brand->update($validated);
        $brand->loadCount('products');

        event(new BrandUpdated($brand));

        return response()->json($brand);
    }

    public function destroy(Brand $brand): JsonResponse
    {
        $brandId = $brand->id;
        $brand->delete();

        event(new BrandDeleted($brandId));

        return response()->json(status: 204);
    }
}
