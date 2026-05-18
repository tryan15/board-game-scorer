<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class GameSession extends Model
{
    protected $table = 'sessions';

    protected $fillable = ['user_id', 'game_id', 'completed'];

    protected $casts = ['completed' => 'boolean'];

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function players(): BelongsToMany
    {
        return $this->belongsToMany(Player::class, 'session_players', 'session_id', 'player_id')
            ->withPivot('sort_order')
            ->orderByPivot('sort_order');
    }

    public function scores(): HasMany
    {
        return $this->hasMany(Score::class, 'session_id');
    }

    public function scoreEvents(): HasMany
    {
        return $this->hasMany(ScoreEvent::class, 'session_id');
    }
}
