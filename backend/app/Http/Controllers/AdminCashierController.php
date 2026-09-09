<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminCashierController extends Controller
{
    /**
     * List all cashier accounts.
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $cashiers = User::where('role', 'caissier')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($cashiers);
    }

    /**
     * Create a new cashier account directly without OTP.
     */
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:4'],
        ]);

        $cashier = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'caissier',
        ]);

        return response()->json([
            'message' => 'Compte caissier créé avec succès.',
            'cashier' => $cashier,
        ], 201);
    }

    /**
     * Update cashier login info directly without OTP.
     */
    public function update(Request $request, User $cashier): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        if ($cashier->role !== 'caissier') {
            return response()->json(['message' => 'Seuls les comptes caissiers peuvent être gérés ici.'], 422);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($cashier->id)],
            'password' => ['nullable', 'string', 'min:4'],
        ]);

        $cashier->name = $validated['name'];
        $cashier->email = $validated['email'];

        if (! empty($validated['password'])) {
            $cashier->password = Hash::make($validated['password']);
        }

        $cashier->save();

        return response()->json([
            'message' => 'Informations du caissier mises à jour avec succès.',
            'cashier' => $cashier,
        ]);
    }

    /**
     * Delete a cashier account.
     */
    public function destroy(Request $request, User $cashier): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        if ($cashier->role !== 'caissier') {
            return response()->json(['message' => 'Action non autorisée sur ce type de compte.'], 422);
        }

        $cashier->tokens()->delete();
        $cashier->delete();

        return response()->json([
            'message' => 'Compte caissier supprimé avec succès.',
        ]);
    }
}
