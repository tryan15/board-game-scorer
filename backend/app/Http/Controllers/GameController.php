<?php

namespace App\Http\Controllers;

use App\Models\Game;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GameController extends Controller
{
    public function index(): JsonResponse
    {
        $userId = auth()->id();
        $games = Game::where(function ($q) use ($userId) {
            $q->whereNull('user_id')->orWhere('user_id', $userId);
        })->orderBy('name')->get();

        return response()->json($games);
    }

    public function show(int $id): JsonResponse
    {
        $game = Game::with('elements')->findOrFail($id);
        return response()->json($game);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string']);

        $gameId = DB::transaction(function () use ($request) {
            $game = Game::create([
                'user_id'      => auth()->id(),
                'name'         => $request->name,
                'description'  => $request->description,
                'scoring_type' => $request->input('scoring_type', 'endgame'),
            ]);

            foreach ($request->input('elements', []) as $i => $el) {
                $game->elements()->create([
                    'name'        => $el['name'],
                    'description' => $el['description'] ?? null,
                    'input_type'  => $el['input_type'] ?? 'number',
                    'point_value' => $el['point_value'] ?? null,
                    'sort_order'  => $i,
                ]);
            }

            return $game->id;
        });

        return response()->json(Game::with('elements')->find($gameId), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $game = Game::findOrFail($id);

        DB::transaction(function () use ($request, $game) {
            $game->update([
                'name'         => $request->input('name', $game->name),
                'description'  => $request->description,
                'scoring_type' => $request->input('scoring_type', $game->scoring_type),
            ]);

            $game->elements()->delete();

            foreach ($request->input('elements', []) as $i => $el) {
                $game->elements()->create([
                    'name'        => $el['name'],
                    'description' => $el['description'] ?? null,
                    'input_type'  => $el['input_type'] ?? 'number',
                    'point_value' => $el['point_value'] ?? null,
                    'sort_order'  => $i,
                ]);
            }
        });

        return response()->json(Game::with('elements')->find($id));
    }

    public function destroy(int $id): JsonResponse
    {
        Game::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }
}
