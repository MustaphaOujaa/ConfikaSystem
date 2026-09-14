<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductStock;
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
                $quantity = (int) $item['quantity'];

                // Handle product stock batch if specified or resolve from active stocks
                $stockId = $item['product_stock_id'] ?? null;
                $stock = null;

                if ($stockId) {
                    $stock = ProductStock::where('id', $stockId)
                        ->where('product_id', $product->id)
                        ->lockForUpdate()
                        ->first();
                }

                // If not explicitly provided, try to pick the first available batch with stock
                if (!$stock && $data['type'] === 'sale') {
                    $stock = ProductStock::where('product_id', $product->id)
                        ->where('quantity', '>', 0)
                        ->orderBy('id', 'asc')
                        ->lockForUpdate()
                        ->first();
                }

                // Auto-resolve unit price
                if (isset($item['unit_price']) && is_numeric($item['unit_price']) && (float) $item['unit_price'] >= 0) {
                    $unitPrice = (float) $item['unit_price'];
                } elseif ($stock) {
                    $unitPrice = $data['type'] === 'purchase'
                        ? (float) $stock->cost_price
                        : (float) $stock->price;
                } else {
                    $unitPrice = $data['type'] === 'purchase'
                        ? (float) ($product->cost_price ?? 0)
                        : (float) $product->price;
                }

                $totalAmount += $quantity * $unitPrice;

                if ($data['type'] === 'sale') {
                    if ($product->quantity < $quantity) {
                        throw new \Exception("Insufficient stock for product: {$product->name}");
                    }
                    $product->quantity -= $quantity;

                    if ($stock) {
                        if ($stock->quantity < $quantity) {
                            // If selected batch has less than requested, deplete it and allow remaining from other batches
                            $stock->quantity = 0;
                        } else {
                            $stock->quantity -= $quantity;
                        }
                        $stock->save();
                    }
                } else {
                    $product->quantity += $quantity;
                    if ($stock) {
                        $stock->quantity += $quantity;
                        $stock->save();
                    }
                }

                $product->save();

                if ($product->quantity <= Product::LOW_STOCK_THRESHOLD) {
                    $lowStockTriggered->push($product->fresh());
                }

                $itemsData[] = [
                    'product_id'       => $product->id,
                    'product_stock_id' => $stock?->id,
                    'quantity'         => $quantity,
                    'unit_price'       => $unitPrice,
                ];
            }

            $transaction = Transaction::create([
                'type'             => $data['type'],
                'total_amount'     => $totalAmount,
                'transaction_date' => now(),
            ]);

            foreach ($itemsData as $itemRow) {
                TransactionItem::create([
                    'transaction_id'   => $transaction->id,
                    'product_id'       => $itemRow['product_id'],
                    'product_stock_id' => $itemRow['product_stock_id'],
                    'quantity'         => $itemRow['quantity'],
                    'unit_price'       => $itemRow['unit_price'],
                ]);
            }

            DB::afterCommit(function () use ($transaction) {
                try {
                    event(new \App\Events\TransactionCreated($transaction));
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('TransactionCreated broadcast failed: ' . $e->getMessage());
                }
            });

            return [
                'transaction'      => $transaction->load(['items.product', 'items.stock']),
                'low_stock_alerts' => $lowStockTriggered->values(),
            ];
        });
    }
}
