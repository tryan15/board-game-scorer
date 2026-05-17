import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api';

const MEDALS = ['🥇', '🥈', '🥉'];

function EndgameResults({ session }) {
  function scoreFor(playerId, elementId) {
    return session.scores.find(
      (s) => s.player_id === playerId && s.element_id === elementId
    )?.value ?? 0;
  }

  function totalFor(playerId) {
    return session.elements.reduce((sum, el) => sum + scoreFor(playerId, el.id), 0);
  }

  const ranked = [...session.players].sort((a, b) => totalFor(b.id) - totalFor(a.id));

  return (
    <>
      {/* Ranked breakdown cards */}
      <div className="flex flex-col gap-3 mb-6">
        {ranked.map((player, rank) => (
          <div
            key={player.id}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
              rank === 0 ? 'border-yellow-200' : 'border-gray-100'
            }`}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-2xl">{MEDALS[rank] ?? `#${rank + 1}`}</span>
              <span className="flex-1 font-bold text-gray-900 text-lg">{player.name}</span>
              <span className="text-2xl font-black text-gray-900">{totalFor(player.id)}</span>
            </div>
            <div className="border-t border-gray-50">
              {session.elements.map((el) => (
                <div key={el.id} className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm text-gray-500">{el.name}</span>
                  <span className="text-sm font-semibold text-gray-800">{scoreFor(player.id, el.id)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800">Score Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Element</th>
                {ranked.map((p) => (
                  <th key={p.id} className="text-center px-3 py-2 text-gray-700 font-semibold">
                    {p.name.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {session.elements.map((el, i) => (
                <tr key={el.id} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                  <td className="px-4 py-2 text-gray-700">{el.name}</td>
                  {ranked.map((p) => {
                    const v = scoreFor(p.id, el.id);
                    const best = Math.max(...ranked.map((x) => scoreFor(x.id, el.id)));
                    return (
                      <td
                        key={p.id}
                        className={`text-center px-3 py-2 font-semibold ${
                          v === best && best > 0 ? 'text-sky-700' : 'text-gray-700'
                        }`}
                      >
                        {v}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-gray-900 text-white">
                <td className="px-4 py-3 font-bold">Total</td>
                {ranked.map((p) => (
                  <td key={p.id} className="text-center px-3 py-3 font-black">{totalFor(p.id)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function IngameResults({ session }) {
  function totalFor(playerId) {
    return (session.score_events || [])
      .filter((e) => e.player_id === playerId)
      .reduce((sum, e) => sum + e.points, 0);
  }

  const ranked = [...session.players].sort((a, b) => totalFor(b.id) - totalFor(a.id));
  const events = [...(session.score_events || [])].reverse();

  return (
    <>
      {/* Player totals */}
      <div className="flex flex-col gap-3 mb-6">
        {ranked.map((player, rank) => (
          <div
            key={player.id}
            className={`bg-white rounded-2xl border shadow-sm flex items-center gap-3 px-4 py-4 ${
              rank === 0 ? 'border-yellow-200' : 'border-gray-100'
            }`}
          >
            <span className="text-2xl">{MEDALS[rank] ?? `#${rank + 1}`}</span>
            <span className="flex-1 font-bold text-gray-900 text-lg">{player.name}</span>
            <span className="text-2xl font-black text-gray-900">{totalFor(player.id)}</span>
          </div>
        ))}
      </div>

      {/* Score history */}
      {events.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800">Score History</h3>
          </div>
          {events.map((e) => {
            const player = session.players.find((p) => p.id === e.player_id);
            return (
              <div key={e.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm font-semibold text-gray-800">{player?.name}</span>
                  {e.label && <span className="text-xs text-gray-400 ml-2">{e.label}</span>}
                </div>
                <span className={`text-sm font-bold ${e.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {e.points > 0 ? '+' : ''}{e.points}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function Results() {
  const { id } = useParams();
  const [session, setSession] = useState(null);

  useEffect(() => {
    api.getSession(id).then(setSession);
  }, [id]);

  if (!session) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isIngame = session.scoring_type === 'ingame';

  function totalFor(playerId) {
    if (isIngame) {
      return (session.score_events || [])
        .filter((e) => e.player_id === playerId)
        .reduce((sum, e) => sum + e.points, 0);
    }
    return session.elements.reduce(
      (sum, el) => sum + (session.scores.find(
        (s) => s.player_id === playerId && s.element_id === el.id
      )?.value ?? 0),
      0
    );
  }

  const ranked = [...session.players].sort((a, b) => totalFor(b.id) - totalFor(a.id));
  const winner = ranked[0];

  return (
    <div className="p-4">
      <header className="mb-6 pt-2">
        <h1 className="text-2xl font-bold text-gray-900">Final Scores</h1>
        <p className="text-sm text-gray-500">{session.game_name}</p>
      </header>

      {/* Winner banner */}
      <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-5 text-center text-white mb-6 shadow-md">
        <p className="text-4xl mb-1">🏆</p>
        <p className="text-2xl font-black">{winner.name}</p>
        <p className="text-yellow-100 text-lg font-semibold">{totalFor(winner.id)} points</p>
      </div>

      {isIngame ? <IngameResults session={session} /> : <EndgameResults session={session} />}

      <div className="flex gap-3">
        <Link
          to={`/games/${session.game_id}/play`}
          className="flex-1 py-4 text-center bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 active:scale-95 transition-all"
        >
          Play Again
        </Link>
        <Link
          to="/"
          className="flex-1 py-4 text-center border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
