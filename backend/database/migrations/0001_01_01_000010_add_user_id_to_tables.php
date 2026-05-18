<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            // nullable: NULL means shared/predefined game visible to all users
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });

        Schema::table('players', function (Blueprint $table) {
            $table->foreignId('user_id')->after('id')->constrained()->cascadeOnDelete();
        });

        Schema::table('sessions', function (Blueprint $table) {
            $table->foreignId('user_id')->after('id')->constrained()->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('games', fn(Blueprint $t) => $t->dropColumn('user_id'));
        Schema::table('players', fn(Blueprint $t) => $t->dropColumn('user_id'));
        Schema::table('sessions', fn(Blueprint $t) => $t->dropColumn('user_id'));
    }
};
