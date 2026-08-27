<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Support\Facades\DB;

class TransactionService
{
    public function create(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $lowStockTriggered = collect();
            $itemsData = [];
            $totalAmount = 0;

            foreach ($data['items'] as $item) {
                $product = Product::whereKey($item['product_id'])->lockForUpdate()->firstOrFail();

                // Auto-resolve unit price: for purchase use cost_price; for sale use price
                if (isset($item['unit_price']) && is_numeric($item['unit_price']) && (float) $item['unit_price'] >= 0) {
                    $unitPrice = (float) $item['unit_price'];
                } else {
                    $unitPrice = $data['type'] === 'purchase'
                        ? (float) ($product->cost_price ?? 0)
                        : (float) $product->price;
                }

                $quantity = (int) $item['quantity'];
                $totalAmount += $quantity * $unitPrice;

                if ($data['type'] === 'sale') {
                    if ($product->quantity < $quantity) {
                        throw new \Exception("Insufficient stock for product: {$product->name}");
                    }
                    $product->quantity -= $quantity;
                } else {
                    $product->quantity += $quantity;
                }

                $product->save();

                if ($product->quantity <= Product::LOW_STOCK_THRESHOLD) {
                    $lowStockTriggered->push($product->fresh());
                }

                $itemsData[] = [
                    'product_id' => $product->id,
                    'quantity'   => $quantity,
                    'unit_price' => $unitPrice,
                ];
            }

            $transaction = Transaction::create([
                'type'             => $data['type'],
                'total_amount'     => $totalAmount,
                'transaction_date' => now(),
            ]);

            foreach ($itemsData as $itemRow) {
                TransactionItem::create([
                    'transaction_id' => $transaction->id,
                    'product_id'     => $itemRow['product_id'],
                    'quantity'       => $itemRow['quantity'],
                    'unit_price'     => $itemRow['unit_price'],
                ]);
            }

            DB::afterCommit(function () use ($transaction) {
                event(new \App\Events\TransactionCreated($transaction));
            });


            return [
                'transaction'      => $transaction->load('items.product'),
                'low_stock_alerts' => $lowStockTriggered->values(),
            ];
        });
    }
}
