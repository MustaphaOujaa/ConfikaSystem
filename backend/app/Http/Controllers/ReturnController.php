<?php

namespace App\Http\Controllers;

use App\Models\ProductReturn;
use App\Models\Transaction;
use App\Services\ReturnService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReturnController extends Controller
{
    public function __construct(private readonly ReturnService $returnService)
    {
    }

    /**
     * List product returns with pagination and filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ProductReturn::with([
            'transaction',
            'user:id,name,role',
            'items.product:id,name,barcode',
            'items.stock:id,batch_number',
        ])->latest();

        if ($request->filled('transaction_id')) {
            $query->where('transaction_id', $request->query('transaction_id'));
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->query('date'));
        }

        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('id', $search)
                  ->orWhere('transaction_id', $search)
                  ->orWhere('reason', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('items.product', function ($pq) use ($search) {
                      $pq->where('name', 'like', "%{$search}%")
                         ->orWhere('barcode', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = (int) $request->query('per_page', 15);
        $returns = $query->paginate($perPage);

        return response()->json($returns);
    }

    /**
     * Lookup a sale transaction to prepare a return.
     */
    public function lookupTransaction(int|string $id): JsonResponse
    {
        $transaction = Transaction::with(['items.product', 'items.stock', 'returns.items'])
            ->find($id);

        if (!$transaction) {
            return response()->json(['message' => 'Transaction introuvable.'], 404);
        }

        if ($transaction->type !== 'sale') {
            return response()->json([
                'message' => 'Seules les transactions de vente peuvent faire l\'objet d\'un retour.'
            ], 422);
        }

        return response()->json([
            'transaction' => $transaction,
            'is_fully_returned' => $transaction->return_status === 'full',
            'returnable_items_count' => $transaction->items->filter(fn ($i) => $i->remaining_quantity > 0)->count(),
        ]);
    }

    /**
     * Store and process a new product return.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'transaction_id' => 'required|exists:transactions,id',
            'payment_method' => 'nullable|string|max:50',
            'reason'         => 'nullable|string|max:255',
            'notes'          => 'nullable|string',
            'items'          => 'required|array|min:1',
            'items.*.transaction_item_id' => 'required|exists:transaction_items,id',
            'items.*.quantity'            => 'required|integer|min:1',
            'items.*.refund_price'        => 'nullable|numeric|min:0',
            'items.*.restocked'           => 'nullable|boolean',
        ]);

        $validated['user_id'] = $request->user()?->id;

        $returnRecord = $this->returnService->processReturn($validated);

        return response()->json([
            'message' => 'Retour enregistré et stock mis à jour avec succès.',
            'return'  => $returnRecord,
        ], 201);
    }

    /**
     * Show details of a specific return.
     */
    public function show(int $id): JsonResponse
    {
        $productReturn = ProductReturn::with([
            'transaction.items.product',
            'user:id,name,role',
            'items.product',
            'items.stock',
            'items.transactionItem',
        ])->findOrFail($id);

        return response()->json($productReturn);
    }
}
