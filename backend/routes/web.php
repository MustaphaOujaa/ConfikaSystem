<?php

use Illuminate\Support\Facades\Route;
use App\Models\Transaction;
use App\Http\Controllers\ReportController;

Route::get('/', function () {
    return view('welcome');
});

// Printable Blade Receipt
Route::get('/receipts/{transaction}', function (Transaction $transaction) {
    return view('receipt', ['transaction' => $transaction->load('items.product')]);
})->name('receipt.show');

// Printable Blade Daily Report
Route::get('/reports/daily/print', [ReportController::class, 'dailyBlade'])->name('reports.daily.blade');
