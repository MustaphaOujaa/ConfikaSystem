<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\TransactionController;

// Low-stock notifications endpoint
Route::get('/products/low-stock', [ProductController::class, 'lowStockAlerts']);

// Products resource routes
Route::apiResource('products', ProductController::class);

// Categories resource routes
Route::apiResource('categories', CategoryController::class)->only(['index', 'store']);

// Brands resource routes
Route::apiResource('brands', BrandController::class)->only(['index', 'store']);

// Transactions routes (sales and purchases)
Route::apiResource('transactions', TransactionController::class)->only(['index', 'store']);
