<?php

namespace App\Http\Controllers;

use App\Models\ReparationInventoryPart;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReparationInventoryPartController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $isAdmin = (bool) $request->user()?->isAdmin();
        $query = ReparationInventoryPart::query();

        // Search query
        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('brand', 'like', "%{$search}%")
                  ->orWhere('compatible_model', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }

        // Brand filter
        if ($request->filled('brand') && $request->query('brand') !== 'all') {
            $query->where('brand', $request->query('brand'));
        }

        // Low stock filter
        if ($request->boolean('low_stock')) {
            $query->whereColumn('quantity', '<=', 'min_stock_alert');
        }

        // Return all or paginated
        if ($request->boolean('all')) {
            $parts = $query->orderBy('name', 'asc')->get();
            return response()->json($parts);
        }

        $perPage = (int) $request->query('per_page', 15);
        $paginated = $query->latest()->paginate($perPage);

        // Stats summary
        $totalItemsCount = ReparationInventoryPart::count();
        $totalUnits = (int) ReparationInventoryPart::sum('quantity');
        $lowStockCount = ReparationInventoryPart::whereColumn('quantity', '<=', 'min_stock_alert')->count();
        
        $stats = [
            'total_references' => $totalItemsCount,
            'total_units' => $totalUnits,
            'low_stock_count' => $lowStockCount,
        ];

        if ($isAdmin) {
            $totalInventoryValue = (float) ReparationInventoryPart::selectRaw('SUM(quantity * cost_price) as total_val')->value('total_val');
            $stats['total_inventory_value'] = round($totalInventoryValue, 2);
        }

        return response()->json([
            'paginated' => $paginated,
            'stats' => $stats,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:100',
            'compatible_model' => 'nullable|string|max:150',
            'quantity' => 'required|integer|min:0',
            'cost_price' => 'required|numeric|min:0',
            'min_stock_alert' => 'nullable|integer|min:0',
            'location' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $part = ReparationInventoryPart::create($validated);

        return response()->json([
            'message' => 'Pièce ajoutée au stock avec succès.',
            'data' => $part,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $part = ReparationInventoryPart::findOrFail($id);
        return response()->json($part);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $part = ReparationInventoryPart::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'brand' => 'nullable|string|max:100',
            'compatible_model' => 'nullable|string|max:150',
            'quantity' => 'sometimes|required|integer|min:0',
            'cost_price' => 'sometimes|required|numeric|min:0',
            'min_stock_alert' => 'nullable|integer|min:0',
            'location' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $part->update($validated);

        return response()->json([
            'message' => 'Pièce mise à jour.',
            'data' => $part,
        ]);
    }

    public function adjustStock(Request $request, int $id): JsonResponse
    {
        $part = ReparationInventoryPart::findOrFail($id);

        $validated = $request->validate([
            'type' => 'required|in:add,subtract,set',
            'amount' => 'required|integer|min:0',
        ]);

        $amount = (int) $validated['amount'];

        if ($validated['type'] === 'add') {
            $part->increment('quantity', $amount);
        } elseif ($validated['type'] === 'subtract') {
            $part->quantity = max(0, $part->quantity - $amount);
            $part->save();
        } else {
            $part->quantity = $amount;
            $part->save();
        }

        return response()->json([
            'message' => 'Stock ajusté.',
            'data' => $part,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['message' => 'Action réservée à l\'administrateur.'], 403);
        }

        $part = ReparationInventoryPart::findOrFail($id);
        $part->delete();

        return response()->json(['message' => 'Pièce supprimée du stock.']);
    }
}
