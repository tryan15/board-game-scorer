<?php

namespace App\Http\Controllers;

use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerController extends Controller
{
    public function index(): JsonResponse
    {
        $players = Player::where('players.user_id', auth()->id())
            ->select('players.*')
            ->selectRaw('MAX(sessions.created_at) as last_used')
            ->leftJoin('session_players', 'session_players.player_id', '=', 'players.id')
            ->leftJoin('sessions', 'sessions.id', '=', 'session_players.session_id')
            ->groupBy('players.id')
            ->orderByRaw('CASE WHEN MAX(sessions.created_at) IS NULL THEN 1 ELSE 0 END')
            ->orderByRaw('MAX(sessions.created_at) DESC')
            ->orderBy('players.name')
            ->get();

        return response()->json($players);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string']);

        $existing = Player::where('user_id', auth()->id())
            ->whereRaw('lower(name) = lower(?)', [$request->name])
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Player already exists', 'player' => $existing], 409);
        }

        $player = Player::create(['user_id' => auth()->id(), 'name' => $request->name]);
        return response()->json($player, 201);
    }

    public function destroy(int $id): JsonResponse
    {
        Player::where('user_id', auth()->id())->findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }
}
