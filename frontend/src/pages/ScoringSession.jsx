import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

export default function ScoringSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [session, setSession] = useState(null);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSession(id).then((s) => {
      setSession(s);
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

  // Auto-focus and select the input whenever the step changes
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [step]);

  if (!session) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const totalSteps = session.elements.length * session.players.length;
  const element = session.elements[Math.floor(step / session.players.length)];
  const player = session.players[step % session.players.length];
  const isLast = step === totalSteps - 1;
  const currentValue = scores[element?.id]?.[player?.id] ?? 0;

  function setScore(value) {
    setScores((prev) => ({
      ...prev,
      [element.id]: { ...prev[element.id], [player.id]: value },
    }));
  }

  function playerTotals() {
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

  const totals = playerTotals();

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
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-sky-500 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">
          {step + 1} of {totalSteps}
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 flex flex-col gap-5">
        {/* Prompt */}
        <div className="text-center pt-4">
          <p className="text-sm font-medium text-sky-600 uppercase tracking-wide mb-1">{element.name}</p>
          <h2 className="text-2xl font-bold text-gray-900">
            Enter {player.name}'s score
          </h2>
          {element.description && (
            <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">{element.description}</p>
          )}
        </div>

        {/* Big number input */}
        <div className="flex items-center justify-center gap-4 py-4">
          <button
            onClick={() => setScore(Math.max(0, currentValue - 1))}
            className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-700 text-2xl font-bold flex items-center justify-center active:scale-90 transition-all"
          >
            −
          </button>
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min="0"
            className="w-28 h-20 text-center text-4xl font-bold border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-sky-500 bg-white"
            value={currentValue}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setScore(isNaN(v) ? 0 : Math.max(0, v));
            }}
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={() => setScore(currentValue + 1)}
            className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 text-2xl font-bold flex items-center justify-center active:scale-90 transition-all"
          >
            +
          </button>
        </div>

        {/* Running totals */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Running Totals</h3>
          <div className="flex flex-col gap-2">
            {[...session.players]
              .sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0))
              .map((p, rank) => {
                const total = totals[p.id] ?? 0;
                const max = Math.max(...Object.values(totals), 1);
                const isCurrent = p.id === player.id;
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-4 ${rank === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
                      {rank + 1}
                    </span>
                    <span className={`text-sm font-medium w-24 truncate ${isCurrent ? 'text-sky-700 font-semibold' : 'text-gray-800'}`}>
                      {p.name}
                    </span>
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
            className="flex-[2] py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 active:scale-95 disabled:opacity-60 transition-all"
          >
            {saving ? 'Saving…' : 'Finish & See Results'}
          </button>
        ) : (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="flex-[2] py-4 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 active:scale-95 transition-all"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
