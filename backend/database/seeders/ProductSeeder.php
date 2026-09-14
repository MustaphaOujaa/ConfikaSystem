<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductStock;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ensure Brands exist
        $brandNames = ['Logitech', 'Samsung', 'Apple', 'HP', 'Sony', 'Nestle', 'Coca-Cola', 'Danone', 'Xiaomi', 'Dell'];
        $brands = [];
        foreach ($brandNames as $bName) {
            $brands[] = Brand::firstOrCreate(['name' => $bName]);
        }

        // 2. Ensure Categories exist
        $categories = Category::all();
        if ($categories->isEmpty()) {
            $this->call(CategorySeeder::class);
            $categories = Category::all();
        }

        $infoCat = Category::where('name', 'like', '%Informatique%')->first() ?? $categories->first();
        $telCat = Category::where('name', 'like', '%Téléphonie%')->first() ?? $categories->first();
        $alimCat = Category::where('name', 'like', '%Alimentation%')->first() ?? $categories->first();
        $boissCat = Category::where('name', 'like', '%Boissons%')->first() ?? $categories->first();
        $beautCat = Category::where('name', 'like', '%Beauté%')->first() ?? $categories->first();
        $bureauCat = Category::where('name', 'like', '%Bureau%')->first() ?? $categories->first();

        // 3. Catalog of 50 realistic products with authentic Moroccan retail / tech items
        $catalog = [
            // Informatique & High-Tech (10)
            ['name' => 'Souris Gamer RGB Logitech G203', 'category_id' => $infoCat->id, 'brand' => 'Logitech', 'cost' => 140, 'price' => 220, 'qty' => 35],
            ['name' => 'Clavier Mécanique Sans Fil Pro', 'category_id' => $infoCat->id, 'brand' => 'Logitech', 'cost' => 380, 'price' => 550, 'qty' => 20],
            ['name' => 'Casque Audio Stéréo Filaire USB', 'category_id' => $infoCat->id, 'brand' => 'Sony', 'cost' => 120, 'price' => 190, 'qty' => 45],
            ['name' => 'Disque Dur Externe 1To USB 3.0', 'category_id' => $infoCat->id, 'brand' => 'Dell', 'cost' => 350, 'price' => 490, 'qty' => 15],
            ['name' => 'Clé USB 64Go Ultra Rapide 3.1', 'category_id' => $infoCat->id, 'brand' => 'Samsung', 'cost' => 45, 'price' => 79, 'qty' => 80],
            ['name' => 'Écran PC Full HD 24 Pouces IPS', 'category_id' => $infoCat->id, 'brand' => 'Samsung', 'cost' => 850, 'price' => 1250, 'qty' => 12],
            ['name' => 'Tapis de Souris Ergonomique XXL', 'category_id' => $infoCat->id, 'brand' => 'Logitech', 'cost' => 35, 'price' => 69, 'qty' => 50],
            ['name' => 'Webcam Full HD 1080p avec Micro', 'category_id' => $infoCat->id, 'brand' => 'Logitech', 'cost' => 220, 'price' => 340, 'qty' => 18],
            ['name' => 'Hub USB-C 7-en-1 HDMI & SD', 'category_id' => $infoCat->id, 'brand' => 'Xiaomi', 'cost' => 110, 'price' => 185, 'qty' => 30],
            ['name' => 'Support Ordinateur Portable Alu', 'category_id' => $infoCat->id, 'brand' => 'Xiaomi', 'cost' => 65, 'price' => 120, 'qty' => 25],

            // Téléphonie & Accessoires (10)
            ['name' => 'Câble USB-C vers Lightning 1M', 'category_id' => $telCat->id, 'brand' => 'Apple', 'cost' => 40, 'price' => 89, 'qty' => 60],
            ['name' => 'Chargeur Rapide 33W Type-C', 'category_id' => $telCat->id, 'brand' => 'Xiaomi', 'cost' => 55, 'price' => 110, 'qty' => 40],
            ['name' => 'Écouteurs Sans Fil Bluetooth V5.3', 'category_id' => $telCat->id, 'brand' => 'Xiaomi', 'cost' => 90, 'price' => 160, 'qty' => 50],
            ['name' => 'Power Bank 20000mAh Charge Rapide', 'category_id' => $telCat->id, 'brand' => 'Xiaomi', 'cost' => 140, 'price' => 230, 'qty' => 28],
            ['name' => 'Support Téléphone Voiture Magnétique', 'category_id' => $telCat->id, 'brand' => 'Xiaomi', 'cost' => 25, 'price' => 55, 'qty' => 65],
            ['name' => 'Pochette Silicone Antichoc iPhone', 'category_id' => $telCat->id, 'brand' => 'Apple', 'cost' => 20, 'price' => 49, 'qty' => 70],
            ['name' => 'Film Protection Verre Trempé 9D', 'category_id' => $telCat->id, 'brand' => 'Samsung', 'cost' => 8, 'price' => 25, 'qty' => 150],
            ['name' => 'Adaptateur Audio Jack 3.5mm vers Type-C', 'category_id' => $telCat->id, 'brand' => 'Samsung', 'cost' => 15, 'price' => 35, 'qty' => 45],
            ['name' => 'Câble Micro-USB Renforcé 1.5M', 'category_id' => $telCat->id, 'brand' => 'Xiaomi', 'cost' => 12, 'price' => 29, 'qty' => 90],
            ['name' => 'Trépied Téléphone avec Télécommande', 'category_id' => $telCat->id, 'brand' => 'Sony', 'cost' => 45, 'price' => 95, 'qty' => 22],

            // Alimentation & Épicerie (10)
            ['name' => 'Huile d\'Olive Vierge Extra 1L', 'category_id' => $alimCat->id, 'brand' => null, 'cost' => 65, 'price' => 85, 'qty' => 40],
            ['name' => 'Café Moulu Classique 250g', 'category_id' => $alimCat->id, 'brand' => 'Nestle', 'cost' => 22, 'price' => 32, 'qty' => 60],
            ['name' => 'Chocolat au Lait Tablette 100g', 'category_id' => $alimCat->id, 'brand' => 'Nestle', 'cost' => 10, 'price' => 16, 'qty' => 85],
            ['name' => 'Biscuits Secs Croustillants 200g', 'category_id' => $alimCat->id, 'brand' => 'Danone', 'cost' => 8, 'price' => 14, 'qty' => 100],
            ['name' => 'Thé Vert Menthe Traditionnel 200g', 'category_id' => $alimCat->id, 'brand' => null, 'cost' => 14, 'price' => 22, 'qty' => 75],
            ['name' => 'Pâtes Spaghetti Qualité Supérieure 500g', 'category_id' => $alimCat->id, 'brand' => null, 'cost' => 6, 'price' => 10.5, 'qty' => 120],
            ['name' => 'Sauce Tomate Cuisinée Basilic 380g', 'category_id' => $alimCat->id, 'brand' => null, 'cost' => 9, 'price' => 15, 'qty' => 50],
            ['name' => 'Boîte de Thon Entier à l\'Huile 160g', 'category_id' => $alimCat->id, 'brand' => null, 'cost' => 11, 'price' => 17, 'qty' => 90],
            ['name' => 'Miel Naturel Pur d\'Oranger 500g', 'category_id' => $alimCat->id, 'brand' => null, 'cost' => 50, 'price' => 75, 'qty' => 30],
            ['name' => 'Fromage Fondu Portion Boîte 24p', 'category_id' => $alimCat->id, 'brand' => 'Danone', 'cost' => 20, 'price' => 28, 'qty' => 45],

            // Boissons & Rafraîchissements (8)
            ['name' => 'Eau Minérale Naturelle 1.5L', 'category_id' => $boissCat->id, 'brand' => 'Danone', 'cost' => 3.5, 'price' => 6, 'qty' => 200],
            ['name' => 'Pack Eau Minérale 6x1.5L', 'category_id' => $boissCat->id, 'brand' => 'Danone', 'cost' => 19, 'price' => 30, 'qty' => 50],
            ['name' => 'Bouteille Soda Cola Original 1L', 'category_id' => $boissCat->id, 'brand' => 'Coca-Cola', 'cost' => 6.5, 'price' => 10, 'qty' => 120],
            ['name' => 'Canette Soda Citron Frais 33cl', 'category_id' => $boissCat->id, 'brand' => 'Coca-Cola', 'cost' => 3.8, 'price' => 6, 'qty' => 180],
            ['name' => 'Jus d\'Orange Pur Jus 1L', 'category_id' => $boissCat->id, 'brand' => null, 'cost' => 12, 'price' => 18.5, 'qty' => 45],
            ['name' => 'Jus de Pomme Naturel 1L', 'category_id' => $boissCat->id, 'brand' => null, 'cost' => 11, 'price' => 17.5, 'qty' => 40],
            ['name' => 'Boisson Énergisante Boost 250ml', 'category_id' => $boissCat->id, 'brand' => null, 'cost' => 9, 'price' => 15, 'qty' => 70],
            ['name' => 'Lait Pasteurisé Demi-Écrémé 1L', 'category_id' => $boissCat->id, 'brand' => 'Danone', 'cost' => 6.5, 'price' => 9.5, 'qty' => 80],

            // Beauté & Soins (7)
            ['name' => 'Shampooing Antipelliculaire 400ml', 'category_id' => $beautCat->id, 'brand' => null, 'cost' => 28, 'price' => 44, 'qty' => 35],
            ['name' => 'Gel Douche Hydratant Amande 500ml', 'category_id' => $beautCat->id, 'brand' => null, 'cost' => 20, 'price' => 34, 'qty' => 50],
            ['name' => 'Savon Liquide Antibactérien 300ml', 'category_id' => $beautCat->id, 'brand' => null, 'cost' => 12, 'price' => 21, 'qty' => 65],
            ['name' => 'Dentifrice Blanchissant Protection 75ml', 'category_id' => $beautCat->id, 'brand' => null, 'cost' => 15, 'price' => 24, 'qty' => 80],
            ['name' => 'Déodorant Spray Fraîcheur 200ml', 'category_id' => $beautCat->id, 'brand' => null, 'cost' => 22, 'price' => 36, 'qty' => 40],
            ['name' => 'Crème Hydratante Mains & Corps 150ml', 'category_id' => $beautCat->id, 'brand' => null, 'cost' => 18, 'price' => 30, 'qty' => 45],
            ['name' => 'Lingettes Nettoyantes Douces Pack 72', 'category_id' => $beautCat->id, 'brand' => null, 'cost' => 14, 'price' => 23, 'qty' => 60],

            // Fournitures de Bureau (5)
            ['name' => 'Rame de Papier A4 80g 500 Feuilles', 'category_id' => $bureauCat->id, 'brand' => 'HP', 'cost' => 38, 'price' => 56, 'qty' => 60],
            ['name' => 'Paquet de 4 Stylos Bille (Bleu/Noir/Rouge/Vert)', 'category_id' => $bureauCat->id, 'brand' => null, 'cost' => 7, 'price' => 14, 'qty' => 110],
            ['name' => 'Cahier Grand Format Spirale 200 Pages', 'category_id' => $bureauCat->id, 'brand' => null, 'cost' => 14, 'price' => 24, 'qty' => 75],
            ['name' => 'Agrafeuse de Bureau Métal + Boîte 1000 Agrafes', 'category_id' => $bureauCat->id, 'brand' => null, 'cost' => 22, 'price' => 39, 'qty' => 30],
            ['name' => 'Ruban Adhésif Transparent 50m Lot de 2', 'category_id' => $bureauCat->id, 'brand' => null, 'cost' => 9, 'price' => 18, 'qty' => 90],
        ];

        // Seed 50 products using the catalog, generating unique barcodes & initial batch stocks
        $baseBarcode = 611100001000;
        foreach ($catalog as $index => $item) {
            $barcode = (string) ($baseBarcode + $index);
            $brandId = !empty($item['brand']) 
                ? (Brand::where('name', $item['brand'])->value('id') ?? null) 
                : null;

            $product = Product::updateOrCreate(
                ['barcode' => $barcode],
                [
                    'name' => $item['name'],
                    'category_id' => $item['category_id'],
                    'brand_id' => $brandId,
                    'cost_price' => $item['cost'],
                    'price' => $item['price'],
                    'quantity' => $item['qty'],
                    'description' => "Article de qualité {$item['name']}. Conforme aux normes.",
                ]
            );

            // Create initial batch stock for POS batch-tracking
            ProductStock::updateOrCreate(
                [
                    'product_id' => $product->id,
                    'batch_number' => 'LOT-INIT-' . str_pad($index + 1, 3, '0', STR_PAD_LEFT),
                ],
                [
                    'cost_price' => $item['cost'],
                    'price' => $item['price'],
                    'quantity' => $item['qty'],
                ]
            );
        }

        $this->command->info("50 products successfully seeded with categories, brands, unique barcodes and batch stocks.");
    }
}
