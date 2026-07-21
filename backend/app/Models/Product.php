<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'sku',
        'category_id',
        'brand_id',
        'quantity',
        'purchase_price',
        'selling_price',
        'min_stock_alert',
        'image_url',
        'description',
    ];

    protected $appends = ['stock_status'];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    public function getStockStatusAttribute()
    {
        if ($this->quantity <= 0) {
            return 'out_of_stock';
        } elseif ($this->quantity <= $this->min_stock_alert) {
            return 'low_stock';
        }
        return 'in_stock';
    }
}
