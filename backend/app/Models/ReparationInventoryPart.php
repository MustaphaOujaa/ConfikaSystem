<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReparationInventoryPart extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'brand',
        'compatible_model',
        'quantity',
        'cost_price',
        'min_stock_alert',
        'location',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'min_stock_alert' => 'integer',
        'cost_price' => 'decimal:2',
    ];

    public function reparationParts()
    {
        return $this->hasMany(ReparationPart::class, 'inventory_part_id');
    }

    public function isLowStock(): bool
    {
        return $this->quantity <= $this->min_stock_alert;
    }
}
