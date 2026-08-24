<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScannerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->category = Category::create(['name' => 'Snacks']);
    }

    public function test_can_lookup_product_by_barcode(): void
    {
        $product = Product::create([
            'name' => 'Chocolat Noir',
            'category_id' => $this->category->id,
            'barcode' => '6111234567890',
            'cost_price' => 10.00,
            'price' => 15.00,
            'quantity' => 20,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/scanner/products/{$product->barcode}");

        $response->assertOk()
            ->assertJsonPath('barcode', '6111234567890')
            ->assertJsonPath('name', 'Chocolat Noir')
            ->assertJsonPath('price', '15.00')
            ->assertJsonStructure(['id', 'name', 'barcode', 'price', 'quantity', 'category', 'images']);
    }

    public function test_returns_404_when_product_barcode_not_found(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/scanner/products/nonexistent-999');

        $response->assertNotFound();
    }

    public function test_can_process_sale_via_scanner_and_decrements_stock(): void
    {
        $product1 = Product::create([
            'name' => 'Biscuit Oreo',
            'category_id' => $this->category->id,
            'barcode' => '6110001',
            'cost_price' => 5.00,
            'price' => 8.00,
            'quantity' => 25,
        ]);

        $product2 = Product::create([
            'name' => 'Jus Orange',
            'category_id' => $this->category->id,
            'barcode' => '6110002',
            'cost_price' => 7.00,
            'price' => 12.00,
            'quantity' => 15,
        ]);

        $payload = [
            'items' => [
                ['barcode' => '6110001', 'quantity' => 2],
                ['barcode' => '6110002', 'quantity' => 1],
            ],
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/scanner/sales', $payload);

        $response->assertCreated()
            ->assertJsonPath('transaction.type', 'sale');
        $this->assertEquals(28, (float) $response->json('transaction.total_amount'));

        // Verify stock deduction
        $this->assertEquals(23, $product1->fresh()->quantity);
        $this->assertEquals(14, $product2->fresh()->quantity);

        // Verify database transaction records
        $this->assertDatabaseHas('transactions', [
            'type' => 'sale',
            'total_amount' => 28.00,
        ]);
        $this->assertDatabaseHas('transaction_items', [
            'product_id' => $product1->id,
            'quantity' => 2,
        ]);
    }

    public function test_fails_sale_if_quantity_exceeds_available_stock(): void
    {
        $product = Product::create([
            'name' => 'Soda Can',
            'category_id' => $this->category->id,
            'barcode' => '6110003',
            'cost_price' => 3.00,
            'price' => 5.00,
            'quantity' => 3,
        ]);

        $payload = [
            'items' => [
                ['barcode' => '6110003', 'quantity' => 10], // Requesting 10 when only 3 available
            ],
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/scanner/sales', $payload);

        $response->assertStatus(500);

        // Stock should remain unchanged
        $this->assertEquals(3, $product->fresh()->quantity);
    }
}
