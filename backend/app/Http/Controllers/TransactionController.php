<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    public function index()
    {
        return response()->json(Transaction::with('items.product')->latest()->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:sale,purchase',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated) {
            $totalAmount = 0;
            foreach ($validated['items'] as $item) {
                $totalAmount += $item['quantity'] * $item['unit_price'];
            }

            $transaction = Transaction::create([
                'type' => $validated['type'],
                'total_amount' => $totalAmount,
                'transaction_date' => now(),
            ]);

            $lowStockTriggered = [];

            foreach ($validated['items'] as $item) {
                TransactionItem::create([
                    'transaction_id' => $transaction->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                ]);

                $product = Product::find($item['product_id']);
                if ($validated['type'] === 'sale') {
                    if ($product->quantity < $item['quantity']) {
                        throw new \Exception("Insufficient stock for product: {$product->name}");
                    }
                    $product->quantity -= $item['quantity'];
                } else {
                    $product->quantity += $item['quantity'];
                }
                $product->save();

                // Check if now low stock
                if ($product->quantity <= $product->min_stock_alert) {
                    $lowStockTriggered[] = $product;
                }
            }

            return response()->json([
                'transaction' => $transaction->load('items.product'),
                'low_stock_alerts' => $lowStockTriggered
            ], 201);
        });
    }
}
