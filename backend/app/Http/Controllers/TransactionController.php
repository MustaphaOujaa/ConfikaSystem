<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Services\TransactionService;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function __construct(private readonly TransactionService $transactionService)
    {
    }

    public function index()
    {
        return response()->json(Transaction::with('items.product')->latest()->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:sale,purchase',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
        ]);

        return response()->json($this->transactionService->create($validated), 201);
    }
}
