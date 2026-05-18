<?php

namespace App\Http\Controllers;

use App\Models\GameSession;
use App\Models\Score;
use App\Models\ScoreEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function index(): JsonResponse
    {
        $sessions = GameSession::with(['game', 'players'])
            ->where('user_id', auth()->id())
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn($s) => $this->sessionSummary($s));

        return response()->json($sessions);
    }

    public function show(int $id): JsonResponse
    {
        $session = GameSession::with(['game', 'players', 'scores', 'scoreEvents'])
            ->where('user_id', auth()->id())
            ->findOrFail($id);

        return response()->json($this->sessionDetail($session));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'game_id'    => 'required|integer',
            'player_ids' => 'required|array|min:1',
        ]);

        $session = GameSession::create([
            'user_id' => auth()->id(),
            'game_id' => $request->game_id,
        ]);

        foreach ($request->player_ids as $i => $playerId) {
            $session->players()->attach($playerId, ['sort_order' => $i]);
        }

        return response()->json($this->sessionSummary($session->load(['game', 'players'])), 201);
    }

    public function addScores(Request $request, int $id): JsonResponse
    {
        $session = GameSession::where('user_id', auth()->id())->findOrFail($id);

        $rows = collect($request->input('scores', []))->map(fn($s) => [
            'session_id' => $session->id,
            'player_id'  => $s['player_id'],
            'element_id' => $s['element_id'],
            'value'      => $s['value'],
        ])->all();

        if ($rows) {
            Score::upsert($rows, ['session_id', 'player_id', 'element_id'], ['value']);
        }

        if ($request->boolean('completed')) {
            $session->update(['completed' => true]);
        }

        return response()->json(['success' => true]);
    }

    public function addEvent(Request $request, int $id): JsonResponse
    {
        $request->validate(['player_id' => 'required', 'points' => 'required|numeric']);

        $session = GameSession::where('user_id', auth()->id())->findOrFail($id);

        $event = ScoreEvent::create([
            'session_id' => $session->id,
            'player_id'  => $request->player_id,
            'points'     => $request->points,
            'label'      => $request->label,
        ]);

        return response()->json($event, 201);
    }

    public function complete(int $id): JsonResponse
    {
        GameSession::where('user_id', auth()->id())->findOrFail($id)->update(['completed' => true]);
        return response()->json(['success' => true]);
    }

    public function destroy(int $id): JsonResponse
    {
        GameSession::where('user_id', auth()->id())->findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }

    private function sessionSummary(GameSession $session): array
    {
        return [
            'id'           => $session->id,
            'game_id'      => $session->game_id,
            'completed'    => $session->completed,
            'created_at'   => $session->created_at,
            'game_name'    => $session->game->name,
            'scoring_type' => $session->game->scoring_type,
            'players'      => $session->players->map(fn($p) => [
                'id'         => $p->id,
                'name'       => $p->name,
                'sort_order' => $p->pivot->sort_order,
            ]),
        ];
    }

    private function sessionDetail(GameSession $session): array
    {
        return array_merge($this->sessionSummary($session), [
            'elements'     => $session->game->elements,
            'scores'       => $session->scores,
            'score_events' => $session->scoreEvents,
        ]);
    }
}
