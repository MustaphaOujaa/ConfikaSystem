<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReparationPart extends Model
{
    use HasFactory;

    protected $fillable = [
        'reparation_id',
        'product_id',
        'inventory_part_id',
        'name',
        'quantity',
        'cost_price',
        'selling_price',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'cost_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
    ];

    public function reparation()
    {
        return $this->belongsTo(Reparation::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function inventoryPart()
    {
        return $this->belongsTo(ReparationInventoryPart::class, 'inventory_part_id');
    }
}
