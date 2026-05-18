import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

const PALETTE = [
  { hex: '#0284c7', light: '#e0f2fe' }, // sky
  { hex: '#e11d48', light: '#ffe4e6' }, // rose
  { hex: '#059669', light: '#d1fae5' }, // emerald
  { hex: '#d97706', light: '#fef3c7' }, // amber
  { hex: '#7c3aed', light: '#ede9fe' }, // violet
  { hex: '#ea580c', light: '#ffedd5' }, // orange
];

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

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [step]);

  if (!session) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Assign a stable color to each player by their position in the array
  const colorMap = Object.fromEntries(
    session.players.map((p, i) => [p.id, PALETTE[i % PALETTE.length]])
  );

  const totalSteps = session.elements.length * session.players.length;
  const element = session.elements[Math.floor(step / session.players.length)];
  const player = session.players[step % session.players.length];
  const isLast = step === totalSteps - 1;
  const currentValue = scores[element?.id]?.[player?.id] ?? 0;
  const color = colorMap[player.id];

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
            {/* Player color dots */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {session.players.map((p) => (
                <span key={p.id} className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: colorMap[p.id].hex }} />
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar in current player's color */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / totalSteps) * 100}%`, backgroundColor: color.hex }}
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
          <h2 className="text-4xl font-bold text-gray-900 mb-1">{element.name}</h2>
          {element.description && (
            <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">{element.description}</p>
          )}
          <div className="inline-block mt-3 px-5 py-2 rounded-xl text-white font-semibold text-base" style={{ backgroundColor: color.hex }}>
            Enter {player.name}'s score
          </div>
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
            className="w-28 h-20 text-center text-4xl font-bold border-2 rounded-2xl focus:outline-none bg-white transition-colors"
            style={{ borderColor: color.hex }}
            value={currentValue}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setScore(isNaN(v) ? 0 : Math.max(0, v));
            }}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                isLast ? saveAndFinish() : setStep((s) => s + 1);
              }
            }}
          />
          <button
            onClick={() => setScore(currentValue + 1)}
            className="w-14 h-14 rounded-2xl text-2xl font-bold flex items-center justify-center active:scale-90 transition-all"
            style={{ backgroundColor: color.light, color: color.hex }}
          >
            +
          </button>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
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
              className="flex-[2] py-4 text-white font-bold rounded-xl active:scale-95 transition-all"
              style={{ backgroundColor: color.hex }}
            >
              Next
            </button>
          )}
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
                const c = colorMap[p.id];
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                    <span
                      className="text-sm w-24 truncate"
                      style={{ fontWeight: isCurrent ? 700 : 500, color: isCurrent ? c.hex : '#1f2937' }}
                    >
                      {p.name}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(total / max) * 100}%`, backgroundColor: c.hex, opacity: isCurrent ? 1 : 0.45 }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-8 text-right">{total}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

    </div>
  );
}
