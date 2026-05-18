<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Game extends Model
{
    protected $fillable = ['name', 'description', 'scoring_type'];

    public function elements(): HasMany
    {
        return $this->hasMany(ScoringElement::class)->orderBy('sort_order');
    }
}
