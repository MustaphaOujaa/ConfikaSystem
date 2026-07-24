<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductImageController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    // Low-stock notifications endpoint
    Route::get('/products/low-stock', [ProductController::class, 'lowStockAlerts']);

    // Products resource routes
    Route::apiResource('products', ProductController::class);

    // Categories resource routes
    Route::apiResource('categories', CategoryController::class);

    // Brands resource routes
    Route::apiResource('brands', BrandController::class)->only(['index', 'store']);

    // Product image routes
    Route::post('/products/{product}/images', [ProductImageController::class, 'store']);
    Route::match(['put', 'patch'], '/images/{image}', [ProductImageController::class, 'update']);
    Route::delete('/images/{image}', [ProductImageController::class, 'destroy']);

    // Transactions routes (sales and purchases)
    Route::apiResource('transactions', TransactionController::class)->only(['index', 'store']);
});
