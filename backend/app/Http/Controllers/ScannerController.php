<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScannerController extends Controller
{
    public function __construct(private readonly TransactionService $transactionService)
    {
    }

    public function product(string $barcode): JsonResponse
    {
        $product = Product::with(['category', 'images'])
            ->where('barcode', $barcode)
            ->firstOrFail();

        return response()->json($product);
    }

    public function sale(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.barcode' => ['required', 'string', 'exists:products,barcode'],
            'items.*.quantity' => ['sometimes', 'integer', 'min:1'],
        ]);

        $items = collect($validated['items'])->map(function (array $item) {
            $product = Product::where('barcode', $item['barcode'])->firstOrFail();

            return [
                'product_id' => $product->id,
                'quantity' => $item['quantity'] ?? 1,
                'unit_price' => $product->price,
            ];
        })->all();

        return response()->json($this->transactionService->create([
            'type' => 'sale',
            'items' => $items,
        ]), 201);
    }
}
