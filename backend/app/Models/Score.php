<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Score extends Model
{
    public $timestamps = false;

    protected $fillable = ['session_id', 'player_id', 'element_id', 'value'];
}
