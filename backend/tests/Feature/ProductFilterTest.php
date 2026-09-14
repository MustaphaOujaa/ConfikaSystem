<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductFilterTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Category $categoryA;
    private Category $categoryB;
    private Brand $brandX;
    private Brand $brandY;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $this->categoryA = Category::create(['name' => 'Électronique']);
        $this->categoryB = Category::create(['name' => 'Accessoires']);

        $this->brandX = Brand::create(['name' => 'Logitech']);
        $this->brandY = Brand::create(['name' => 'Apple']);
    }

    public function test_can_filter_products_by_category(): void
    {
        Product::create([
            'name' => 'Souris MX Master',
            'category_id' => $this->categoryA->id,
            'brand_id' => $this->brandX->id,
            'price' => 100,
            'quantity' => 10,
        ]);

        Product::create([
            'name' => 'Câble USB',
            'category_id' => $this->categoryB->id,
            'brand_id' => $this->brandX->id,
            'price' => 20,
            'quantity' => 50,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/products?category_id=' . $this->categoryA->id);

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Souris MX Master', $response->json('data.0.name'));
    }

    public function test_can_filter_products_by_brand(): void
    {
        Product::create([
            'name' => 'Souris MX Master',
            'category_id' => $this->categoryA->id,
            'brand_id' => $this->brandX->id,
            'price' => 100,
            'quantity' => 10,
        ]);

        Product::create([
            'name' => 'Magic Mouse',
            'category_id' => $this->categoryA->id,
            'brand_id' => $this->brandY->id,
            'price' => 90,
            'quantity' => 5,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/products?brand_id=' . $this->brandY->id);

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Magic Mouse', $response->json('data.0.name'));
    }

    public function test_can_filter_products_by_category_and_brand_together(): void
    {
        Product::create([
            'name' => 'Souris MX Master',
            'category_id' => $this->categoryA->id,
            'brand_id' => $this->brandX->id,
            'price' => 100,
            'quantity' => 10,
        ]);

        Product::create([
            'name' => 'Casque Logitech',
            'category_id' => $this->categoryB->id,
            'brand_id' => $this->brandX->id,
            'price' => 50,
            'quantity' => 15,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/products?category_id=' . $this->categoryA->id . '&brand_id=' . $this->brandX->id);

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Souris MX Master', $response->json('data.0.name'));
    }

    public function test_can_filter_products_by_search_name_and_barcode(): void
    {
        Product::create([
            'name' => 'Clavier Mécanique',
            'category_id' => $this->categoryA->id,
            'barcode' => '619123456789',
            'price' => 120,
            'quantity' => 8,
        ]);

        Product::create([
            'name' => 'Tapis de souris',
            'category_id' => $this->categoryB->id,
            'barcode' => '619987654321',
            'price' => 15,
            'quantity' => 30,
        ]);

        // Search by name
        $res1 = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/products?search=Clavier');
        $res1->assertOk();
        $this->assertCount(1, $res1->json('data'));
        $this->assertEquals('Clavier Mécanique', $res1->json('data.0.name'));

        // Search by barcode
        $res2 = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/products?search=619987654321');
        $res2->assertOk();
        $this->assertCount(1, $res2->json('data'));
        $this->assertEquals('Tapis de souris', $res2->json('data.0.name'));

        // Search by AZERTY barcode scancode characters (e.g. '-' -> 6, '&' -> 1)
        // 619123456789 in azerty: - & ç & é " ' ( - è _ ç
        $res3 = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/products?search=' . urlencode('-&ç&é'));
        $res3->assertOk();
        $this->assertCount(1, $res3->json('data'));
        $this->assertEquals('Clavier Mécanique', $res3->json('data.0.name'));
    }

    public function test_can_sort_products(): void
    {
        Product::create([
            'name' => 'Alpha',
            'category_id' => $this->categoryA->id,
            'price' => 200,
            'quantity' => 5,
        ]);

        Product::create([
            'name' => 'Beta',
            'category_id' => $this->categoryA->id,
            'price' => 50,
            'quantity' => 100,
        ]);

        // Price ascending
        $resPriceAsc = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/products?sort_by=price_asc');
        $resPriceAsc->assertOk();
        $this->assertEquals('Beta', $resPriceAsc->json('data.0.name'));
        $this->assertEquals('Alpha', $resPriceAsc->json('data.1.name'));

        // Price descending
        $resPriceDesc = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/products?sort_by=price_desc');
        $resPriceDesc->assertOk();
        $this->assertEquals('Alpha', $resPriceDesc->json('data.0.name'));
        $this->assertEquals('Beta', $resPriceDesc->json('data.1.name'));

        // Stock ascending
        $resStockAsc = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/products?sort_by=stock_asc');
        $resStockAsc->assertOk();
        $this->assertEquals('Alpha', $resStockAsc->json('data.0.name'));
        $this->assertEquals('Beta', $resStockAsc->json('data.1.name'));
    }
}
