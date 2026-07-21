<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Brand;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Categories & Subcategories
        $mobileAcc = Category::create(['name' => 'Mobile Accessories', 'slug' => 'mobile-accessories']);
        $electronics = Category::create(['name' => 'Electronics', 'slug' => 'electronics']);

        $covers = Category::create(['name' => 'Covers & Cases', 'slug' => 'covers-cases', 'parent_id' => $mobileAcc->id]);
        $chargers = Category::create(['name' => 'Chargers & Cables', 'slug' => 'chargers-cables', 'parent_id' => $mobileAcc->id]);
        $audio = Category::create(['name' => 'Audio & Earbuds', 'slug' => 'audio-earbuds', 'parent_id' => $electronics->id]);

        // 2. Seed Brands
        $apple = Brand::create(['name' => 'Apple']);
        $samsung = Brand::create(['name' => 'Samsung']);
        $anker = Brand::create(['name' => 'Anker']);
        $sony = Brand::create(['name' => 'Sony']);

        // 3. Seed Products with varying stock levels
        Product::create([
            'name' => 'iPhone 15 Pro Silicone Case - Black',
            'sku' => 'ACC-IP15-SIL-BLK',
            'category_id' => $covers->id,
            'brand_id' => $apple->id,
            'quantity' => 25,
            'purchase_price' => 15.00,
            'selling_price' => 49.00,
            'min_stock_alert' => 5,
            'description' => 'Original Apple silicone case with MagSafe',
        ]);

        Product::create([
            'name' => 'Anker 737 Fast Charger (24W Type-C)',
            'sku' => 'CHG-ANK-737',
            'category_id' => $chargers->id,
            'brand_id' => $anker->id,
            'quantity' => 3, // LOW STOCK
            'purchase_price' => 35.00,
            'selling_price' => 69.99,
            'min_stock_alert' => 5,
            'description' => 'Ultra-fast GaN III USB-C charger',
        ]);

        Product::create([
            'name' => 'Galaxy Buds2 Pro Wireless Earbuds',
            'sku' => 'AUD-SAM-BUDS2',
            'category_id' => $audio->id,
            'brand_id' => $samsung->id,
            'quantity' => 0, // OUT OF STOCK
            'purchase_price' => 110.00,
            'selling_price' => 179.99,
            'min_stock_alert' => 3,
            'description' => 'Active Noise Canceling wireless earbuds',
        ]);

        Product::create([
            'name' => 'Sony WH-1000XM5 Wireless Headphones',
            'sku' => 'AUD-SNY-XM5',
            'category_id' => $audio->id,
            'brand_id' => $sony->id,
            'quantity' => 2, // LOW STOCK
            'purchase_price' => 250.00,
            'selling_price' => 399.99,
            'min_stock_alert' => 4,
            'description' => 'Industry leading noise canceling headphones',
        ]);
    }
}
