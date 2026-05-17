import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

// ── Round scorer overlay ──────────────────────────────────────────────────────

function PlayerInput({ player, value, onChange }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <span className="flex-1 font-semibold text-gray-900">{player.name}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-10 h-10 rounded-xl bg-gray-100 text-xl font-bold text-gray-700 flex items-center justify-center active:scale-90 transition-all"
        >−</button>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          className="w-16 h-10 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-sky-500"
          value={value}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          onFocus={(e) => e.target.select()}
        />
        <button
          onClick={() => onChange(value + 1)}
          className="w-10 h-10 rounded-xl bg-sky-100 text-xl font-bold text-sky-700 flex items-center justify-center active:scale-90 transition-all"
        >+</button>
      </div>
    </div>
  );
}

function RoundScorer({ session, roundNumber, onComplete, onCancel }) {
  const elements = session.elements || [];
  // Steps are elements if defined, otherwise a single freeform step
  const steps = elements.length > 0 ? elements : [{ id: '__free__', name: 'Score', description: null }];

  const [step, setStep] = useState(0);
  const [scores, setScores] = useState(() => {
    const init = {};
    for (const el of steps) {
      init[el.id] = {};
      for (const p of session.players) init[el.id][p.id] = 0;
    }
    return init;
  });

  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const nextEl = steps[step + 1];

  function setScore(elId, playerId, value) {
    setScores((prev) => ({ ...prev, [elId]: { ...prev[elId], [playerId]: value } }));
  }

  function submit() {
    const events = [];
    for (const el of steps) {
      for (const p of session.players) {
        events.push({
          player_id: p.id,
          points: scores[el.id]?.[p.id] ?? 0,
          label: elements.length > 0 ? el.name : null,
        });
      }
    }
    onComplete(events);
  }

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          <div>
            <h2 className="font-bold text-gray-900">Round {roundNumber}</h2>
            <p className="text-xs text-gray-400">{session.game_name}</p>
          </div>
        </div>

        {/* Progress dots */}
        {steps.length > 1 && (
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i < step ? 'bg-sky-500' : i === step ? 'bg-sky-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}
        {steps.length > 1 && (
          <p className="text-xs text-gray-400 mt-1.5 text-right">{step + 1} of {steps.length}</p>
        )}
      </div>

      {/* Category banner */}
      <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto">
        <div className="bg-sky-600 text-white rounded-2xl px-5 py-4">
          <h3 className="text-xl font-bold">{current.name}</h3>
          {current.description && (
            <p className="text-sky-100 text-sm mt-1">{current.description}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {session.players.map((player) => (
            <PlayerInput
              key={player.id}
              player={player}
              value={scores[current.id]?.[player.id] ?? 0}
              onChange={(v) => setScore(current.id, player.id, v)}
            />
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-t border-gray-100 p-4 flex gap-3">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={isFirst}
          className="flex-1 py-4 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl disabled:opacity-40 hover:bg-gray-50 active:scale-95 transition-all"
        >
          Back
        </button>
        {isLast ? (
          <button
            onClick={submit}
            className="flex-[2] py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 active:scale-95 transition-all"
          >
            Submit Round
          </button>
        ) : (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="flex-[2] py-4 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 active:scale-95 transition-all"
          >
            Next: {nextEl?.name}
          </button>
        )}
      </div>
    </div>
  );
}

// ── History grouped by round ──────────────────────────────────────────────────

function RoundHistory({ events, players, batchSize }) {
  if (events.length === 0) return null;

  // Group events into rounds of batchSize
  const rounds = [];
  for (let i = 0; i < events.length; i += batchSize) {
    rounds.push(events.slice(i, i + batchSize));
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Score History</p>
      <div className="flex flex-col gap-2">
        {[...rounds].reverse().map((round, ri) => {
          const roundNum = rounds.length - ri;
          return (
            <div key={ri} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500">Round {roundNum}</span>
              </div>
              {round.map((e) => {
                const player = players.find((p) => p.id === e.player_id);
                return (
                  <div key={e.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-gray-800">{player?.name}</span>
                      {e.label && <span className="text-xs text-gray-400 ml-2">{e.label}</span>}
                    </div>
                    <span className={`text-sm font-bold ml-3 shrink-0 ${
                      e.points > 0 ? 'text-green-600' : e.points < 0 ? 'text-red-500' : 'text-gray-400'
                    }`}>
                      {e.points > 0 ? '+' : ''}{e.points}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LiveScoring() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [scoring, setScoring] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    api.getSession(id).then((s) => {
      setSession(s);
      setEvents(s.score_events || []);
    });
  }, [id]);

  function totalFor(playerId) {
    return events
      .filter((e) => e.player_id === playerId)
      .reduce((sum, e) => sum + e.points, 0);
  }

  async function handleRoundComplete(roundEvents) {
    setScoring(false);
    // Optimistic update
    const tempEvents = roundEvents.map((e, i) => ({
      ...e, id: `temp-${Date.now()}-${i}`, created_at: new Date().toISOString(),
    }));
    setEvents((prev) => [...prev, ...tempEvents]);
    // Persist all events and replace temps with real IDs
    const saved = await Promise.all(roundEvents.map((e) => api.addScoreEvent(id, e)));
    setEvents((prev) => {
      const updated = [...prev];
      tempEvents.forEach((temp, i) => {
        const idx = updated.findIndex((e) => e.id === temp.id);
        if (idx !== -1) updated[idx] = saved[i];
      });
      return updated;
    });
  }

  async function endGame() {
    setEnding(true);
    await api.completeSession(id);
    navigate(`/session/${id}/results`);
  }

  if (!session) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const elements = session.elements || [];
  const batchSize = (elements.length > 0 ? elements.length : 1) * session.players.length;
  const roundsCompleted = Math.floor(events.length / batchSize);
  const nextRound = roundsCompleted + 1;

  const ranked = [...session.players].sort((a, b) => totalFor(b.id) - totalFor(a.id));
  const leaderTotal = totalFor(ranked[0].id);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{session.game_name}</h1>
            <p className="text-xs text-gray-400 truncate">
              {session.players.map((p) => p.name).join(' · ')}
              {roundsCompleted > 0 && ` · ${roundsCompleted} round${roundsCompleted !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={endGame}
            disabled={ending}
            className="shrink-0 px-4 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 active:scale-95 disabled:opacity-60 transition-all"
          >
            {ending ? 'Saving…' : 'End Game'}
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 pb-24 flex flex-col gap-4">
        {/* Scoreboard */}
        <div className="grid grid-cols-2 gap-3">
          {ranked.map((player, rank) => {
            const total = totalFor(player.id);
            const isLeader = rank === 0 && total > 0;
            const pct = leaderTotal > 0 ? (total / leaderTotal) * 100 : 0;
            return (
              <div
                key={player.id}
                className={`bg-white rounded-2xl p-4 border-2 shadow-sm ${isLeader ? 'border-yellow-300' : 'border-gray-100'}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-bold text-gray-400">#{rank + 1}</span>
                  {isLeader && <span className="text-sm">👑</span>}
                </div>
                <p className="font-bold text-gray-900 truncate text-sm">{player.name}</p>
                <p className="text-3xl font-black text-gray-900 my-1">{total}</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isLeader ? 'bg-yellow-400' : 'bg-sky-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl mb-3">🎲</p>
            <p className="text-gray-500 font-medium">No rounds scored yet</p>
            <p className="text-sm text-gray-400 mt-1">Tap the button below to score the first round</p>
          </div>
        ) : (
          <RoundHistory events={events} players={session.players} batchSize={batchSize} />
        )}
      </div>

      {/* Score round button */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-gray-100 max-w-lg mx-auto">
        <button
          onClick={() => setScoring(true)}
          className="w-full py-4 bg-sky-600 text-white text-lg font-bold rounded-xl hover:bg-sky-700 active:scale-95 transition-all shadow-lg"
        >
          Score Round {nextRound}
        </button>
      </div>

      {scoring && (
        <RoundScorer
          session={session}
          roundNumber={nextRound}
          onComplete={handleRoundComplete}
          onCancel={() => setScoring(false)}
        />
      )}
    </div>
  );
}
