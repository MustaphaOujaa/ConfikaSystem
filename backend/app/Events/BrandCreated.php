<?php

namespace App\Events;

use App\Models\Brand;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BrandCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Brand $brand;

    public function __construct(Brand $brand)
    {
        $this->brand = $brand->loadCount('products');
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('inventory'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'brand.created';
    }

    public function broadcastWith(): array
    {
        return [
            'brand' => $this->brand->toArray(),
        ];
    }
}
