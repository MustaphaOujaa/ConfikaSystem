<?php

namespace App\Http\Controllers;

use App\Mail\OtpMail;
use App\Models\EmailOtp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class AdminProfileController extends Controller
{
    /**
     * Request OTP to change admin email.
     * Sent to the NEW email so the admin can verify ownership even if the old email is lost.
     */
    public function requestEmailOtp(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $request->validate([
            'new_email' => ['required', 'email', 'unique:users,email'],
        ]);

        $otp = EmailOtp::generateOtp($request->new_email, 'change_email');

        try {
            Mail::to($request->new_email)->send(new OtpMail(
                $otp,
                'Vérification de nouvelle adresse email administrateur',
                'Vous avez demandé à définir cette adresse comme nouvel email de votre compte administrateur Confika System. Saisissez ce code pour valider le changement :'
            ));
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'message' => 'Impossible d\'envoyer l\'email au nouveau destinataire. Veuillez vérifier l\'adresse saisie.',
                'error' => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'message' => 'Un code OTP a été envoyé à la NOUVELLE adresse email (' . $request->new_email . ').',
        ]);
    }

    /**
     * Update admin email after verifying OTP sent to new_email.
     */
    public function updateEmail(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $request->validate([
            'new_email' => ['required', 'email', 'unique:users,email,' . $user->id],
            'otp' => ['required', 'string', 'size:6'],
        ]);

        if (! EmailOtp::isValid($request->new_email, $request->otp, 'change_email')) {
            throw ValidationException::withMessages([
                'otp' => ['Le code de vérification est incorrect ou a expiré.'],
            ]);
        }

        $user->email = $request->new_email;
        $user->save();

        EmailOtp::consumeOtp($request->new_email, $request->otp, 'change_email');

        return response()->json([
            'message' => 'Votre adresse email administrateur a été modifiée avec succès.',
            'user' => $user->fresh(),
        ]);
    }

    /**
     * Request OTP to change admin password.
     * Sent to current admin email.
     */
    public function requestPasswordOtp(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $otp = EmailOtp::generateOtp($user->email, 'change_password');

        try {
            Mail::to($user->email)->send(new OtpMail(
                $otp,
                'Modification du mot de passe administrateur',
                'Une demande de changement de mot de passe a été initiée depuis votre session administrateur Confika System. Saisissez ce code pour confirmer la modification :'
            ));
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'message' => 'Impossible d\'envoyer l\'email pour le moment.',
                'error' => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'message' => 'Un code OTP a été envoyé à votre adresse email (' . $user->email . ').',
        ]);
    }

    /**
     * Update admin password using verified OTP.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $request->validate([
            'otp' => ['required', 'string', 'size:6'],
            'password' => ['required', 'string', 'min:4', 'confirmed'],
        ]);

        if (! EmailOtp::isValid($user->email, $request->otp, 'change_password')) {
            throw ValidationException::withMessages([
                'otp' => ['Le code de vérification est incorrect ou a expiré.'],
            ]);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        EmailOtp::consumeOtp($user->email, $request->otp, 'change_password');

        return response()->json([
            'message' => 'Mot de passe administrateur modifié avec succès.',
        ]);
    }
}
