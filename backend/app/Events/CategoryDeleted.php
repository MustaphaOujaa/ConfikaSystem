<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CategoryDeleted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $categoryId;

    public function __construct(int $categoryId)
    {
        $this->categoryId = $categoryId;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('inventory'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'category.deleted';
    }

    public function broadcastWith(): array
    {
        return [
            'category_id' => $this->categoryId,
        ];
    }
}
