import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

function PlayerScoreInput({ player, value, onChange }) {
  const ref = useRef(null);

  useEffect(() => {
    // Auto-select value when element focused for quick re-entry
    ref.current?.select();
  }, []);

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex-1">
        <p className="font-semibold text-gray-900">{player.name}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 text-xl font-bold flex items-center justify-center active:scale-90 transition-all"
        >
          −
        </button>
        <input
          ref={ref}
          type="number"
          inputMode="numeric"
          min="0"
          className="w-16 h-10 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-sky-500"
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            onChange(isNaN(v) ? 0 : Math.max(0, v));
          }}
          onFocus={(e) => e.target.select()}
        />
        <button
          onClick={() => onChange(value + 1)}
          className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 text-xl font-bold flex items-center justify-center active:scale-90 transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function ScoringSession() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState({}); // { elementId: { playerId: value } }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSession(id).then((s) => {
      setSession(s);
      // Pre-populate from existing scores
      const initial = {};
      for (const el of s.elements) {
        initial[el.id] = {};
        for (const p of s.players) {
          const existing = s.scores.find(
            (sc) => sc.element_id === el.id && sc.player_id === p.id
          );
          initial[el.id][p.id] = existing ? existing.value : 0;
        }
      }
      setScores(initial);
    });
  }, [id]);

  function setScore(elementId, playerId, value) {
    setScores((prev) => ({
      ...prev,
      [elementId]: { ...prev[elementId], [playerId]: value },
    }));
  }

  function totals() {
    if (!session) return {};
    const result = {};
    for (const p of session.players) {
      result[p.id] = Object.values(scores).reduce((sum, byPlayer) => {
        return sum + (byPlayer[p.id] ?? 0);
      }, 0);
    }
    return result;
  }

  async function saveAndFinish() {
    setSaving(true);
    const flat = [];
    for (const [elId, byPlayer] of Object.entries(scores)) {
      for (const [pId, value] of Object.entries(byPlayer)) {
        flat.push({ element_id: Number(elId), player_id: Number(pId), value });
      }
    }
    await api.saveScores(id, { scores: flat, completed: true });
    navigate(`/session/${id}/results`);
  }

  async function saveDraft() {
    const flat = [];
    for (const [elId, byPlayer] of Object.entries(scores)) {
      for (const [pId, value] of Object.entries(byPlayer)) {
        flat.push({ element_id: Number(elId), player_id: Number(pId), value });
      }
    }
    await api.saveScores(id, { scores: flat, completed: false });
  }

  if (!session) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const element = session.elements[step];
  const playerTotals = totals();
  const isLast = step === session.elements.length - 1;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => { saveDraft(); navigate('/'); }}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{session.game_name}</h1>
            <p className="text-xs text-gray-500">
              {session.players.map((p) => p.name).join(', ')}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1">
          {session.elements.map((el, i) => (
            <button
              key={el.id}
              onClick={() => setStep(i)}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i < step ? 'bg-sky-500' : i === step ? 'bg-sky-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">
          {step + 1} of {session.elements.length}
        </p>
      </div>

      {/* Scoring element */}
      <div className="flex-1 p-4 flex flex-col gap-4">
        <div className="bg-sky-600 text-white rounded-2xl px-5 py-4">
          <h2 className="text-xl font-bold">{element.name}</h2>
          {element.description && (
            <p className="text-sky-100 text-sm mt-1">{element.description}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {session.players.map((player) => (
            <PlayerScoreInput
              key={player.id}
              player={player}
              value={scores[element.id]?.[player.id] ?? 0}
              onChange={(v) => setScore(element.id, player.id, v)}
            />
          ))}
        </div>

        {/* Running totals */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Running Totals</h3>
          <div className="flex flex-col gap-2">
            {[...session.players]
              .sort((a, b) => (playerTotals[b.id] ?? 0) - (playerTotals[a.id] ?? 0))
              .map((player, rank) => {
                const total = playerTotals[player.id] ?? 0;
                const max = Math.max(...Object.values(playerTotals), 1);
                return (
                  <div key={player.id} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-4 ${rank === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
                      {rank + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-800 w-24 truncate">{player.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${rank === 0 ? 'bg-yellow-400' : 'bg-sky-300'}`}
                        style={{ width: `${(total / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-8 text-right">{total}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-3">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="flex-1 py-4 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 active:scale-95 disabled:opacity-40 transition-all"
        >
          Back
        </button>
        {isLast ? (
          <button
            onClick={saveAndFinish}
            disabled={saving}
            className="flex-2 flex-[2] py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 active:scale-95 disabled:opacity-60 transition-all"
          >
            {saving ? 'Saving…' : 'Finish & See Results'}
          </button>
        ) : (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="flex-2 flex-[2] py-4 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 active:scale-95 transition-all"
          >
            Next: {session.elements[step + 1]?.name}
          </button>
        )}
      </div>
    </div>
  );
}
