<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScoringElement extends Model
{
    public $timestamps = false;

    protected $fillable = ['game_id', 'name', 'description', 'input_type', 'point_value', 'sort_order'];

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }
}
