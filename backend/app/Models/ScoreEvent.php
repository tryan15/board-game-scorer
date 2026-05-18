<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScoreEvent extends Model
{
    protected $fillable = ['session_id', 'player_id', 'points', 'label'];
}
