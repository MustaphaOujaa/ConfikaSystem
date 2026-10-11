<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\ProductReturn;
use App\Models\Reparation;
use App\Models\Expense;
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

        // If 'month' parameter is provided (e.g. 2026-10), return detailed monthly report
        if ($request->filled('month')) {
            $data = $this->getMonthlyDetailData($request->query('month'));
            return response()->json($data);
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

        $totalYearlyExpenses = 0.0;

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

        // Fetch all expenses for the year
        $expenses = Expense::where(function ($q) use ($year) {
                $q->whereYear('expense_date', $year)
                  ->orWhere(function ($sub) use ($year) {
                      $sub->whereNull('expense_date')
                          ->whereYear('created_at', $year);
                  });
            })
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

            $monthExpenses = (float) $expenses->filter(function ($exp) use ($m) {
                $refDate = $exp->expense_date ?: $exp->created_at;
                return Carbon::parse($refDate)->month === $m;
            })->sum('amount');

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
            $monthCombinedGrossProfit = $monthSalesProfit + $monthRepProfit;
            $monthNetProfit = $monthCombinedGrossProfit - $monthExpenses;

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

            $totalYearlyExpenses += $monthExpenses;

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
                // Expenses
                'expenses' => round($monthExpenses, 2),
                'gross_profit' => round($monthCombinedGrossProfit, 2),
                // Combined & legacy keys for compatibility
                'total_sold' => round($monthNetRevenue, 2),
                'total_cost' => round($monthNetCost + $monthRepCost, 2),
                'total_combined_revenue' => round($monthCombinedRevenue, 2),
                'net_profit' => round($monthNetProfit, 2), // True net profit after expenses
            ];
        }

        $totalYearlyGrossProfit = $totalYearlyProfit + $totalYearlyRepProfit;
        $totalYearlyFinalNetProfit = $totalYearlyGrossProfit - $totalYearlyExpenses;

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
                // Expenses yearly summary
                'total_expenses' => round($totalYearlyExpenses, 2),
                'total_gross_profit' => round($totalYearlyGrossProfit, 2),
                // Grand total combined figures
                'total_combined_revenue' => round($totalYearlySales + $totalYearlyRepRevenue, 2),
                'total_profit' => round($totalYearlyFinalNetProfit, 2),
            ],
            'monthly' => $monthlyData,
            'currency' => 'MAD',
        ]);
    }

    public function monthlyDetail(Request $request): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json([
                'message' => 'Accès refusé. Les rapports mensuels financiers sont réservés aux administrateurs.'
            ], 403);
        }

        $monthParam = $request->query('month');
        $data = $this->getMonthlyDetailData($monthParam);
        return response()->json($data);
    }

    public function dailyBlade(Request $request): View
    {
        $dateParam = $request->query('date');
        $data = $this->getDailyData($dateParam);
        return view('daily_report', $data);
    }

    public function monthlyBlade(Request $request): View
    {
        $monthParam = $request->query('month');
        $data = $this->getMonthlyDetailData($monthParam);
        return view('monthly_report', $data);
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

        // 4. Expenses (charges / sorties de caisse) for target date
        $expensesToday = Expense::where(function ($q) use ($targetDateStr) {
                $q->whereDate('expense_date', $targetDateStr)
                  ->orWhere(function ($sub) use ($targetDateStr) {
                      $sub->whereNull('expense_date')
                          ->whereDate('created_at', $targetDateStr);
                  });
            })
            ->with('user:id,name,role')
            ->orderBy('created_at', 'desc')
            ->get();

        $totalExpensesToday = (float) $expensesToday->sum('amount');
        $expensesCountToday = $expensesToday->count();

        // Grand totals & Explicit 4 metrics:
        // 1) Sold: CA Total Global (sales + reparations)
        $howMuchSold = $netSalesRevenue + $reparationsRevenueToday;
        // 2) Earned: Marge Brute / Gain d'activité (sales profit + reparations gain)
        $howMuchEarned = $netSalesProfit + $reparationsProfitToday;
        // 3) Spent: Total charges / sorties de caisse
        $howMuchSpent = $totalExpensesToday;
        // 4) Gained in the end of the day: Bénéfice net réel final (Earned - Spent)
        $howMuchGained = $howMuchEarned - $howMuchSpent;

        return [
            'date' => $targetDate->toDateString(),
            'formatted_date' => $targetDate->translatedFormat('d F Y'),
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
            // Expenses / Sorties de caisse
            'total_expenses_today' => round($totalExpensesToday, 2),
            'total_expenses' => round($totalExpensesToday, 2),
            'expenses_count_today' => $expensesCountToday,
            'expenses_count' => $expensesCountToday,
            // The 4 Distinct Clear Metrics
            'metrics_summary' => [
                'how_much_sold' => round($howMuchSold, 2),
                'how_much_earned' => round($howMuchEarned, 2),
                'how_much_spent' => round($howMuchSpent, 2),
                'how_much_gained' => round($howMuchGained, 2),
            ],
            'how_much_sold' => round($howMuchSold, 2),
            'how_much_earned' => round($howMuchEarned, 2),
            'how_much_spent' => round($howMuchSpent, 2),
            'how_much_gained' => round($howMuchGained, 2),
            // Consolidated Totals
            'grand_total_revenue' => round($howMuchSold, 2),
            'grand_total_gross_profit' => round($howMuchEarned, 2),
            'grand_total_profit' => round($howMuchGained, 2),
            'net_profit_today' => round($howMuchGained, 2), // net profit after expenses
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
            // Expenses separate breakdown:
            'expenses' => [
                'count' => $expensesCountToday,
                'total' => round($totalExpensesToday, 2),
                'items' => $expensesToday->map(fn ($e) => [
                    'id' => $e->id,
                    'worker_name' => $e->worker_name,
                    'amount' => (float) $e->amount,
                    'reason' => $e->reason,
                    'time' => Carbon::parse($e->created_at)->format('H:i'),
                    'user_name' => $e->user?->name ?? 'Système',
                    'date' => $e->expense_date ? Carbon::parse($e->expense_date)->toDateString() : Carbon::parse($e->created_at)->toDateString(),
                ])->values()->all(),
            ],
            'combined_summary' => [
                'sales_revenue' => round($netSalesRevenue, 2),
                'sales_profit' => round($netSalesProfit, 2),
                'reparations_revenue' => round($reparationsRevenueToday, 2),
                'reparations_profit' => round($reparationsProfitToday, 2),
                'total_gross_profit' => round($howMuchEarned, 2),
                'total_expenses' => round($howMuchSpent, 2),
                'grand_total_revenue' => round($howMuchSold, 2),
                'grand_total_profit' => round($howMuchGained, 2),
            ],
        ];
    }

    private function getMonthlyDetailData(?string $monthParam = null): array
    {
        try {
            if ($monthParam) {
                // If format YYYY-MM
                if (preg_match('/^\d{4}-\d{2}$/', $monthParam)) {
                    $targetMonth = Carbon::parse($monthParam . '-01')->startOfDay();
                } else {
                    $targetMonth = Carbon::parse($monthParam)->startOfMonth()->startOfDay();
                }
            } else {
                $targetMonth = Carbon::today()->startOfMonth()->startOfDay();
            }
        } catch (\Exception $e) {
            $targetMonth = Carbon::today()->startOfMonth()->startOfDay();
        }

        $startDate = $targetMonth->copy()->startOfMonth()->startOfDay();
        $endDate = $targetMonth->copy()->endOfMonth()->endOfDay();
        $year = $targetMonth->year;
        $monthNum = $targetMonth->month;
        $daysInMonth = $targetMonth->daysInMonth;

        $monthNamesFr = [
            1 => 'Janvier', 2 => 'Février', 3 => 'Mars', 4 => 'Avril',
            5 => 'Mai', 6 => 'Juin', 7 => 'Juillet', 8 => 'Août',
            9 => 'Septembre', 10 => 'Octobre', 11 => 'Novembre', 12 => 'Décembre'
        ];
        $monthLabel = $monthNamesFr[$monthNum] . ' ' . $year;

        // 1. All sales transactions for the month
        $sales = Transaction::where('type', 'sale')
            ->whereBetween('transaction_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->with(['items.product.category', 'items.product.brand'])
            ->get();

        $grossSalesRevenue = (float) $sales->sum('total_amount');
        $transactionsCount = $sales->count();

        // Detailed Products Sold grouping
        $saleItems = TransactionItem::whereHas('transaction', function ($query) use ($startDate, $endDate) {
            $query->where('type', 'sale')
                  ->whereBetween('transaction_date', [$startDate->toDateString(), $endDate->toDateString()]);
        })->with(['product.category', 'product.brand'])->get();

        $soldQuantity = $saleItems->sum('quantity');

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

        // 2. Returns for the month
        $returns = ProductReturn::whereBetween('created_at', [$startDate, $endDate])
            ->with(['items.product', 'user:id,name'])
            ->orderBy('created_at', 'desc')
            ->get();

        $totalRefunds = (float) $returns->sum('refund_amount');
        $returnsCount = $returns->count();

        $restockedReturnedCost = 0.0;
        foreach ($returns as $ret) {
            foreach ($ret->items as $retItem) {
                if ($retItem->restocked) {
                    $c = $retItem->product ? (float) $retItem->product->cost_price : 0.0;
                    $restockedReturnedCost += ($retItem->quantity * $c);
                }
            }
        }

        $rawCostOfGoodsSold = collect($productsSold)->sum('total_cost');
        $netCostOfGoodsSold = max(0, $rawCostOfGoodsSold - $restockedReturnedCost);
        $netSalesRevenue = $grossSalesRevenue - $totalRefunds;
        $netSalesProfit = $netSalesRevenue - $netCostOfGoodsSold;

        // 3. Reparations for the month
        $reparations = Reparation::where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('date_retrait', [$startDate->toDateString(), $endDate->toDateString()])
                  ->orWhere(function ($sub) use ($startDate, $endDate) {
                      $sub->whereNull('date_retrait')
                          ->whereBetween('date_depot', [$startDate->toDateString(), $endDate->toDateString()]);
                  });
            })
            ->where('status', '!=', 'annule')
            ->with('parts')
            ->orderBy('created_at', 'desc')
            ->get();

        $reparationsRevenue = (float) $reparations->sum('total_price');
        $reparationsCost = (float) $reparations->sum('cout_pieces');
        $reparationsProfit = (float) $reparations->sum('gain');
        $reparationsCount = $reparations->count();

        // 4. Expenses for the month
        $expenses = Expense::where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('expense_date', [$startDate->toDateString(), $endDate->toDateString()])
                  ->orWhere(function ($sub) use ($startDate, $endDate) {
                      $sub->whereNull('expense_date')
                          ->whereBetween('created_at', [$startDate, $endDate]);
                  });
            })
            ->with('user:id,name,role')
            ->orderBy('expense_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        $totalExpenses = (float) $expenses->sum('amount');
        $expensesCount = $expenses->count();

        // Grand totals & Explicit 4 metrics:
        $howMuchSold = $netSalesRevenue + $reparationsRevenue;
        $howMuchEarned = $netSalesProfit + $reparationsProfit;
        $howMuchSpent = $totalExpenses;
        $howMuchGained = $howMuchEarned - $howMuchSpent;

        // 5. Day-by-Day Breakdown of the month
        $dailyBreakdown = [];
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $dayCarbon = Carbon::create($year, $monthNum, $day);
            $dayDateStr = $dayCarbon->toDateString();

            // Skip future days if looking at current month
            $isFuture = $dayCarbon->isAfter(Carbon::today());

            $daySales = $sales->filter(fn ($tx) => Carbon::parse($tx->transaction_date)->toDateString() === $dayDateStr);
            $dayReturns = $returns->filter(fn ($ret) => Carbon::parse($ret->created_at)->toDateString() === $dayDateStr);
            $dayReparations = $reparations->filter(function ($rep) use ($dayDateStr) {
                $refDate = $rep->date_retrait ?: $rep->date_depot;
                return Carbon::parse($refDate)->toDateString() === $dayDateStr;
            });
            $dayExpenses = $expenses->filter(function ($exp) use ($dayDateStr) {
                $refDate = $exp->expense_date ?: $exp->created_at;
                return Carbon::parse($refDate)->toDateString() === $dayDateStr;
            });

            $dGrossSales = (float) $daySales->sum('total_amount');
            $dRefunds = (float) $dayReturns->sum('refund_amount');
            $dNetSales = $dGrossSales - $dRefunds;

            // Day sales cost
            $dCost = 0.0;
            foreach ($daySales as $tx) {
                foreach ($tx->items as $it) {
                    $c = $it->product ? (float) $it->product->cost_price : 0.0;
                    $dCost += ($it->quantity * $c);
                }
            }
            $dSalesProfit = $dNetSales - $dCost;

            $dRepRevenue = (float) $dayReparations->sum('total_price');
            $dRepCost = (float) $dayReparations->sum('cout_pieces');
            $dRepProfit = (float) $dayReparations->sum('gain');

            $dExpensesTotal = (float) $dayExpenses->sum('amount');

            $dCombinedRevenue = $dNetSales + $dRepRevenue;
            $dGrossProfit = $dSalesProfit + $dRepProfit;
            $dNetProfit = $dGrossProfit - $dExpensesTotal;

            $dailyBreakdown[] = [
                'day' => $day,
                'date' => $dayDateStr,
                'day_name' => $dayCarbon->translatedFormat('D'),
                'is_today' => $dayCarbon->isToday(),
                'is_future' => $isFuture,
                'sales_revenue' => round($dNetSales, 2),
                'sales_profit' => round($dSalesProfit, 2),
                'reparations_revenue' => round($dRepRevenue, 2),
                'reparations_profit' => round($dRepProfit, 2),
                'combined_revenue' => round($dCombinedRevenue, 2),
                'gross_profit' => round($dGrossProfit, 2),
                'expenses' => round($dExpensesTotal, 2),
                'net_profit' => round($dNetProfit, 2),
                'tx_count' => $daySales->count(),
                'rep_count' => $dayReparations->count(),
                'exp_count' => $dayExpenses->count(),
            ];
        }

        return [
            'month' => $targetMonth->format('Y-m'),
            'month_label' => $monthLabel,
            'year' => $year,
            'month_num' => $monthNum,
            'transactions_count' => $transactionsCount,
            'returns_count' => $returnsCount,
            'products_sold_count' => $soldQuantity,
            'distinct_products_count' => count($productsSold),
            'gross_sales_revenue' => round($grossSalesRevenue, 2),
            'total_refunds_month' => round($totalRefunds, 2),
            // Magasin Sales figures (Separated)
            'total_sales_revenue' => round($netSalesRevenue, 2),
            'sales_revenue' => round($netSalesRevenue, 2),
            'total_cost_of_goods_sold' => round($netCostOfGoodsSold, 2),
            'sales_profit_month' => round($netSalesProfit, 2),
            'sales_profit' => round($netSalesProfit, 2),
            // Atelier Reparations figures (Separated)
            'reparations_revenue_month' => round($reparationsRevenue, 2),
            'reparations_revenue' => round($reparationsRevenue, 2),
            'reparations_cost_month' => round($reparationsCost, 2),
            'reparations_profit_month' => round($reparationsProfit, 2),
            'reparations_profit' => round($reparationsProfit, 2),
            'reparations_count_month' => $reparationsCount,
            // Expenses / Sorties de caisse
            'total_expenses_month' => round($totalExpenses, 2),
            'total_expenses' => round($totalExpenses, 2),
            'expenses_count_month' => $expensesCount,
            'expenses_count' => $expensesCount,
            // The 4 Distinct Clear Metrics
            'metrics_summary' => [
                'how_much_sold' => round($howMuchSold, 2),
                'how_much_earned' => round($howMuchEarned, 2),
                'how_much_spent' => round($howMuchSpent, 2),
                'how_much_gained' => round($howMuchGained, 2),
            ],
            'how_much_sold' => round($howMuchSold, 2),
            'how_much_earned' => round($howMuchEarned, 2),
            'how_much_spent' => round($howMuchSpent, 2),
            'how_much_gained' => round($howMuchGained, 2),
            // Consolidated Totals
            'grand_total_revenue' => round($howMuchSold, 2),
            'grand_total_gross_profit' => round($howMuchEarned, 2),
            'grand_total_profit' => round($howMuchGained, 2),
            'net_profit_month' => round($howMuchGained, 2),
            'currency' => 'MAD',
            'products_sold' => $productsSold,
            'daily_breakdown' => $dailyBreakdown,
            'returns_summary' => $returns->map(fn ($r) => [
                'id' => $r->id,
                'transaction_id' => $r->transaction_id,
                'refund_amount' => (float) $r->refund_amount,
                'reason' => $r->reason,
                'date' => Carbon::parse($r->created_at)->format('d/m/Y'),
                'time' => Carbon::parse($r->created_at)->format('H:i'),
            ])->values()->all(),
            // Reparations separate breakdown:
            'reparations' => [
                'count' => $reparationsCount,
                'revenue' => round($reparationsRevenue, 2),
                'cost' => round($reparationsCost, 2),
                'profit' => round($reparationsProfit, 2),
                'items' => $reparations->map(fn ($r) => [
                    'id' => $r->id,
                    'ticket_number' => $r->ticket_number,
                    'client_name' => $r->client_name,
                    'client_phone' => $r->client_phone,
                    'device' => trim(($r->brand ?? '') . ' ' . ($r->model ?? '')),
                    'status' => $r->status,
                    'total_price' => (float) $r->total_price,
                    'cout_pieces' => (float) $r->cout_pieces,
                    'gain' => (float) $r->gain,
                    'date' => Carbon::parse($r->date_retrait ?: $r->date_depot)->format('d/m/Y'),
                ])->values()->all(),
            ],
            // Expenses separate breakdown:
            'expenses' => [
                'count' => $expensesCount,
                'total' => round($totalExpenses, 2),
                'items' => $expenses->map(fn ($e) => [
                    'id' => $e->id,
                    'worker_name' => $e->worker_name,
                    'amount' => (float) $e->amount,
                    'reason' => $e->reason,
                    'time' => Carbon::parse($e->created_at)->format('H:i'),
                    'user_name' => $e->user?->name ?? 'Système',
                    'date' => $e->expense_date ? Carbon::parse($e->expense_date)->format('d/m/Y') : Carbon::parse($e->created_at)->format('d/m/Y'),
                ])->values()->all(),
            ],
            'combined_summary' => [
                'sales_revenue' => round($netSalesRevenue, 2),
                'sales_profit' => round($netSalesProfit, 2),
                'reparations_revenue' => round($reparationsRevenue, 2),
                'reparations_profit' => round($reparationsProfit, 2),
                'total_gross_profit' => round($howMuchEarned, 2),
                'total_expenses' => round($howMuchSpent, 2),
                'grand_total_revenue' => round($howMuchSold, 2),
                'grand_total_profit' => round($howMuchGained, 2),
            ],
        ];
    }
}
