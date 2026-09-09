<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductImageController;
use App\Http\Controllers\ScannerController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\BackupController;
use App\Http\Controllers\AdminProfileController;
use App\Http\Controllers\AdminCashierController;

// Public Authentication & OTP Password Reset routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function () {
    // Admin Cashier Management routes (No OTP, fast CRUD)
    Route::get('/admin/cashiers', [AdminCashierController::class, 'index']);
    Route::post('/admin/cashiers', [AdminCashierController::class, 'store']);
    Route::put('/admin/cashiers/{cashier}', [AdminCashierController::class, 'update']);
    Route::delete('/admin/cashiers/{cashier}', [AdminCashierController::class, 'destroy']);

    // Admin Profile & Security routes (Protected by OTP)
    Route::post('/admin/request-email-otp', [AdminProfileController::class, 'requestEmailOtp']);
    Route::post('/admin/update-email', [AdminProfileController::class, 'updateEmail']);
    Route::post('/admin/request-password-otp', [AdminProfileController::class, 'requestPasswordOtp']);
    Route::post('/admin/update-password', [AdminProfileController::class, 'updatePassword']);
    // Backup route
    Route::post('/backup/google-drive', [BackupController::class, 'backupToGoogleDrive']);

    // Reports endpoint
    Route::get('/reports/daily', [ReportController::class, 'daily']);
    Route::get('/reports/monthly', [ReportController::class, 'monthly']);


    // Low-stock notifications endpoint
    Route::get('/products/low-stock', [ProductController::class, 'lowStockAlerts']);

    // Products resource routes
    Route::apiResource('products', ProductController::class);

    // Categories resource routes
    Route::apiResource('categories', CategoryController::class);

    // Brands resource routes
    Route::apiResource('brands', BrandController::class);

    // Product image routes
    Route::post('/products/{product}/images', [ProductImageController::class, 'store']);
    Route::match(['put', 'patch'], '/images/{image}', [ProductImageController::class, 'update']);
    Route::delete('/images/{image}', [ProductImageController::class, 'destroy']);

    // Transactions routes (sales and purchases)
    Route::apiResource('transactions', TransactionController::class)->only(['index', 'store']);

    // Scanner routes
    Route::get('/scanner/products/{barcode}', [ScannerController::class, 'product']);
    Route::post('/scanner/sales', [ScannerController::class, 'sale']);
});
