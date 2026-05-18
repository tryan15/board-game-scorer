<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('player_id')->constrained();
            $table->foreignId('element_id')->constrained('scoring_elements');
            $table->float('value')->default(0);
            $table->unique(['session_id', 'player_id', 'element_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scores');
    }
};
