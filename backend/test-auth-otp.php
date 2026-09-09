<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\EmailOtp;
use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

$email = $argv[1] ?? 'confikam@gmail.com';

echo "Testing OTP flow for: {$email}\n";

$authController = new AuthController();
$forgotRequest = Request::create('/api/forgot-password', 'POST', [
    'email' => $email,
]);

$response = $authController->forgotPassword($forgotRequest);
echo "Status: " . $response->getStatusCode() . "\n";
echo "Response: " . $response->getContent() . "\n";

$otp = EmailOtp::where('email', $email)->where('type', 'forgot_password')->latest()->first();
if ($otp) {
    echo "Generated OTP in DB: " . $otp->otp . "\n";
}
