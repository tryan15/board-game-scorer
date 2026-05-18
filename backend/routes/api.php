<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GameController;
use App\Http\Controllers\PlayerController;
use App\Http\Controllers\SessionController;

Route::apiResource('games', GameController::class);

Route::get('players', [PlayerController::class, 'index']);
Route::post('players', [PlayerController::class, 'store']);
Route::delete('players/{id}', [PlayerController::class, 'destroy']);

Route::get('sessions', [SessionController::class, 'index']);
Route::post('sessions', [SessionController::class, 'store']);
Route::get('sessions/{id}', [SessionController::class, 'show']);
Route::delete('sessions/{id}', [SessionController::class, 'destroy']);
Route::post('sessions/{id}/scores', [SessionController::class, 'addScores']);
Route::post('sessions/{id}/events', [SessionController::class, 'addEvent']);
Route::post('sessions/{id}/complete', [SessionController::class, 'complete']);
