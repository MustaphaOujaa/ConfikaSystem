<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ExpenseController extends Controller
{
    /**
     * Display a listing of expenses (accessible by all authenticated roles).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Expense::with(['user:id,name,role']);

        // Filter by specific day (YYYY-MM-DD)
        if ($request->filled('date')) {
            $query->whereDate('expense_date', $request->query('date'));
        }

        // Filter by specific month (YYYY-MM)
        if ($request->filled('month')) {
            try {
                $monthDate = Carbon::parse($request->query('month') . '-01');
                $query->whereYear('expense_date', $monthDate->year)
                      ->whereMonth('expense_date', $monthDate->month);
            } catch (\Exception $e) {
                // Ignore parse error
            }
        }

        // Search in worker name or reason
        if ($request->filled('search')) {
            $s = trim($request->query('search'));
            $query->where(function ($q) use ($s) {
                $q->where('worker_name', 'like', "%{$s}%")
                  ->orWhere('reason', 'like', "%{$s}%");
            });
        }

        // Clone query for computing total of filtered set
        $filteredTotal = (float) (clone $query)->sum('amount');
        $filteredCount = (clone $query)->count();

        // Order by expense date descending, then creation time descending
        $expenses = $query->orderBy('expense_date', 'desc')
                          ->orderBy('created_at', 'desc')
                          ->get();

        // Calculate KPI metrics
        $todayStr = Carbon::today()->toDateString();
        $thisMonth = Carbon::now()->month;
        $thisYear = Carbon::now()->year;

        $todayTotal = (float) Expense::whereDate('expense_date', $todayStr)->sum('amount');
        $monthTotal = (float) Expense::whereYear('expense_date', $thisYear)
                                    ->whereMonth('expense_date', $thisMonth)
                                    ->sum('amount');

        return response()->json([
            'data' => $expenses,
            'stats' => [
                'today_total' => round($todayTotal, 2),
                'month_total' => round($monthTotal, 2),
                'filtered_total' => round($filteredTotal, 2),
                'filtered_count' => $filteredCount,
            ],
            'currency' => 'MAD',
        ]);
    }

    /**
     * Store a newly declared expense / cash charge.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'worker_name' => 'required|string|max:150',
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:1000',
            'expense_date' => 'nullable|date',
        ]);

        $expenseDate = !empty($validated['expense_date']) 
            ? Carbon::parse($validated['expense_date'])->toDateString() 
            : Carbon::today()->toDateString();

        $expense = Expense::create([
            'user_id' => $request->user()?->id,
            'worker_name' => trim($validated['worker_name']),
            'amount' => $validated['amount'],
            'reason' => trim($validated['reason']),
            'expense_date' => $expenseDate,
        ]);

        $expense->load('user:id,name,role');

        return response()->json([
            'message' => 'Sortie de caisse déclarée avec succès.',
            'data' => $expense,
        ], 201);
    }

    /**
     * Display the specified expense.
     */
    public function show(Expense $expense): JsonResponse
    {
        $expense->load('user:id,name,role');
        return response()->json($expense);
    }

    /**
     * Update the specified expense.
     */
    public function update(Request $request, Expense $expense): JsonResponse
    {
        $user = $request->user();
        if (!$user->isAdmin() && $expense->user_id !== $user->id) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $validated = $request->validate([
            'worker_name' => 'required|string|max:150',
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:1000',
            'expense_date' => 'nullable|date',
        ]);

        $expenseDate = !empty($validated['expense_date']) 
            ? Carbon::parse($validated['expense_date'])->toDateString() 
            : $expense->expense_date;

        $expense->update([
            'worker_name' => trim($validated['worker_name']),
            'amount' => $validated['amount'],
            'reason' => trim($validated['reason']),
            'expense_date' => $expenseDate,
        ]);

        $expense->load('user:id,name,role');

        return response()->json([
            'message' => 'Sortie de caisse mise à jour.',
            'data' => $expense,
        ]);
    }

    /**
     * Remove the specified expense.
     */
    public function destroy(Request $request, Expense $expense): JsonResponse
    {
        $user = $request->user();
        if (!$user->isAdmin() && $expense->user_id !== $user->id) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $expense->delete();

        return response()->json([
            'message' => 'Sortie de caisse supprimée avec succès.',
        ]);
    }
}
