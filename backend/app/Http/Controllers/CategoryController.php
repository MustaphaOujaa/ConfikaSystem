<?php

namespace App\Http\Controllers;

use App\Events\CategoryCreated;
use App\Events\CategoryDeleted;
use App\Events\CategoryUpdated;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Category::withCount('products')->latest()->paginate(10));
    }

    public function store(Request $request): JsonResponse
    {
        $category = Category::create($request->validate([
            'name' => ['required', 'string', 'max:255'],
            // 'slug' => ['required', 'string', 'max:255', 'unique:categories,slug'],
            'description' => ['nullable', 'string'],
        ]));

        $category->loadCount('products');

        try {
            event(new CategoryCreated($category));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('CategoryCreated broadcast failed: ' . $e->getMessage());
        }

        return response()->json($category, 201);
    }

    public function show(Category $category): JsonResponse
    {
        return response()->json($category->load('products'));
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $category->update($request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            // 'slug' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('categories', 'slug')->ignore($category)],
            'description' => ['nullable', 'string'],
        ]));

        $category->loadCount('products');

        try {
            event(new CategoryUpdated($category));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('CategoryUpdated broadcast failed: ' . $e->getMessage());
        }

        return response()->json($category);
    }

    public function destroy(Category $category): JsonResponse
    {
        $categoryId = $category->id;
        $category->delete();

        try {
            event(new CategoryDeleted($categoryId));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('CategoryDeleted broadcast failed: ' . $e->getMessage());
        }

        return response()->json(status: 204);
    }
}
