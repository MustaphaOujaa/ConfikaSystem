<?php

namespace App\Http\Controllers;

use App\Mail\OtpMail;
use App\Models\EmailOtp;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Authenticate user with Email (or Name) and Password.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required_without:name', 'string'],
            'name' => ['sometimes', 'string'],
            'password' => ['required', 'string'],
        ]);

        $identifier = $request->input('email') ?? $request->input('name');

        // Look up by email or name
        $user = User::where('email', $identifier)
            ->orWhere('name', $identifier)
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants fournis sont incorrects.'],
            ]);
        }

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('auth-token')->plainTextToken,
        ]);
    }

    /**
     * Send OTP to user email for password reset.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['Aucun compte n\'est associé à cette adresse email.'],
            ]);
        }

        $otp = EmailOtp::generateOtp($request->email, 'forgot_password');

        try {
            Mail::to($request->email)->send(new OtpMail(
                $otp,
                'Réinitialisation de votre mot de passe',
                'Une demande de réinitialisation de mot de passe a été initiée pour votre compte Confika System. Saisissez ce code à usage unique pour continuer :'
            ));
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'message' => 'Impossible d\'envoyer l\'email pour le moment. Veuillez vérifier la configuration de messagerie.',
                'error' => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'message' => 'Un code de vérification à 6 chiffres a été envoyé à votre adresse email.',
        ]);
    }

    /**
     * Verify an entered OTP code.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'string', 'size:6'],
            'type' => ['sometimes', 'string'],
        ]);

        $type = $request->input('type', 'forgot_password');

        if (! EmailOtp::isValid($request->email, $request->otp, $type)) {
            throw ValidationException::withMessages([
                'otp' => ['Le code de vérification est incorrect ou a expiré.'],
            ]);
        }

        return response()->json([
            'valid' => true,
            'message' => 'Code de vérification validé avec succès.',
        ]);
    }

    /**
     * Reset password using valid OTP.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'string', 'size:6'],
            'password' => ['required', 'string', 'min:4', 'confirmed'],
        ]);

        if (! EmailOtp::isValid($request->email, $request->otp, 'forgot_password')) {
            throw ValidationException::withMessages([
                'otp' => ['Le code de vérification est incorrect ou a expiré.'],
            ]);
        }

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['Utilisateur introuvable.'],
            ]);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        // Consume OTP
        EmailOtp::consumeOtp($request->email, $request->otp, 'forgot_password');

        // Revoke existing tokens for security
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
        ]);
    }
}
