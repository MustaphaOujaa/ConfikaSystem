<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('product_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('batch_number')->nullable();
            $table->decimal('cost_price', 10, 2)->default(0);
            $table->decimal('price', 10, 2)->default(0);
            $table->unsignedInteger('quantity')->default(0);
            $table->timestamps();
        });

        // Migrate existing products' stock into initial batches
        $products = DB::table('products')->get();
        foreach ($products as $product) {
            DB::table('product_stocks')->insert([
                'product_id'   => $product->id,
                'batch_number' => 'LOT-INITIAL',
                'cost_price'   => $product->cost_price ?? 0,
                'price'        => $product->price ?? 0,
                'quantity'     => $product->quantity ?? 0,
                'created_at'   => $product->created_at ?? now(),
                'updated_at'   => $product->updated_at ?? now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_stocks');
    }
};
