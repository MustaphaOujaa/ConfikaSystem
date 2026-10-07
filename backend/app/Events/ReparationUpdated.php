<?php

namespace App\Events;

use App\Models\Reparation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReparationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;
    public Reparation $reparation;

    public function __construct(Reparation $reparation)
    {
        $this->reparation = $reparation->load(['parts', 'user:id,name']);
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
        return 'reparation.updated';
    }

    public function broadcastWith(): array
    {
        return ['reparation' => $this->reparation->toArray()];
    }
}
