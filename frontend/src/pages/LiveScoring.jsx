import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

const PALETTE = [
  { hex: '#0284c7', light: '#e0f2fe' },
  { hex: '#e11d48', light: '#ffe4e6' },
  { hex: '#059669', light: '#d1fae5' },
  { hex: '#d97706', light: '#fef3c7' },
  { hex: '#7c3aed', light: '#ede9fe' },
  { hex: '#ea580c', light: '#ffedd5' },
];

// ── Round scorer overlay ──────────────────────────────────────────────────────

function RoundScorer({ session, roundNumber, onComplete, onCancel }) {
  const elements = session.elements?.length > 0
    ? session.elements
    : [{ id: '__free__', name: 'Score', description: null }];
  const players = session.players;

  const colorMap = Object.fromEntries(
    players.map((p, i) => [p.id, PALETTE[i % PALETTE.length]])
  );

  const totalSteps = elements.length * players.length;
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState(() => {
    const init = {};
    for (const el of elements) {
      init[el.id] = {};
      for (const p of players) init[el.id][p.id] = 0;
    }
    return init;
  });
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [step]);

  const element = elements[Math.floor(step / players.length)];
  const player = players[step % players.length];
  const isLast = step === totalSteps - 1;
  const color = colorMap[player.id];
  const currentValue = scores[element.id]?.[player.id] ?? 0;

  function setScore(value) {
    setScores((prev) => ({
      ...prev,
      [element.id]: { ...prev[element.id], [player.id]: value },
    }));
  }

  function advance() {
    isLast ? submit() : setStep((s) => s + 1);
  }

  function submit() {
    const events = [];
    for (const el of elements) {
      for (const p of players) {
        events.push({
          player_id: p.id,
          points: scores[el.id]?.[p.id] ?? 0,
          label: session.elements?.length > 0 ? el.name : null,
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
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900">Round {roundNumber}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              {players.map((p) => (
                <span key={p.id} className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: colorMap[p.id].hex }} />
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / totalSteps) * 100}%`, backgroundColor: color.hex }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">{step + 1} of {totalSteps}</p>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 flex flex-col gap-5 overflow-y-auto">
        {/* Prompt */}
        <div className="text-center pt-4">
          <h2 className="text-4xl font-bold text-gray-900 mb-1">{element.name}</h2>
          {element.description && (
            <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">{element.description}</p>
          )}
          <div
            className="inline-block mt-3 px-5 py-2 rounded-xl text-white font-semibold text-base"
            style={{ backgroundColor: color.hex }}
          >
            Enter {player.name}'s score
          </div>
        </div>

        {/* Big number input */}
        <div className="flex items-center justify-center gap-4 py-2">
          <button
            onClick={() => setScore(Math.max(0, currentValue - 1))}
            className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-700 text-2xl font-bold flex items-center justify-center active:scale-90 transition-all"
          >−</button>
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min="0"
            className="w-28 h-20 text-center text-4xl font-bold border-2 rounded-2xl focus:outline-none bg-white"
            style={{ borderColor: color.hex }}
            value={currentValue}
            onChange={(e) => setScore(Math.max(0, parseInt(e.target.value) || 0))}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); advance(); } }}
          />
          <button
            onClick={() => setScore(currentValue + 1)}
            className="w-14 h-14 rounded-2xl text-2xl font-bold flex items-center justify-center active:scale-90 transition-all"
            style={{ backgroundColor: color.light, color: color.hex }}
          >+</button>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="flex-1 py-4 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl disabled:opacity-40 hover:bg-gray-50 active:scale-95 transition-all"
          >Back</button>
          {isLast ? (
            <button
              onClick={submit}
              className="flex-[2] py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 active:scale-95 transition-all"
            >Submit Round</button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex-[2] py-4 text-white font-bold rounded-xl active:scale-95 transition-all"
              style={{ backgroundColor: color.hex }}
            >Next</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── History grouped by round ──────────────────────────────────────────────────

function RoundHistory({ events, players, colorMap, batchSize }) {
  if (events.length === 0) return null;

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
                const color = colorMap[e.player_id];
                return (
                  <div key={e.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color?.hex }} />
                      <span className="text-sm font-semibold text-gray-800">{player?.name}</span>
                      {e.label && <span className="text-xs text-gray-400">{e.label}</span>}
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

  if (!session) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const colorMap = Object.fromEntries(
    session.players.map((p, i) => [p.id, PALETTE[i % PALETTE.length]])
  );

  function totalFor(playerId) {
    return events.filter((e) => e.player_id === playerId).reduce((sum, e) => sum + e.points, 0);
  }

  async function handleRoundComplete(roundEvents) {
    setScoring(false);
    const tempEvents = roundEvents.map((e, i) => ({
      ...e, id: `temp-${Date.now()}-${i}`, created_at: new Date().toISOString(),
    }));
    setEvents((prev) => [...prev, ...tempEvents]);
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

  const elements = session.elements?.length > 0 ? session.elements : [{ id: '__free__' }];
  const batchSize = elements.length * session.players.length;
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
            {ending ? 'Saving…' : 'Finish Scoring'}
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
            const color = colorMap[player.id];
            return (
              <div
                key={player.id}
                className="bg-white rounded-2xl p-4 border-2 shadow-sm"
                style={{ borderColor: isLeader ? '#fcd34d' : color.hex + '40' }}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-bold text-gray-400">#{rank + 1}</span>
                  {isLeader && <span className="text-sm">👑</span>}
                </div>
                <p className="font-bold text-gray-900 truncate text-sm">{player.name}</p>
                <p className="text-3xl font-black my-1" style={{ color: color.hex }}>{total}</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color.hex }}
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
          <RoundHistory events={events} players={session.players} colorMap={colorMap} batchSize={batchSize} />
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
