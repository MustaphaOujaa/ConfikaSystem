<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProductImageController extends Controller
{
    public function store(Request $request, Product $product): JsonResponse
    {
        if ($product->images()->count() >= 5) {
            throw ValidationException::withMessages([
                'product_id' => ['A product can have up to 5 images.'],
            ]);
        }

        $image = $product->images()->create($request->validate([
            'path' => ['required', 'string', 'max:255'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['required', 'integer', 'min:1', 'max:5', Rule::unique('images', 'sort_order')->where('product_id', $product->id)],
        ]));

        return response()->json($image, 201);
    }

    public function update(Request $request, ProductImage $image): JsonResponse
    {
        $image->update($request->validate([
            'path' => ['sometimes', 'required', 'string', 'max:255'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'sort_order' => [
                'sometimes',
                'required',
                'integer',
                'min:1',
                'max:5',
                Rule::unique('images', 'sort_order')->where('product_id', $image->product_id)->ignore($image),
            ],
        ]));

        return response()->json($image);
    }

    public function destroy(ProductImage $image): JsonResponse
    {
        $image->delete();

        return response()->json(status: 204);
    }
}
