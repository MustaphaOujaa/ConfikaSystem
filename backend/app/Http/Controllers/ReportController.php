<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Contracts\View\View;

class ReportController extends Controller
{
    public function daily(Request $request): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json([
                'message' => 'Accès refusé. Les rapports journaliers financiers sont réservés aux administrateurs.'
            ], 403);
        }

        $dateParam = $request->query('date');
        $data = $this->getDailyData($dateParam);
        return response()->json($data);
    }

    public function dailyBlade(Request $request): View
    {
        $dateParam = $request->query('date');
        $data = $this->getDailyData($dateParam);
        return view('daily_report', $data);
    }

    private function getDailyData(?string $dateParam = null): array
    {
        try {
            $targetDate = $dateParam ? Carbon::parse($dateParam)->startOfDay() : Carbon::today();
        } catch (\Exception $e) {
            $targetDate = Carbon::today();
        }

        // Total products sold on target date (quantity & revenue)
        $saleItems = TransactionItem::whereHas('transaction', function ($query) use ($targetDate) {
            $query->where('type', 'sale')
                  ->whereDate('transaction_date', $targetDate);
        })->with(['product.category', 'product.brand'])->get();

        $soldQuantity = $saleItems->sum('quantity');

        $totalSalesRevenue = (float) Transaction::where('type', 'sale')
            ->whereDate('transaction_date', $targetDate)
            ->sum('total_amount');

        $transactionsCount = Transaction::where('type', 'sale')
            ->whereDate('transaction_date', $targetDate)
            ->count();

        // Group by product to build the detailed sold products table
        $productsSold = $saleItems->groupBy('product_id')->map(function ($items, $productId) {
            $first = $items->first();
            $product = $first->product;
            $qty = (int) $items->sum('quantity');
            $revenue = (float) $items->sum(fn ($i) => $i->quantity * $i->unit_price);
            $unitCost = $product ? (float) $product->cost_price : 0.0;
            $totalCost = $qty * $unitCost;
            $profit = $revenue - $totalCost;
            $avgPrice = $qty > 0 ? $revenue / $qty : ($product ? (float) $product->price : 0.0);

            return [
                'product_id' => (int) $productId,
                'name' => $product ? $product->name : ('Produit #' . $productId),
                'barcode' => $product ? $product->barcode : '-',
                'category' => $product && $product->category ? $product->category->name : 'Non catégorisé',
                'brand' => $product && $product->brand ? $product->brand->name : null,
                'quantity_sold' => $qty,
                'unit_cost' => round($unitCost, 2),
                'unit_price' => round($avgPrice, 2),
                'total_revenue' => round($revenue, 2),
                'total_cost' => round($totalCost, 2),
                'total_profit' => round($profit, 2),
            ];
        })->values()->sortByDesc('total_revenue')->values()->all();

        // Total cost of goods sold on target date
        $totalCostOfGoodsSold = collect($productsSold)->sum('total_cost');
        $netProfit = $totalSalesRevenue - $totalCostOfGoodsSold;

        return [
            'date' => $targetDate->toDateString(),
            'transactions_count' => $transactionsCount,
            'products_sold_count' => $soldQuantity,
            'distinct_products_count' => count($productsSold),
            'total_sales_revenue' => round($totalSalesRevenue, 2),
            'total_cost_of_goods_sold' => round($totalCostOfGoodsSold, 2),
            'net_profit_today' => round($netProfit, 2),
            'currency' => 'MAD',
            'products_sold' => $productsSold,
        ];
    }
}
