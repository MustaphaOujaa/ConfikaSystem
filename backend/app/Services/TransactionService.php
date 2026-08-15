<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Support\Facades\DB;

class TransactionService
{
    public function __construct(private readonly DiscordLowStockNotifier $discordLowStockNotifier)
    {
    }

    public function create(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $totalAmount = collect($data['items'])->sum(
                fn (array $item) => $item['quantity'] * $item['unit_price']
            );

            $transaction = Transaction::create([
                'type' => $data['type'],
                'total_amount' => $totalAmount,
                'transaction_date' => now(),
            ]);

            $lowStockTriggered = collect();

            foreach ($data['items'] as $item) {
                TransactionItem::create([
                    'transaction_id' => $transaction->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                ]);

                $product = Product::whereKey($item['product_id'])->lockForUpdate()->firstOrFail();

                if ($data['type'] === 'sale') {
                    if ($product->quantity < $item['quantity']) {
                        throw new \Exception("Insufficient stock for product: {$product->name}");
                    }

                    $product->quantity -= $item['quantity'];
                } else {
                    $product->quantity += $item['quantity'];
                }

                $product->save();

                if ($product->quantity <= Product::LOW_STOCK_THRESHOLD) {
                    $lowStockTriggered->push($product->fresh());
                }
            }

            DB::afterCommit(fn () => $this->discordLowStockNotifier->notify($lowStockTriggered));

            return [
                'transaction' => $transaction->load('items.product'),
                'low_stock_alerts' => $lowStockTriggered->values(),
            ];
        });
    }
}
