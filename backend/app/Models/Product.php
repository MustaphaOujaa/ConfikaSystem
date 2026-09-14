<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['category_id', 'brand_id', 'name', 'barcode', 'description', 'cost_price', 'price', 'quantity'])]
class Product extends Model
{
    use HasFactory;

    public const LOW_STOCK_THRESHOLD = 10;

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class);
    }

    public function stocks(): HasMany
    {
        return $this->hasMany(ProductStock::class)->orderBy('id', 'asc');
    }

    public function activeStocks(): HasMany
    {
        return $this->hasMany(ProductStock::class)->where('quantity', '>', 0)->orderBy('id', 'asc');
    }

    /**
     * Recalculates total product quantity and latest prices from stocks.
     */
    public function syncStockTotals(): void
    {
        $this->quantity = (int) $this->stocks()->sum('quantity');
        
        // Update product current selling price and cost to the latest active stock if present
        $latestStock = $this->stocks()->latest()->first();
        if ($latestStock) {
            $this->price = $latestStock->price;
            $this->cost_price = $latestStock->cost_price;
        }

        $this->saveQuietly();
    }

    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'price' => 'decimal:2',
            'quantity' => 'integer',
        ];
    }
}
