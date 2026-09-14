<?php

namespace Database\Factories;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductStock;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $costPrice = fake()->randomFloat(2, 5, 250);
        $profitMargin = fake()->randomFloat(2, 1.25, 1.75);
        $price = round($costPrice * $profitMargin, 2);
        $quantity = fake()->numberBetween(10, 150);

        return [
            'category_id' => Category::inRandomOrder()->value('id') ?? Category::factory(),
            'brand_id' => Brand::inRandomOrder()->value('id'),
            'name' => fake()->unique()->catchPhrase(),
            'barcode' => fake()->unique()->ean13(),
            'description' => fake()->optional(0.7)->sentence(10),
            'cost_price' => $costPrice,
            'price' => $price,
            'quantity' => $quantity,
        ];
    }

    /**
     * Configure the model factory.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (Product $product) {
            ProductStock::create([
                'product_id' => $product->id,
                'batch_number' => 'LOT-' . strtoupper(Str::random(6)),
                'cost_price' => $product->cost_price ?? 0,
                'price' => $product->price,
                'quantity' => $product->quantity,
            ]);
        });
    }
}
