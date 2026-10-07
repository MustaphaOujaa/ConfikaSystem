<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reparation_inventory_parts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('brand')->nullable(); // e.g. Apple, Samsung, Xiaomi
            $table->string('compatible_model')->nullable(); // e.g. iPhone 13, Galaxy A54
            $table->integer('quantity')->default(0);
            $table->decimal('cost_price', 10, 2)->default(0.00); // wholesale price paid
            $table->integer('min_stock_alert')->default(2); // threshold for alert
            $table->string('location')->nullable(); // e.g. Tiroir A3, Boite Ecran
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Add inventory_part_id to reparation_parts table
        Schema::table('reparation_parts', function (Blueprint $table) {
            $table->foreignId('inventory_part_id')
                ->nullable()
                ->after('product_id')
                ->constrained('reparation_inventory_parts')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('reparation_parts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('inventory_part_id');
        });
        Schema::dropIfExists('reparation_inventory_parts');
    }
};
