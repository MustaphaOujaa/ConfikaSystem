<?php

namespace App\Events;

use App\Models\Category;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CategoryCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Category $category;

    public function __construct(Category $category)
    {
        $this->category = $category->loadCount('products');
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('inventory'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'category.created';
    }

    public function broadcastWith(): array
    {
        return [
            'category' => $this->category->toArray(),
        ];
    }
}
