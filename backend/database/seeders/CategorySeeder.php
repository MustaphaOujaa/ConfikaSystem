<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Informatique & High-Tech',
                'description' => 'Ordinateurs, claviers, souris, écrans, composants et accessoires informatiques.',
            ],
            [
                'name' => 'Téléphonie & Accessoires',
                'description' => 'Smartphones, câbles de charge, chargeurs rapides, écouteurs et pochettes.',
            ],
            [
                'name' => 'Alimentation & Épicerie',
                'description' => 'Produits alimentaires secs, conserves, snacks, biscuits et chocolat.',
            ],
            [
                'name' => 'Boissons & Rafraîchissements',
                'description' => 'Eaux minérales, jus de fruits naturels, sodas et boissons énergisantes.',
            ],
            [
                'name' => 'Beauté, Soins & Hygiène',
                'description' => 'Shampooings, savons, gels douche, parfums et soins corporels.',
            ],
            [
                'name' => 'Fournitures de Bureau',
                'description' => 'Papeterie, cahiers, stylos, classeurs et consommables de bureau.',
            ],
        ];

        foreach ($categories as $cat) {
            Category::firstOrCreate(
                ['name' => $cat['name']],
                ['description' => $cat['description']]
            );
        }
    }
}
