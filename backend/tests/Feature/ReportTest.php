<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
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
        $this->category = Category::create(['name' => 'Boissons']);
    }

    public function test_admin_can_view_daily_report_with_sold_products_breakdown(): void
    {
        $product = Product::create([
            'name' => 'Eau Minérale 1.5L',
            'category_id' => $this->category->id,
            'barcode' => '61199990001',
            'cost_price' => 3.00,
            'price' => 5.00,
            'quantity' => 50,
        ]);

        $transaction = Transaction::create([
            'type' => 'sale',
            'total_amount' => 15.00,
            'transaction_date' => now(),
        ]);

        TransactionItem::create([
            'transaction_id' => $transaction->id,
            'product_id' => $product->id,
            'quantity' => 3,
            'unit_price' => 5.00,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/reports/daily');

        $response->assertOk()
            ->assertJsonPath('products_sold_count', 3)
            ->assertJsonPath('total_sales_revenue', 15)
            ->assertJsonPath('total_cost_of_goods_sold', 9)
            ->assertJsonPath('net_profit_today', 6)
            ->assertJsonStructure([
                'date',
                'products_sold_count',
                'total_sales_revenue',
                'total_cost_of_goods_sold',
                'net_profit_today',
                'currency',
                'products_sold' => [
                    '*' => [
                        'product_id',
                        'name',
                        'barcode',
                        'category',
                        'quantity_sold',
                        'unit_cost',
                        'unit_price',
                        'total_revenue',
                        'total_cost',
                        'total_profit',
                    ]
                ]
            ]);
    }

    public function test_caissier_is_forbidden_from_accessing_daily_report(): void
    {
        $response = $this->actingAs($this->caissier, 'sanctum')
            ->getJson('/api/reports/daily');

        $response->assertForbidden()
            ->assertJsonPath('message', 'Accès refusé. Les rapports journaliers financiers sont réservés aux administrateurs.');
    }
}
