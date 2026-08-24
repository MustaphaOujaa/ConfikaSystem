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
        })->with('product')->get();

        $soldQuantity = $saleItems->sum('quantity');

        $totalSalesRevenue = Transaction::where('type', 'sale')
            ->whereDate('transaction_date', $targetDate)
            ->sum('total_amount');

        // Total cost of goods sold on target date for gain calculation
        $totalCostOfGoodsSold = $saleItems->sum(function ($item) {
            $cost = $item->product ? $item->product->cost_price : 0;
            return $item->quantity * $cost;
        });

        $netProfit = $totalSalesRevenue - $totalCostOfGoodsSold;

        return [
            'date' => $targetDate->toDateString(),
            'products_sold_count' => $soldQuantity,
            'total_sales_revenue' => round($totalSalesRevenue, 2),
            'total_cost_of_goods_sold' => round($totalCostOfGoodsSold, 2),
            'net_profit_today' => round($netProfit, 2),
            'currency' => 'MAD',
        ];
    }
}
