<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\ProductReturn;
use App\Models\Reparation;
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
        $totalYearlyRefunds = 0.0;

        $totalYearlyRepRevenue = 0.0;
        $totalYearlyRepCost = 0.0;
        $totalYearlyRepProfit = 0.0;
        $totalYearlyRepCount = 0;

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
        $returns = ProductReturn::whereYear('created_at', $year)
            ->with(['items.product'])
            ->get();

        // Fetch all non-cancelled reparations for the year
        $reparations = Reparation::where(function ($q) use ($year) {
                $q->whereYear('date_depot', $year)
                  ->orWhereYear('date_retrait', $year);
            })
            ->where('status', '!=', 'annule')
            ->get();

        for ($m = 1; $m <= 12; $m++) {
            $monthSales = $sales->filter(function ($tx) use ($m) {
                return Carbon::parse($tx->transaction_date)->month === $m;
            });

            $monthReturns = $returns->filter(function ($ret) use ($m) {
                return Carbon::parse($ret->created_at)->month === $m;
            });

            $monthReparations = $reparations->filter(function ($rep) use ($m) {
                $refDate = $rep->date_retrait ?: $rep->date_depot;
                return Carbon::parse($refDate)->month === $m;
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
            $monthSalesProfit = $monthNetRevenue - $monthNetCost;

            // Reparation figures
            $monthRepRevenue = (float) $monthReparations->sum('total_price');
            $monthRepCost = (float) $monthReparations->sum('cout_pieces');
            $monthRepProfit = (float) $monthReparations->sum('gain');
            $monthRepCount = $monthReparations->count();

            // Combined figures
            $monthCombinedRevenue = $monthNetRevenue + $monthRepRevenue;
            $monthCombinedProfit = $monthSalesProfit + $monthRepProfit;

            $totalYearlySales += $monthNetRevenue;
            $totalYearlyCost += $monthNetCost;
            $totalYearlyProfit += $monthSalesProfit;
            $totalYearlyItemsSold += $monthItemsSold;
            $totalYearlyTransactions += $monthTxCount;
            $totalYearlyRefunds += $monthRefunds;

            $totalYearlyRepRevenue += $monthRepRevenue;
            $totalYearlyRepCost += $monthRepCost;
            $totalYearlyRepProfit += $monthRepProfit;
            $totalYearlyRepCount += $monthRepCount;

            $monthlyData[] = [
                'month_num' => $m,
                'month_name' => $monthNames[$m],
                'month_label' => $monthNames[$m] . ' ' . $year,
                // POS sales breakdown
                'sales_revenue' => round($monthNetRevenue, 2),
                'gross_sold' => round($monthGrossRevenue, 2),
                'refunds' => round($monthRefunds, 2),
                'sales_cost' => round($monthNetCost, 2),
                'sales_profit' => round($monthSalesProfit, 2),
                'items_sold_count' => $monthItemsSold,
                'transactions_count' => $monthTxCount,
                'returns_count' => $monthReturnsCount,
                // Reparations breakdown
                'reparations_revenue' => round($monthRepRevenue, 2),
                'reparations_cost' => round($monthRepCost, 2),
                'reparations_profit' => round($monthRepProfit, 2),
                'reparations_count' => $monthRepCount,
                // Combined & legacy keys for compatibility
                'total_sold' => round($monthNetRevenue, 2),
                'total_cost' => round($monthNetCost + $monthRepCost, 2),
                'total_combined_revenue' => round($monthCombinedRevenue, 2),
                'net_profit' => round($monthCombinedProfit, 2), // combined profit
            ];
        }

        $totalYearlyCombinedProfit = $totalYearlyProfit + $totalYearlyRepProfit;

        return response()->json([
            'year' => $year,
            'summary' => [
                'total_sales' => round($totalYearlySales, 2),
                'total_refunds' => round($totalYearlyRefunds, 2),
                'total_cost' => round($totalYearlyCost, 2),
                'total_sales_profit' => round($totalYearlyProfit, 2),
                'total_items_sold' => $totalYearlyItemsSold,
                'total_transactions' => $totalYearlyTransactions,
                // Reparations yearly summary
                'total_reparations_revenue' => round($totalYearlyRepRevenue, 2),
                'total_reparations_cost' => round($totalYearlyRepCost, 2),
                'total_reparations_profit' => round($totalYearlyRepProfit, 2),
                'total_reparations_count' => $totalYearlyRepCount,
                // Grand total combined figures
                'total_combined_revenue' => round($totalYearlySales + $totalYearlyRepRevenue, 2),
                'total_profit' => round($totalYearlyCombinedProfit, 2),
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

        $targetDateStr = $targetDate->toDateString();

        // 1. Total products sold on target date (quantity & revenue)
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

        // 2. Daily product returns and refunds
        $returnsToday = ProductReturn::with(['items.product'])
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
        $netSalesProfit = $netSalesRevenue - $netCostOfGoodsSold;

        // 3. Reparations for target date (separated)
        $reparationsToday = Reparation::where(function ($q) use ($targetDateStr) {
                $q->whereDate('date_retrait', $targetDateStr)
                  ->orWhere(function ($sub) use ($targetDateStr) {
                      $sub->whereNull('date_retrait')
                          ->whereDate('date_depot', $targetDateStr);
                  });
            })
            ->where('status', '!=', 'annule')
            ->with('parts')
            ->get();

        $reparationsRevenueToday = (float) $reparationsToday->sum('total_price');
        $reparationsCostToday = (float) $reparationsToday->sum('cout_pieces');
        $reparationsProfitToday = (float) $reparationsToday->sum('gain');
        $reparationsCountToday = $reparationsToday->count();

        // Grand totals
        $grandTotalRevenue = $netSalesRevenue + $reparationsRevenueToday;
        $grandTotalProfit = $netSalesProfit + $reparationsProfitToday;

        return [
            'date' => $targetDate->toDateString(),
            'transactions_count' => $transactionsCount,
            'returns_count' => $returnsCountToday,
            'products_sold_count' => $soldQuantity,
            'distinct_products_count' => count($productsSold),
            'gross_sales_revenue' => round($totalSalesRevenue, 2),
            'total_refunds_today' => round($totalRefundsToday, 2),
            // Magasin Sales figures (Separated)
            'total_sales_revenue' => round($netSalesRevenue, 2),
            'sales_revenue' => round($netSalesRevenue, 2),
            'total_cost_of_goods_sold' => round($netCostOfGoodsSold, 2),
            'sales_profit_today' => round($netSalesProfit, 2),
            'sales_profit' => round($netSalesProfit, 2),
            // Atelier Reparations figures (Separated)
            'reparations_revenue_today' => round($reparationsRevenueToday, 2),
            'reparations_revenue' => round($reparationsRevenueToday, 2),
            'reparations_cost_today' => round($reparationsCostToday, 2),
            'reparations_profit_today' => round($reparationsProfitToday, 2),
            'reparations_profit' => round($reparationsProfitToday, 2),
            'reparations_count_today' => $reparationsCountToday,
            // Consolidated Totals
            'grand_total_revenue' => round($grandTotalRevenue, 2),
            'grand_total_profit' => round($grandTotalProfit, 2),
            'net_profit_today' => round($grandTotalProfit, 2), // combined profit for compatibility
            'currency' => 'MAD',
            'products_sold' => $productsSold,
            'returns_summary' => $returnsToday->map(fn ($r) => [
                'id' => $r->id,
                'transaction_id' => $r->transaction_id,
                'refund_amount' => (float) $r->refund_amount,
                'reason' => $r->reason,
                'time' => Carbon::parse($r->created_at)->format('H:i'),
            ])->values()->all(),
            // Reparations separate breakdown:
            'reparations' => [
                'count' => $reparationsCountToday,
                'revenue' => round($reparationsRevenueToday, 2),
                'cost' => round($reparationsCostToday, 2),
                'profit' => round($reparationsProfitToday, 2),
                'items' => $reparationsToday->map(fn ($r) => [
                    'id' => $r->id,
                    'ticket_number' => $r->ticket_number,
                    'client_name' => $r->client_name,
                    'client_phone' => $r->client_phone,
                    'device' => trim(($r->brand ?? '') . ' ' . ($r->model ?? '')),
                    'status' => $r->status,
                    'total_price' => (float) $r->total_price,
                    'cout_pieces' => (float) $r->cout_pieces,
                    'gain' => (float) $r->gain,
                ])->values()->all(),
            ],
            'combined_summary' => [
                'sales_revenue' => round($netSalesRevenue, 2),
                'sales_profit' => round($netSalesProfit, 2),
                'reparations_revenue' => round($reparationsRevenueToday, 2),
                'reparations_profit' => round($reparationsProfitToday, 2),
                'grand_total_revenue' => round($grandTotalRevenue, 2),
                'grand_total_profit' => round($grandTotalProfit, 2),
            ],
        ];
    }
}
