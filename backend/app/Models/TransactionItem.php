<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransactionItem extends Model
{
    use HasFactory;

    protected $fillable = ['transaction_id', 'product_id', 'product_stock_id', 'quantity', 'returned_quantity', 'unit_price'];

    protected $appends = ['remaining_quantity'];

    public function getRemainingQuantityAttribute(): int
    {
        return max(0, (int) $this->quantity - (int) ($this->returned_quantity ?? 0));
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function stock()
    {
        return $this->belongsTo(ProductStock::class, 'product_stock_id');
    }

    public function returnItems()
    {
        return $this->hasMany(ReturnItem::class);
    }
}
