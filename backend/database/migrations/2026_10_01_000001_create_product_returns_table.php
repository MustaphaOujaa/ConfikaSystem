<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add return_status to transactions
        Schema::table('transactions', function (Blueprint $table) {
            $table->enum('return_status', ['none', 'partial', 'full'])->default('none')->after('total_amount');
        });

        // 2. Add returned_quantity to transaction_items
        Schema::table('transaction_items', function (Blueprint $table) {
            $table->integer('returned_quantity')->default(0)->after('quantity');
        });

        // 3. Create product_returns table
        Schema::create('product_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('refund_amount', 10, 2);
            $table->string('payment_method')->default('cash'); // cash, voucher, etc.
            $table->string('reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 4. Create return_items table
        Schema::create('return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_return_id')->constrained('product_returns')->onDelete('cascade');
            $table->foreignId('transaction_item_id')->constrained('transaction_items')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->foreignId('product_stock_id')->nullable()->constrained('product_stocks')->nullOnDelete();
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('refund_price', 10, 2);
            $table->boolean('restocked')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('return_items');
        Schema::dropIfExists('product_returns');

        Schema::table('transaction_items', function (Blueprint $table) {
            $table->dropColumn('returned_quantity');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('return_status');
        });
    }
};
