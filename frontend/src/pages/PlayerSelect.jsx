import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

export default function PlayerSelect() {
  const { id: gameId } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getGame(gameId), api.getPlayers()]).then(([g, p]) => {
      setGame(g);
      setAllPlayers(p); // already ordered by last_used from backend
    });
  }, [gameId]);

  function togglePlayer(player) {
    setSelected((prev) =>
      prev.find((p) => p.id === player.id)
        ? prev.filter((p) => p.id !== player.id)
        : [...prev, player]
    );
  }

  async function addPlayer() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const player = await api.createPlayer(newName.trim());
      setAllPlayers((prev) => [player, ...prev]);
      setSelected((prev) => [...prev, player]);
      setNewName('');
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function startSession() {
    if (selected.length === 0) return setError('Select at least one player');
    setStarting(true);
    try {
      const session = await api.createSession({
        game_id: Number(gameId),
        player_ids: selected.map((p) => p.id),
      });
      // Route based on game scoring mode
      if (game.scoring_type === 'ingame') {
        navigate(`/session/${session.id}/live`);
      } else {
        navigate(`/session/${session.id}`);
      }
    } catch (e) {
      setError(e.message);
      setStarting(false);
    }
  }

  if (!game) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const recentPlayers = allPlayers.filter((p) => p.last_used);
  const newPlayers = allPlayers.filter((p) => !p.last_used);

  return (
    <div className="p-4">
      <header className="flex items-center gap-3 mb-6 pt-2">
        <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Who's Playing?</h1>
          <p className="text-sm text-gray-500">{game.name}</p>
        </div>
      </header>

      {/* Add new player */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Add New Player</label>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Player name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
          />
          <button
            onClick={addPlayer}
            disabled={creating || !newName.trim()}
            className="px-5 py-3 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-700 active:scale-95 disabled:opacity-60 transition-all"
          >
            Add
          </button>
        </div>
      </div>

      {/* Player list */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Players <span className="text-gray-400 font-normal">({selected.length} selected)</span>
        </label>

        {allPlayers.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Add players above to get started.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentPlayers.length > 0 && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Recent</p>
            )}
            {recentPlayers.map((player) => <PlayerRow key={player.id} player={player} selected={selected} onToggle={togglePlayer} />)}

            {newPlayers.length > 0 && recentPlayers.length > 0 && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mt-1">Other Players</p>
            )}
            {newPlayers.map((player) => <PlayerRow key={player.id} player={player} selected={selected} onToggle={togglePlayer} />)}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}

      <button
        onClick={startSession}
        disabled={starting || selected.length === 0}
        className="w-full py-4 bg-sky-600 text-white font-bold text-lg rounded-xl hover:bg-sky-700 active:scale-95 disabled:opacity-60 transition-all"
      >
        {starting ? 'Starting…' : `Start Scoring with ${selected.length} Player${selected.length !== 1 ? 's' : ''}`}
      </button>
    </div>
  );
}

function PlayerRow({ player, selected, onToggle }) {
  const isSelected = selected.some((p) => p.id === player.id);
  const rank = selected.findIndex((p) => p.id === player.id);
  return (
    <button
      onClick={() => onToggle(player)}
      className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all active:scale-95 ${
        isSelected ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-gray-200 bg-white text-gray-800'
      }`}
    >
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
        isSelected ? 'border-sky-500 bg-sky-500' : 'border-gray-300'
      }`}>
        {isSelected && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </div>
      <span className="font-medium flex-1">{player.name}</span>
      {isSelected && (
        <span className="text-xs text-sky-600 font-medium">#{rank + 1}</span>
      )}
    </button>
  );
}
