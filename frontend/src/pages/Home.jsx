import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function GameCard({ game, isOwned, onDelete }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 truncate">{game.name}</h3>
          {game.is_shared && isOwned && (
            <span className="shrink-0 text-xs bg-sky-100 text-sky-700 font-medium px-2 py-0.5 rounded-full">Shared</span>
          )}
        </div>
        {game.description && (
          <p className="text-sm text-gray-500 truncate">{game.description}</p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        {isOwned && (
          <>
            <Link
              to={`/games/${game.id}/edit`}
              className="p-2 rounded-xl text-gray-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897z" />
              </svg>
            </Link>
            <button
              onClick={() => onDelete(game.id)}
              className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </>
        )}
        <Link
          to={`/games/${game.id}/play`}
          className="px-4 py-2 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-700 active:scale-95 transition-all"
        >
          Score
        </Link>
      </div>
    </div>
  );
}

function SessionRow({ session, onDelete }) {
  const total = (player) => {
    return session.scores
      ?.filter((s) => s.player_id === player.id)
      .reduce((sum, s) => sum + s.value, 0) ?? '—';
  };

  const winner = session.players?.reduce((best, p) => {
    const t = total(p);
    return !best || t > total(best) ? p : best;
  }, null);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-semibold text-gray-900">{session.game_name}</span>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(session.created_at).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={() => onDelete(session.id)}
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {winner && (
        <p className="text-sm text-sky-700 font-medium mt-2">
          Winner: {winner.name} ({total(winner)} pts)
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        {session.players?.map((p) => (
          <span key={p.id} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
            {p.name}: {total(p)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const [g, s] = await Promise.all([api.getGames(), api.getSessions()]);
      setGames(g);
      // Attach scores to each session for display
      const detailed = await Promise.all(
        s.slice(0, 10).map((sess) => api.getSession(sess.id))
      );
      setSessions(detailed);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function deleteGame(id) {
    if (!confirm('Delete this score card and all its sessions?')) return;
    await api.deleteGame(id);
    load();
  }

  async function deleteSession(id) {
    await api.deleteSession(id);
    load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-500 font-medium">Could not connect to the server</p>
      <p className="text-sm text-gray-500 mt-1">{error}</p>
      <p className="text-sm text-gray-400 mt-3">Make sure the backend is running on port 3001.</p>
    </div>
  );

  const libraryGames = games.filter(g => g.user_id === null || g.is_shared);
  const myGames = games.filter(g => g.user_id === user?.id && !g.is_shared);

  return (
    <div className="p-4">
      <header className="mb-6 pt-2">
        <h1 className="text-2xl font-bold text-gray-900">Dexter</h1>
        <p className="text-sm text-gray-500 mt-1">Track scores for any score card</p>
      </header>

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Library</h2>
        {libraryGames.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
            <p className="text-gray-400 text-sm">No shared games yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {libraryGames.map((g) => (
              <GameCard key={g.id} game={g} isOwned={g.user_id === user?.id} onDelete={deleteGame} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">My Games</h2>
          <Link to="/games/new" className="text-xs text-sky-600 font-medium">+ New score card</Link>
        </div>
        {myGames.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
            <p className="text-gray-400 text-sm">No private games.</p>
            <Link to="/games/new" className="text-sky-600 text-sm font-medium mt-2 inline-block">
              Create a score card →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {myGames.map((g) => (
              <GameCard key={g.id} game={g} isOwned={true} onDelete={deleteGame} />
            ))}
          </div>
        )}
      </section>

      {sessions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Sessions</h2>
          <div className="flex flex-col gap-3">
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} onDelete={deleteSession} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
