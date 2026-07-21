<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index()
    {
        // Return hierarchical categories (top level with children)
        $categories = Category::with('children')->whereNull('parent_id')->get();
        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|exists:categories,id',
        ]);

        $validated['slug'] = Str::slug($validated['name']) . '-' . time();
        $category = Category::create($validated);

        return response()->json($category, 201);
    }
}
