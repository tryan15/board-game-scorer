<?php

namespace App\Http\Controllers;

use App\Models\Game;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Game::orderBy('name')->get());
    }

    public function show(int $id): JsonResponse
    {
        $game = Game::with('elements')->findOrFail($id);
        return response()->json($game);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string']);

        $game = Game::create([
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

        return response()->json($game->load('elements'), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $game = Game::findOrFail($id);

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

        return response()->json($game->load('elements'));
    }

    public function destroy(int $id): JsonResponse
    {
        Game::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }
}
