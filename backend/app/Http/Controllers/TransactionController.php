<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\Product;
use App\Services\DiscordLowStockNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    public function __construct(private readonly DiscordLowStockNotifier $discordLowStockNotifier)
    {
    }

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

            $lowStockTriggered = collect();

            foreach ($validated['items'] as $item) {
                TransactionItem::create([
                    'transaction_id' => $transaction->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                ]);

                $product = Product::whereKey($item['product_id'])->lockForUpdate()->firstOrFail();
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
                if ($product->quantity <= Product::LOW_STOCK_THRESHOLD) {
                    $lowStockTriggered->push($product->fresh());
                }
            }

            DB::afterCommit(fn () => $this->discordLowStockNotifier->notify($lowStockTriggered));

            return response()->json([
                'transaction' => $transaction->load('items.product'),
                'low_stock_alerts' => $lowStockTriggered->values(),
            ], 201);
        });
    }
}
