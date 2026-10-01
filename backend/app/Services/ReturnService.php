<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductReturn;
use App\Models\ProductStock;
use App\Models\ReturnItem;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReturnService
{
    /**
     * Process a product return for an existing sale transaction.
     *
     * @param array $data
     * @return ProductReturn
     * @throws ValidationException
     */
    public function processReturn(array $data): ProductReturn
    {
        return DB::transaction(function () use ($data) {
            $transaction = Transaction::with('items.product')->whereKey($data['transaction_id'])->lockForUpdate()->firstOrFail();

            if ($transaction->type !== 'sale') {
                throw ValidationException::withMessages([
                    'transaction_id' => ['Seules les transactions de vente peuvent faire l\'objet d\'un retour.'],
                ]);
            }

            if (empty($data['items'])) {
                throw ValidationException::withMessages([
                    'items' => ['Veuillez sélectionner au moins un article à retourner.'],
                ]);
            }

            $totalRefundAmount = 0.0;
            $returnItemsToCreate = [];

            // Process each return item candidate
            foreach ($data['items'] as $index => $itemData) {
                $txItemId = $itemData['transaction_item_id'];
                $txItem = $transaction->items->firstWhere('id', $txItemId);

                if (!$txItem) {
                    throw ValidationException::withMessages([
                        "items.{$index}" => ['L\'article spécifié n\'appartient pas à cette transaction.'],
                    ]);
                }

                $returnQty = (int) $itemData['quantity'];
                if ($returnQty <= 0) {
                    throw ValidationException::withMessages([
                        "items.{$index}.quantity" => ['La quantité à retourner doit être supérieure à zéro.'],
                    ]);
                }

                $availableToReturn = (int) $txItem->quantity - (int) ($txItem->returned_quantity ?? 0);
                if ($returnQty > $availableToReturn) {
                    throw ValidationException::withMessages([
                        "items.{$index}.quantity" => [
                            "Quantité trop élevée pour {$txItem->product?->name}. Disponible au retour: {$availableToReturn}."
                        ],
                    ]);
                }

                $refundPrice = isset($itemData['refund_price']) && is_numeric($itemData['refund_price'])
                    ? (float) $itemData['refund_price']
                    : (float) $txItem->unit_price;

                if ($refundPrice < 0 || $refundPrice > (float) $txItem->unit_price) {
                    throw ValidationException::withMessages([
                        "items.{$index}.refund_price" => ['Le prix de remboursement unitaire ne peut pas dépasser le prix de vente initial.'],
                    ]);
                }

                $restocked = isset($itemData['restocked']) ? (bool) $itemData['restocked'] : true;
                $totalRefundAmount += ($returnQty * $refundPrice);

                $returnItemsToCreate[] = [
                    'tx_item'          => $txItem,
                    'quantity'         => $returnQty,
                    'unit_price'       => (float) $txItem->unit_price,
                    'refund_price'     => $refundPrice,
                    'restocked'        => $restocked,
                    'product_stock_id' => $txItem->product_stock_id,
                ];
            }

            // Create Master Return Record
            $productReturn = ProductReturn::create([
                'transaction_id' => $transaction->id,
                'user_id'        => $data['user_id'] ?? null,
                'refund_amount'  => round($totalRefundAmount, 2),
                'payment_method' => $data['payment_method'] ?? 'cash',
                'reason'         => $data['reason'] ?? null,
                'notes'          => $data['notes'] ?? null,
            ]);

            // Save individual items and update stock & transaction item
            foreach ($returnItemsToCreate as $itemInfo) {
                /** @var TransactionItem $txItem */
                $txItem = $itemInfo['tx_item'];
                $qty = $itemInfo['quantity'];

                ReturnItem::create([
                    'product_return_id'   => $productReturn->id,
                    'transaction_item_id' => $txItem->id,
                    'product_id'          => $txItem->product_id,
                    'product_stock_id'    => $itemInfo['product_stock_id'],
                    'quantity'            => $qty,
                    'unit_price'          => $itemInfo['unit_price'],
                    'refund_price'        => $itemInfo['refund_price'],
                    'restocked'           => $itemInfo['restocked'],
                ]);

                // Update returned quantity on original transaction item
                $txItem->returned_quantity = ((int) $txItem->returned_quantity) + $qty;
                $txItem->save();

                // If restocked, bring back products into inventory
                if ($itemInfo['restocked']) {
                    $product = Product::whereKey($txItem->product_id)->lockForUpdate()->first();
                    if ($product) {
                        $product->quantity += $qty;
                        $product->save();
                    }

                    if (!empty($itemInfo['product_stock_id'])) {
                        $stock = ProductStock::whereKey($itemInfo['product_stock_id'])->lockForUpdate()->first();
                        if ($stock) {
                            $stock->quantity += $qty;
                            $stock->save();
                        }
                    }
                }
            }

            // Update Transaction return status
            $freshItems = $transaction->items()->get();
            $totalSold = $freshItems->sum('quantity');
            $totalReturned = $freshItems->sum('returned_quantity');

            if ($totalReturned >= $totalSold) {
                $transaction->return_status = 'full';
            } elseif ($totalReturned > 0) {
                $transaction->return_status = 'partial';
            } else {
                $transaction->return_status = 'none';
            }
            $transaction->save();

            return $productReturn->load([
                'items.product',
                'items.stock',
                'transaction.items.product',
                'user',
            ]);
        });
    }
}
