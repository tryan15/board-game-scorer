import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

function AddScoreSheet({ session, onAdd, onClose }) {
  const [step, setStep] = useState('player'); // 'player' | 'amount'
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [amount, setAmount] = useState(1);
  const inputRef = useRef(null);

  function pickPlayer(player) {
    setSelectedPlayer(player);
    // If a fixed-value category was pre-selected, skip straight to confirm
    if (selectedCategory?.point_value != null) {
      setAmount(selectedCategory.point_value);
      setStep('amount');
    } else {
      setStep('amount');
    }
  }

  function pickCategory(el) {
    setSelectedCategory(el);
    if (el.point_value != null) setAmount(el.point_value);
  }

  useEffect(() => {
    if (step === 'amount') inputRef.current?.select();
  }, [step]);

  function confirm() {
    if (!selectedPlayer || amount === 0) return;
    onAdd({
      player_id: selectedPlayer.id,
      points: amount,
      label: selectedCategory?.name || null,
    });
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl z-50 p-5 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {step === 'player' && (
          <>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Who scored?</h3>
            <div className="flex flex-col gap-2">
              {session.players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pickPlayer(p)}
                  className="py-4 px-5 border-2 border-gray-200 rounded-xl font-semibold text-gray-800 text-left hover:border-sky-400 hover:bg-sky-50 active:scale-95 transition-all"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'amount' && selectedPlayer && (
          <>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Add points for {selectedPlayer.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {selectedCategory ? `Category: ${selectedCategory.name}` : 'No category selected'}
            </p>

            {/* Category chips */}
            {session.elements?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {session.elements.map((el) => (
                  <button
                    key={el.id}
                    onClick={() => pickCategory(el)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all active:scale-95 ${
                      selectedCategory?.id === el.id
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {el.name}{el.point_value != null ? ` (${el.point_value})` : ''}
                  </button>
                ))}
                {selectedCategory && (
                  <button
                    onClick={() => { setSelectedCategory(null); setAmount(1); }}
                    className="px-3 py-1.5 rounded-xl text-sm font-medium border-2 border-dashed border-gray-200 text-gray-400"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Amount stepper */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setAmount((a) => a - 1)}
                className="w-14 h-14 rounded-2xl bg-gray-100 text-3xl font-bold text-gray-700 flex items-center justify-center active:scale-90 transition-all"
              >−</button>
              <input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                className="w-24 h-14 text-center text-3xl font-black border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-sky-500"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={() => setAmount((a) => a + 1)}
                className="w-14 h-14 rounded-2xl bg-sky-100 text-3xl font-bold text-sky-700 flex items-center justify-center active:scale-90 transition-all"
              >+</button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('player')}
                className="flex-1 py-4 border-2 border-gray-200 rounded-xl font-semibold text-gray-700"
              >
                Back
              </button>
              <button
                onClick={confirm}
                className="flex-[2] py-4 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 active:scale-95 transition-all"
              >
                +{amount} to {selectedPlayer.name}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function LiveScoring() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [showSheet, setShowSheet] = useState(false);
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

  async function handleAdd(eventData) {
    // Optimistic update
    const tempEvent = { ...eventData, id: `temp-${Date.now()}`, created_at: new Date().toISOString() };
    setEvents((prev) => [...prev, tempEvent]);
    // Persist and replace temp event with real one
    const saved = await api.addScoreEvent(id, eventData);
    setEvents((prev) => prev.map((e) => (e.id === tempEvent.id ? saved : e)));
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

  const ranked = [...session.players].sort((a, b) => totalFor(b.id) - totalFor(a.id));
  const recentEvents = [...events].reverse().slice(0, 20);
  const leader = ranked[0];
  const leaderTotal = totalFor(leader.id);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{session.game_name}</h1>
            <p className="text-xs text-gray-400 truncate">
              {session.players.map((p) => p.name).join(' · ')}
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
        {/* Scoreboard grid */}
        <div className="grid grid-cols-2 gap-3">
          {ranked.map((player, rank) => {
            const total = totalFor(player.id);
            const isLeader = rank === 0 && total > 0;
            const pct = leaderTotal > 0 ? (total / leaderTotal) * 100 : 0;

            return (
              <div
                key={player.id}
                className={`bg-white rounded-2xl p-4 border-2 shadow-sm ${
                  isLeader ? 'border-yellow-300' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-bold text-gray-400">#{rank + 1}</span>
                  {isLeader && <span className="text-sm">👑</span>}
                </div>
                <p className="font-bold text-gray-900 truncate text-sm">{player.name}</p>
                <p className="text-3xl font-black text-gray-900 my-1">{total}</p>
                {/* Mini progress bar */}
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

        {/* Recent events */}
        {recentEvents.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Score History</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
              {recentEvents.map((e) => {
                const player = session.players.find((p) => p.id === e.player_id);
                return (
                  <div key={e.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-gray-800">{player?.name}</span>
                      {e.label && (
                        <span className="text-xs text-gray-400 ml-2">{e.label}</span>
                      )}
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
          </div>
        )}

        {events.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl mb-3">🎲</p>
            <p className="text-gray-500 font-medium">No scores yet</p>
            <p className="text-sm text-gray-400 mt-1">Tap the button below to add the first score</p>
          </div>
        )}
      </div>

      {/* Fixed add button */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-gray-100 max-w-lg mx-auto">
        <button
          onClick={() => setShowSheet(true)}
          className="w-full py-4 bg-sky-600 text-white text-lg font-bold rounded-xl hover:bg-sky-700 active:scale-95 transition-all shadow-lg"
        >
          + Add Score
        </button>
      </div>

      {showSheet && (
        <AddScoreSheet
          session={session}
          onAdd={handleAdd}
          onClose={() => setShowSheet(false)}
        />
      )}
    </div>
  );
}
