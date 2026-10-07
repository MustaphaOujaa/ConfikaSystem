<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reparations', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique()->nullable();
            
            // Client info
            $table->string('client_name');
            $table->string('client_phone');

            // Device info (matching Bon de Réparation)
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('imei_serial')->nullable();
            $table->string('color')->nullable();

            // Panne signalée
            $table->boolean('panne_batterie')->default(false);
            $table->boolean('panne_chargeur')->default(false);
            $table->boolean('panne_coque')->default(false);
            $table->boolean('panne_sim')->default(false);
            $table->string('panne_autre')->nullable();

            // État de l'appareil
            $table->boolean('etat_ecran_casse')->default(false);
            $table->boolean('etat_ne_sallume_pas')->default(false);
            $table->boolean('etat_fonctionne')->default(false);

            // Detailed problem description & notes
            $table->text('description_panne')->nullable();
            $table->text('remarques')->nullable();

            // Financial amounts
            $table->decimal('total_price', 10, 2)->default(0.00); // Montant total / estimé
            $table->decimal('acompte', 10, 2)->default(0.00);     // Acompte payé
            $table->decimal('reste', 10, 2)->default(0.00);       // Reste à payer
            $table->decimal('cout_pieces', 10, 2)->default(0.00); // Total cost of parts for store
            $table->decimal('gain', 10, 2)->default(0.00);        // Profit = total_price - cout_pieces

            // Status & Dates
            $table->enum('status', ['recu', 'en_cours', 'pret', 'livre', 'annule'])->default('recu');
            $table->date('date_depot');
            $table->date('date_prevue')->nullable();
            $table->date('date_retrait')->nullable();

            // Created by user / cashier
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
        });

        Schema::create('reparation_parts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reparation_id')->constrained('reparations')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('name');
            $table->integer('quantity')->default(1);
            $table->decimal('cost_price', 10, 2)->default(0.00);    // What the store paid
            $table->decimal('selling_price', 10, 2)->default(0.00); // What is charged to client
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reparation_parts');
        Schema::dropIfExists('reparations');
    }
};
