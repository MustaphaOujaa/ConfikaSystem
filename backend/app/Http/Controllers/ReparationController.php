<?php

namespace App\Http\Controllers;

use App\Events\ReparationCreated;
use App\Events\ReparationUpdated;
use App\Events\ReparationDeleted;
use App\Models\Reparation;
use App\Models\ReparationPart;
use App\Models\ReparationInventoryPart;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReparationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $isAdmin = (bool) $request->user()?->isAdmin();
        $query = Reparation::with(['parts', 'user:id,name']);

        // Search query
        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'like', "%{$search}%")
                  ->orWhere('client_name', 'like', "%{$search}%")
                  ->orWhere('client_phone', 'like', "%{$search}%")
                  ->orWhere('imei_serial', 'like', "%{$search}%")
                  ->orWhere('brand', 'like', "%{$search}%")
                  ->orWhere('model', 'like', "%{$search}%")
                  ->orWhere('description_panne', 'like', "%{$search}%")
                  ->orWhere('panne_autre', 'like', "%{$search}%")
                  ->orWhere('remarques', 'like', "%{$search}%")
                  ->orWhereHas('parts', function ($pq) use ($search) {
                      $pq->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Status filter
        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        // Date filters
        if ($request->filled('date')) {
            $query->whereDate('date_depot', $request->query('date'));
        }
        if ($request->filled('from_date')) {
            $query->whereDate('date_depot', '>=', $request->query('from_date'));
        }
        if ($request->filled('to_date')) {
            $query->whereDate('date_depot', '<=', $request->query('to_date'));
        }

        $perPage = (int) $request->query('per_page', 15);
        $reparations = $query->latest()->paginate($perPage);

        // Mask costs and profits for non-admin cashiers
        if (! $isAdmin) {
            $reparations->getCollection()->transform(function ($rep) {
                $rep->makeHidden(['cout_pieces', 'gain']);
                if ($rep->relationLoaded('parts')) {
                    $rep->parts->makeHidden(['cost_price']);
                }
                return $rep;
            });
        }

        return response()->json($reparations);
    }

    public function stats(Request $request): JsonResponse
    {
        $isAdmin = (bool) $request->user()?->isAdmin();
        $today = Carbon::today()->toDateString();

        $totalCount = Reparation::count();
        $recuCount = Reparation::where('status', 'recu')->count();
        $enCoursCount = Reparation::where('status', 'en_cours')->count();
        $pretCount = Reparation::where('status', 'pret')->count();
        $livreCount = Reparation::where('status', 'livre')->count();
        $todayDepotCount = Reparation::whereDate('date_depot', $today)->count();
        $todayLivreCount = Reparation::where('status', 'livre')->whereDate('date_retrait', $today)->count();

        $data = [
            'total' => $totalCount,
            'recu' => $recuCount,
            'en_cours' => $enCoursCount,
            'pret' => $pretCount,
            'livre' => $livreCount,
            'today_depots' => $todayDepotCount,
            'today_livres' => $todayLivreCount,
        ];

        if ($isAdmin) {
            $totalRevenue = (float) Reparation::where('status', '!=', 'annule')->sum('total_price');
            $totalCost = (float) Reparation::where('status', '!=', 'annule')->sum('cout_pieces');
            $totalProfit = (float) Reparation::where('status', '!=', 'annule')->sum('gain');
            $unpaidBalance = (float) Reparation::where('status', '!=', 'annule')->where('status', '!=', 'livre')->sum('reste');

            $data['financials'] = [
                'total_revenue' => round($totalRevenue, 2),
                'total_cost' => round($totalCost, 2),
                'total_profit' => round($totalProfit, 2),
                'unpaid_balance' => round($unpaidBalance, 2),
            ];
        }

        return response()->json($data);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_name' => 'required|string|max:255',
            'client_phone' => 'required|string|max:50',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'imei_serial' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:50',
            'panne_batterie' => 'nullable|boolean',
            'panne_chargeur' => 'nullable|boolean',
            'panne_coque' => 'nullable|boolean',
            'panne_sim' => 'nullable|boolean',
            'panne_autre' => 'nullable|string|max:255',
            'etat_ecran_casse' => 'nullable|boolean',
            'etat_ne_sallume_pas' => 'nullable|boolean',
            'etat_fonctionne' => 'nullable|boolean',
            'description_panne' => 'nullable|string',
            'remarques' => 'nullable|string',
            'total_price' => 'required|numeric|min:0',
            'acompte' => 'nullable|numeric|min:0',
            'date_depot' => 'nullable|date',
            'date_prevue' => 'nullable|date',
            'status' => 'nullable|in:recu,en_cours,pret,livre,annule',
            'parts' => 'nullable|array',
            'parts.*.name' => 'required|string|max:255',
            'parts.*.cost_price' => 'nullable|numeric|min:0',
            'parts.*.selling_price' => 'nullable|numeric|min:0',
            'parts.*.quantity' => 'nullable|integer|min:1',
            'parts.*.product_id' => 'nullable|exists:products,id',
            'parts.*.inventory_part_id' => 'nullable|exists:reparation_inventory_parts,id',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $totalPrice = (float) ($validated['total_price'] ?? 0);
            $acompte = (float) ($validated['acompte'] ?? 0);
            $dateDepot = !empty($validated['date_depot']) ? $validated['date_depot'] : Carbon::today()->toDateString();
            $status = $validated['status'] ?? 'recu';

            $reparation = new Reparation();
            $reparation->fill($validated);
            $reparation->date_depot = $dateDepot;
            $reparation->status = $status;
            $reparation->acompte = $acompte;
            $reparation->total_price = $totalPrice;
            $reparation->reste = max(0, $totalPrice - $acompte);
            $reparation->user_id = $request->user()?->id;
            $reparation->ticket_number = Reparation::generateTicketNumber();
            $reparation->save();

            // Parts handling
            $totalCost = 0.0;
            if (!empty($validated['parts']) && is_array($validated['parts'])) {
                foreach ($validated['parts'] as $pData) {
                    $qty = (int) ($pData['quantity'] ?? 1);
                    $costPrice = (float) ($pData['cost_price'] ?? 0);
                    $sellingPrice = (float) ($pData['selling_price'] ?? 0);

                    // If linked to store product, decrement store product stock
                    if (!empty($pData['product_id'])) {
                        $product = Product::find($pData['product_id']);
                        if ($product) {
                            if ($costPrice == 0 && $product->cost_price) {
                                $costPrice = (float) $product->cost_price;
                            }
                            $product->decrement('quantity', $qty);
                        }
                    }

                    // If linked to dedicated workshop spare parts inventory, decrement workshop stock
                    if (!empty($pData['inventory_part_id'])) {
                        $invPart = ReparationInventoryPart::find($pData['inventory_part_id']);
                        if ($invPart) {
                            if ($costPrice == 0 && $invPart->cost_price) {
                                $costPrice = (float) $invPart->cost_price;
                            }
                            $invPart->decrement('quantity', $qty);
                        }
                    }

                    $reparation->parts()->create([
                        'product_id' => $pData['product_id'] ?? null,
                        'inventory_part_id' => $pData['inventory_part_id'] ?? null,
                        'name' => $pData['name'],
                        'quantity' => $qty,
                        'cost_price' => $costPrice,
                        'selling_price' => $sellingPrice,
                    ]);

                    $totalCost += ($costPrice * $qty);
                }
            }

            $reparation->cout_pieces = round($totalCost, 2);
            $reparation->gain = round($totalPrice - $totalCost, 2);
            $reparation->save();

            $reparation->load(['parts', 'user:id,name']);

            if (! $request->user()?->isAdmin()) {
                $reparation->makeHidden(['cout_pieces', 'gain']);
                $reparation->parts->makeHidden(['cost_price']);
            }

            return $reparation;
        });

        // Broadcast to all connected clients AFTER transaction commit
        try {
            event(new ReparationCreated($reparation));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('ReparationCreated broadcast failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Bon de réparation créé avec succès.',
            'data' => $reparation,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $isAdmin = (bool) $request->user()?->isAdmin();
        $reparation = Reparation::with(['parts', 'user:id,name'])->findOrFail($id);

        if (! $isAdmin) {
            $reparation->makeHidden(['cout_pieces', 'gain']);
            $reparation->parts->makeHidden(['cost_price']);
        }

        return response()->json($reparation);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $isAdmin = (bool) $request->user()?->isAdmin();
        $reparation = Reparation::findOrFail($id);

        $validated = $request->validate([
            'client_name' => 'sometimes|required|string|max:255',
            'client_phone' => 'sometimes|required|string|max:50',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'imei_serial' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:50',
            'panne_batterie' => 'nullable|boolean',
            'panne_chargeur' => 'nullable|boolean',
            'panne_coque' => 'nullable|boolean',
            'panne_sim' => 'nullable|boolean',
            'panne_autre' => 'nullable|string|max:255',
            'etat_ecran_casse' => 'nullable|boolean',
            'etat_ne_sallume_pas' => 'nullable|boolean',
            'etat_fonctionne' => 'nullable|boolean',
            'description_panne' => 'nullable|string',
            'remarques' => 'nullable|string',
            'total_price' => 'sometimes|required|numeric|min:0',
            'acompte' => 'nullable|numeric|min:0',
            'reste' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:recu,en_cours,pret,livre,annule',
            'date_depot' => 'nullable|date',
            'date_prevue' => 'nullable|date',
            'date_retrait' => 'nullable|date',
            'parts' => 'nullable|array',
            'parts.*.id' => 'nullable|integer',
            'parts.*.name' => 'required|string|max:255',
            'parts.*.cost_price' => 'nullable|numeric|min:0',
            'parts.*.selling_price' => 'nullable|numeric|min:0',
            'parts.*.quantity' => 'nullable|integer|min:1',
            'parts.*.product_id' => 'nullable|exists:products,id',
            'parts.*.inventory_part_id' => 'nullable|exists:reparation_inventory_parts,id',
        ]);

        return DB::transaction(function () use ($validated, $reparation, $isAdmin, $request) {
            $reparation->fill($validated);

            // Auto-set withdrawal date if status becomes livre and date_retrait was empty
            if (isset($validated['status']) && $validated['status'] === 'livre' && empty($reparation->date_retrait)) {
                $reparation->date_retrait = Carbon::today()->toDateString();
            }

            if (isset($validated['parts'])) {
                // Remove old parts (if product_id was used, restore if needed)
                $reparation->parts()->delete();
                $totalCost = 0.0;
                foreach ($validated['parts'] as $pData) {
                    $qty = (int) ($pData['quantity'] ?? 1);
                    $costPrice = (float) ($pData['cost_price'] ?? 0);
                    $sellingPrice = (float) ($pData['selling_price'] ?? 0);

                    // If inventory_part_id, pull cost price if 0
                    if (!empty($pData['inventory_part_id'])) {
                        $invPart = ReparationInventoryPart::find($pData['inventory_part_id']);
                        if ($invPart && $costPrice == 0 && $invPart->cost_price) {
                            $costPrice = (float) $invPart->cost_price;
                        }
                    }

                    $reparation->parts()->create([
                        'product_id' => $pData['product_id'] ?? null,
                        'inventory_part_id' => $pData['inventory_part_id'] ?? null,
                        'name' => $pData['name'],
                        'quantity' => $qty,
                        'cost_price' => $costPrice,
                        'selling_price' => $sellingPrice,
                    ]);

                    $totalCost += ($costPrice * $qty);
                }
                $reparation->cout_pieces = round($totalCost, 2);
            }

            $totalPrice = (float) $reparation->total_price;
            $acompte = (float) $reparation->acompte;
            $reparation->reste = max(0, round($totalPrice - $acompte, 2));
            $reparation->gain = round($totalPrice - (float) $reparation->cout_pieces, 2);
            $reparation->save();

            $reparation->load(['parts', 'user:id,name']);

            if (! $isAdmin) {
                $reparation->makeHidden(['cout_pieces', 'gain']);
                $reparation->parts->makeHidden(['cost_price']);
            }

            return $reparation;
        });

        // Broadcast to all connected clients AFTER transaction commit
        try {
            event(new ReparationUpdated($reparation));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('ReparationUpdated broadcast failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Réparation mise à jour avec succès.',
            'data' => $reparation,
        ]);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $reparation = Reparation::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:recu,en_cours,pret,livre,annule',
            'date_retrait' => 'nullable|date',
            'mark_as_paid' => 'nullable|boolean', // if true when marking as livre, set reste = 0, acompte = total_price
        ]);

        $reparation->status = $validated['status'];

        if ($validated['status'] === 'livre') {
            $reparation->date_retrait = $validated['date_retrait'] ?? Carbon::today()->toDateString();
            if (!empty($validated['mark_as_paid'])) {
                $reparation->acompte = $reparation->total_price;
                $reparation->reste = 0;
            }
        }

        $reparation->save();

        // Broadcast status change
        try {
            event(new ReparationUpdated($reparation->load(['parts', 'user:id,name'])));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('ReparationUpdated broadcast failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Statut mis à jour.',
            'data' => $reparation,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['message' => 'Seul l\'administrateur peut supprimer un bon de réparation.'], 403);
        }

        $reparation = Reparation::findOrFail($id);
        $reparationId = $reparation->id;
        $reparation->delete();

        // Broadcast deletion
        try {
            event(new ReparationDeleted($reparationId));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('ReparationDeleted broadcast failed: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Bon de réparation supprimé.']);
    }
}
