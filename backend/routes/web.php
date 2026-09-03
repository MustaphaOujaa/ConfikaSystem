<?php

use Illuminate\Support\Facades\Route;
use App\Models\Transaction;
use App\Http\Controllers\ReportController;

Route::get('/receipts/{transaction}', function (Transaction $transaction) {
    return view('receipt', ['transaction' => $transaction->load('items.product')]);
})->name('receipt.show');

Route::get('/reports/daily/print', [ReportController::class, 'dailyBlade'])->name('reports.daily.blade');

Route::fallback(function () {
    return response()->file(public_path('index.html'));
});
