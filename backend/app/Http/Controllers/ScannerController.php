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

    /**
     * Normalizes a barcode string that may have been sent as raw AZERTY symbols.
     * e.g., "('(-ç_'" -> "5456984"
     */
    private function normalizeAzertyBarcode(string $barcode): string
    {
        $azertyMap = [
            '&' => '1',
            'é' => '2',
            'É' => '2',
            '"' => '3',
            "'" => '4',
            '(' => '5',
            '-' => '6',
            '§' => '6',
            'è' => '7',
            'È' => '7',
            '_' => '8',
            'ç' => '9',
            'Ç' => '9',
            'à' => '0',
            'À' => '0',
        ];

        $hasAzerty = false;
        foreach (array_keys($azertyMap) as $char) {
            if (str_contains($barcode, $char)) {
                $hasAzerty = true;
                break;
            }
        }

        if (!$hasAzerty) {
            return $barcode;
        }

        $converted = strtr($barcode, $azertyMap);
        return ctype_digit($converted) ? $converted : $barcode;
    }

    public function product(string $barcode): JsonResponse
    {
        $normalized = $this->normalizeAzertyBarcode($barcode);

        $product = Product::with(['category', 'images'])
            ->where('barcode', $barcode)
            ->orWhere('barcode', $normalized)
            ->firstOrFail();

        return response()->json($product);
    }

    public function sale(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.barcode' => ['required', 'string'],
            'items.*.quantity' => ['sometimes', 'integer', 'min:1'],
            'items.*.unit_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ]);

        $items = collect($validated['items'])->map(function (array $item) {
            $normalized = $this->normalizeAzertyBarcode($item['barcode']);
            $product = Product::where('barcode', $item['barcode'])
                ->orWhere('barcode', $normalized)
                ->firstOrFail();

            $unitPrice = isset($item['unit_price']) && is_numeric($item['unit_price']) && (float) $item['unit_price'] >= 0
                ? (float) $item['unit_price']
                : (float) $product->price;

            return [
                'product_id' => $product->id,
                'quantity' => $item['quantity'] ?? 1,
                'unit_price' => $unitPrice,
            ];
        })->all();

        return response()->json($this->transactionService->create([
            'type' => 'sale',
            'items' => $items,
        ]), 201);
    }
}
