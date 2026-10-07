<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReparationInventoryPartChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;
    public string $action; // created | updated | deleted
    public ?array $part;
    public ?int $partId;

    public function __construct(string $action, ?array $part = null, ?int $partId = null)
    {
        $this->action  = $action;
        $this->part    = $part;
        $this->partId  = $partId;
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
        return 'inventory.part.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'action'  => $this->action,
            'part'    => $this->part,
            'part_id' => $this->partId,
        ];
    }
}
