<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Admin Account (Full access to Daily Reports, Net Profits & Margins, Catalog, POS)
        User::updateOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'name' => 'admin',
                'password' => Hash::make('admin'),
                'role' => 'admin',
            ]
        );

        // 2. Caissier Account (Standard cashier: POS sales, products catalog/crud, transactions without profit figures)
        User::updateOrCreate(
            ['email' => 'caissier@gmail.com'],
            [
                'name' => 'caissier',
                'password' => Hash::make('caissier'),
                'role' => 'caissier',
            ]
        );

        // Clean up old default user if present
        User::where('email', 'admin@example.com')->delete();
    }
}
