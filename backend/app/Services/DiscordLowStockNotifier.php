<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DiscordLowStockNotifier
{
    public function notify(Collection $products): void
    {
        $webhookUrl = config('services.discord.low_stock_webhook_url');

        if (!$webhookUrl || $products->isEmpty()) {
            return;
        }

        $products = $products->unique('id')->values();

        $response = Http::timeout(5)->post($webhookUrl, [
            'username' => 'Confika Stock Bot',
            'embeds' => [
                [
                    'title' => 'Low Stock Alert',
                    'description' => 'One or more products reached the low stock threshold.',
                    'color' => 15158332,
                    'fields' => $products->map(fn (Product $product): array => [
                        'name' => $product->name,
                        'value' => sprintf(
                            "Quantity: **%d**\nThreshold: **%d**",
                            $product->quantity,
                            Product::LOW_STOCK_THRESHOLD
                        ),
                        'inline' => true,
                    ])->all(),
                    'footer' => [
                        'text' => 'ConfikaSystem inventory monitor',
                    ],
                    'timestamp' => now()->toIso8601String(),
                ],
            ],
        ]);

        if ($response->failed()) {
            Log::warning('Discord low stock notification failed.', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }
    }
}
