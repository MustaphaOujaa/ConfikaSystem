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

    public function monthly(Request $request): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json([
                'message' => 'Accès refusé. Les rapports mensuels financiers sont réservés aux administrateurs.'
            ], 403);
        }

        $year = (int) $request->query('year', Carbon::now()->year);
        if ($year < 2000 || $year > 2100) {
            $year = Carbon::now()->year;
        }

        $monthlyData = [];
        $totalYearlySales = 0.0;
        $totalYearlyCost = 0.0;
        $totalYearlyProfit = 0.0;
        $totalYearlyItemsSold = 0;
        $totalYearlyTransactions = 0;

        $monthNames = [
            1 => 'Jan', 2 => 'Fév', 3 => 'Mar', 4 => 'Avr',
            5 => 'Mai', 6 => 'Juin', 7 => 'Juil', 8 => 'Août',
            9 => 'Sept', 10 => 'Oct', 11 => 'Nov', 12 => 'Déc'
        ];

        // Fetch all sale transactions for the year with items and products
        $sales = Transaction::where('type', 'sale')
            ->whereYear('transaction_date', $year)
            ->with(['items.product'])
            ->get();

        // Fetch all returns for the year
        $returns = \App\Models\ProductReturn::whereYear('created_at', $year)
            ->with(['items.product'])
            ->get();

        $totalYearlyRefunds = 0.0;

        for ($m = 1; $m <= 12; $m++) {
            $monthSales = $sales->filter(function ($tx) use ($m) {
                return Carbon::parse($tx->transaction_date)->month === $m;
            });

            $monthReturns = $returns->filter(function ($ret) use ($m) {
                return Carbon::parse($ret->created_at)->month === $m;
            });

            $monthGrossRevenue = (float) $monthSales->sum('total_amount');
            $monthRefunds = (float) $monthReturns->sum('refund_amount');
            $monthNetRevenue = $monthGrossRevenue - $monthRefunds;
            $monthTxCount = $monthSales->count();
            $monthReturnsCount = $monthReturns->count();
            $monthItemsSold = 0;
            $monthCost = 0.0;

            foreach ($monthSales as $tx) {
                foreach ($tx->items as $item) {
                    $qty = (int) $item->quantity;
                    $monthItemsSold += $qty;
                    $unitCost = $item->product ? (float) $item->product->cost_price : 0.0;
                    $monthCost += ($qty * $unitCost);
                }
            }

            // Deduct cost of restocked returned items
            $returnedRestockedCost = 0.0;
            foreach ($monthReturns as $ret) {
                foreach ($ret->items as $retItem) {
                    if ($retItem->restocked) {
                        $cost = $retItem->product ? (float) $retItem->product->cost_price : 0.0;
                        $returnedRestockedCost += ($retItem->quantity * $cost);
                    }
                }
            }

            $monthNetCost = max(0, $monthCost - $returnedRestockedCost);
            $monthProfit = $monthNetRevenue - $monthNetCost;

            $totalYearlySales += $monthNetRevenue;
            $totalYearlyCost += $monthNetCost;
            $totalYearlyProfit += $monthProfit;
            $totalYearlyItemsSold += $monthItemsSold;
            $totalYearlyTransactions += $monthTxCount;
            $totalYearlyRefunds += $monthRefunds;

            $monthlyData[] = [
                'month_num' => $m,
                'month_name' => $monthNames[$m],
                'month_label' => $monthNames[$m] . ' ' . $year,
                'total_sold' => round($monthNetRevenue, 2),
                'gross_sold' => round($monthGrossRevenue, 2),
                'refunds' => round($monthRefunds, 2),
                'total_cost' => round($monthNetCost, 2),
                'net_profit' => round($monthProfit, 2),
                'items_sold_count' => $monthItemsSold,
                'transactions_count' => $monthTxCount,
                'returns_count' => $monthReturnsCount,
            ];
        }

        return response()->json([
            'year' => $year,
            'summary' => [
                'total_sales' => round($totalYearlySales, 2),
                'total_refunds' => round($totalYearlyRefunds, 2),
                'total_cost' => round($totalYearlyCost, 2),
                'total_profit' => round($totalYearlyProfit, 2),
                'total_items_sold' => $totalYearlyItemsSold,
                'total_transactions' => $totalYearlyTransactions,
            ],
            'monthly' => $monthlyData,
            'currency' => 'MAD',
        ]);
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

        // Daily product returns and refunds
        $returnsToday = \App\Models\ProductReturn::with(['items.product'])
            ->whereDate('created_at', $targetDate)
            ->get();

        $totalRefundsToday = (float) $returnsToday->sum('refund_amount');
        $returnsCountToday = $returnsToday->count();

        // Calculate returned cost for restocked products
        $restockedReturnedCost = 0.0;
        foreach ($returnsToday as $ret) {
            foreach ($ret->items as $retItem) {
                if ($retItem->restocked) {
                    $c = $retItem->product ? (float) $retItem->product->cost_price : 0.0;
                    $restockedReturnedCost += ($retItem->quantity * $c);
                }
            }
        }

        // Total cost of goods sold on target date
        $rawCostOfGoodsSold = collect($productsSold)->sum('total_cost');
        $netCostOfGoodsSold = max(0, $rawCostOfGoodsSold - $restockedReturnedCost);
        $netSalesRevenue = $totalSalesRevenue - $totalRefundsToday;
        $netProfit = $netSalesRevenue - $netCostOfGoodsSold;

        return [
            'date' => $targetDate->toDateString(),
            'transactions_count' => $transactionsCount,
            'returns_count' => $returnsCountToday,
            'products_sold_count' => $soldQuantity,
            'distinct_products_count' => count($productsSold),
            'gross_sales_revenue' => round($totalSalesRevenue, 2),
            'total_refunds_today' => round($totalRefundsToday, 2),
            'total_sales_revenue' => round($netSalesRevenue, 2),
            'total_cost_of_goods_sold' => round($netCostOfGoodsSold, 2),
            'net_profit_today' => round($netProfit, 2),
            'currency' => 'MAD',
            'products_sold' => $productsSold,
            'returns_summary' => $returnsToday->map(fn ($r) => [
                'id' => $r->id,
                'transaction_id' => $r->transaction_id,
                'refund_amount' => (float) $r->refund_amount,
                'reason' => $r->reason,
                'time' => Carbon::parse($r->created_at)->format('H:i'),
            ])->values()->all(),
        ];
    }
}
