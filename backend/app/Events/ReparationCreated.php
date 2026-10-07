<?php

namespace App\Events;

use App\Models\Reparation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReparationCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Reparation $reparation;

    public function __construct(Reparation $reparation)
    {
        $this->reparation = $reparation->load(['parts', 'user:id,name']);
    }

    public function broadcastOn(): array
    {
        return [new Channel('reparations')];
    }

    public function broadcastAs(): string
    {
        return 'reparation.created';
    }

    public function broadcastWith(): array
    {
        return ['reparation' => $this->reparation->toArray()];
    }
}
