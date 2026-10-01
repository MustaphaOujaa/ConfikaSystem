<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = ['type', 'total_amount', 'return_status', 'transaction_date'];

    public function items()
    {
        return $this->hasMany(TransactionItem::class);
    }

    public function returns()
    {
        return $this->hasMany(ProductReturn::class);
    }
}
