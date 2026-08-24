<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductRoleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $caissier;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create(['name' => 'admin', 'email' => 'admin@gmail.com']);
        $this->caissier = User::factory()->create(['name' => 'caissier', 'email' => 'caissier@gmail.com', 'role' => 'caissier']);
        $this->category = Category::create(['name' => 'Alimentation']);
    }

    public function test_admin_can_create_product(): void
    {
        $payload = [
            'name' => 'Produit Admin',
            'category_id' => $this->category->id,
            'barcode' => 'ADMIN001',
            'cost_price' => 50.00,
            'price' => 80.00,
            'quantity' => 100,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/products', $payload);

        $response->assertCreated()
            ->assertJsonPath('name', 'Produit Admin');
        $this->assertEquals(80.00, $response->json('price'));
    }

    public function test_caissier_cannot_create_product(): void
    {
        $payload = [
            'name' => 'Produit Caissier',
            'category_id' => $this->category->id,
            'barcode' => 'CAISSIER001',
            'cost_price' => 10.00,
            'price' => 20.00,
            'quantity' => 10,
        ];

        $response = $this->actingAs($this->caissier, 'sanctum')
            ->postJson('/api/products', $payload);

        $response->assertForbidden()
            ->assertJsonPath('message', 'Accès refusé. Seul un administrateur peut créer des produits.');
    }

    public function test_caissier_can_update_product_info_and_quantity_but_not_price(): void
    {
        $product = Product::create([
            'name' => 'Produit Original',
            'category_id' => $this->category->id,
            'barcode' => 'BARCODE001',
            'cost_price' => 30.00,
            'price' => 60.00,
            'quantity' => 5,
        ]);

        $updatePayload = [
            'name' => 'Produit Renommé par Caissier',
            'quantity' => 25,
            'price' => 999.00, // Attempted price change by caissier
            'cost_price' => 1.00, // Attempted cost_price change by caissier
        ];

        $response = $this->actingAs($this->caissier, 'sanctum')
            ->putJson("/api/products/{$product->id}", $updatePayload);

        $response->assertOk();

        $product->refresh();
        // Name and quantity SHOULD be updated
        $this->assertEquals('Produit Renommé par Caissier', $product->name);
        $this->assertEquals(25, $product->quantity);
        // Price and cost_price MUST remain untouched
        $this->assertEquals(60.00, $product->price);
        $this->assertEquals(30.00, $product->cost_price);
    }

    public function test_admin_can_update_product_prices_and_all_fields(): void
    {
        $product = Product::create([
            'name' => 'Produit Initial',
            'category_id' => $this->category->id,
            'barcode' => 'BARCODE002',
            'cost_price' => 30.00,
            'price' => 60.00,
            'quantity' => 10,
        ]);

        $updatePayload = [
            'name' => 'Produit Mis à jour Admin',
            'price' => 90.00,
            'cost_price' => 45.00,
            'quantity' => 50,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/products/{$product->id}", $updatePayload);

        $response->assertOk();

        $product->refresh();
        $this->assertEquals('Produit Mis à jour Admin', $product->name);
        $this->assertEquals(90.00, $product->price);
        $this->assertEquals(45.00, $product->cost_price);
        $this->assertEquals(50, $product->quantity);
    }

    public function test_caissier_cannot_delete_product(): void
    {
        $product = Product::create([
            'name' => 'Produit à supprimer',
            'category_id' => $this->category->id,
            'barcode' => 'BARCODE003',
            'cost_price' => 10.00,
            'price' => 20.00,
            'quantity' => 10,
        ]);

        $response = $this->actingAs($this->caissier, 'sanctum')
            ->deleteJson("/api/products/{$product->id}");

        $response->assertForbidden();
        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }
}
