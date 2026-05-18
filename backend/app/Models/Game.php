<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Game extends Model
{
    protected $fillable = ['user_id', 'name', 'description', 'scoring_type', 'is_shared'];

    protected $casts = ['is_shared' => 'boolean'];

    public function elements(): HasMany
    {
        return $this->hasMany(ScoringElement::class)->orderBy('sort_order');
    }
}
