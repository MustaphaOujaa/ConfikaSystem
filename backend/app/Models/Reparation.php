<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reparation extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_number',
        'client_name',
        'client_phone',
        'brand',
        'model',
        'imei_serial',
        'color',
        'panne_batterie',
        'panne_chargeur',
        'panne_coque',
        'panne_sim',
        'panne_autre',
        'etat_ecran_casse',
        'etat_ne_sallume_pas',
        'etat_fonctionne',
        'description_panne',
        'remarques',
        'total_price',
        'acompte',
        'reste',
        'cout_pieces',
        'gain',
        'status',
        'date_depot',
        'date_prevue',
        'date_retrait',
        'user_id',
    ];

    protected $casts = [
        'panne_batterie' => 'boolean',
        'panne_chargeur' => 'boolean',
        'panne_coque' => 'boolean',
        'panne_sim' => 'boolean',
        'etat_ecran_casse' => 'boolean',
        'etat_ne_sallume_pas' => 'boolean',
        'etat_fonctionne' => 'boolean',
        'total_price' => 'decimal:2',
        'acompte' => 'decimal:2',
        'reste' => 'decimal:2',
        'cout_pieces' => 'decimal:2',
        'gain' => 'decimal:2',
        'date_depot' => 'date',
        'date_prevue' => 'date',
        'date_retrait' => 'date',
    ];

    public function parts()
    {
        return $this->hasMany(ReparationPart::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function generateTicketNumber(): string
    {
        $year = date('Y');
        $last = self::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();

        $seq = $last ? ($last->id + 1) : 1;
        return 'REP-' . $year . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function recalculateFinances(): void
    {
        $this->loadMissing('parts');
        $totalCost = $this->parts->sum(function ($part) {
            return ($part->cost_price ?? 0) * ($part->quantity ?? 1);
        });

        $this->cout_pieces = round($totalCost, 2);
        $this->reste = max(0, round($this->total_price - $this->acompte, 2));
        $this->gain = round($this->total_price - $this->cout_pieces, 2);
        $this->save();
    }
}
