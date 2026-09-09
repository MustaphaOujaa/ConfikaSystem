<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class EmailOtp extends Model
{
    protected $fillable = [
        'email',
        'otp',
        'type',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    /**
     * Generate a new 6-digit OTP code for the given email and purpose.
     */
    public static function generateOtp(string $email, string $type): string
    {
        // Invalidate old OTPs for this email and type
        static::where('email', $email)
            ->where('type', $type)
            ->delete();

        $otp = sprintf('%06d', random_int(100000, 999999));

        static::create([
            'email' => $email,
            'otp' => $otp,
            'type' => $type,
            'expires_at' => Carbon::now()->addMinutes(15),
        ]);

        return $otp;
    }

    /**
     * Check whether an OTP is valid and not expired.
     */
    public static function isValid(string $email, string $otp, string $type): bool
    {
        return static::where('email', $email)
            ->where('otp', $otp)
            ->where('type', $type)
            ->where('expires_at', '>=', Carbon::now())
            ->exists();
    }

    /**
     * Consume (verify and delete) an OTP.
     */
    public static function consumeOtp(string $email, string $otp, string $type): bool
    {
        $record = static::where('email', $email)
            ->where('otp', $otp)
            ->where('type', $type)
            ->where('expires_at', '>=', Carbon::now())
            ->first();

        if ($record) {
            $record->delete();
            return true;
        }

        return false;
    }
}

