<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReparationDeleted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;
    public int $reparationId;

    public function __construct(int $reparationId)
    {
        $this->reparationId = $reparationId;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('inventory'),
            new Channel('reparations'),
            new Channel('reparation-inventory'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'reparation.deleted';
    }

    public function broadcastWith(): array
    {
        return ['id' => $this->reparationId];
    }
}
