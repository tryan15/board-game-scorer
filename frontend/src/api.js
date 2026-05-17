const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  getGames: () => request('/games'),
  getGame: (id) => request(`/games/${id}`),
  createGame: (data) => request('/games', { method: 'POST', body: JSON.stringify(data) }),
  updateGame: (id, data) => request(`/games/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGame: (id) => request(`/games/${id}`, { method: 'DELETE' }),

  getPlayers: () => request('/players'),
  createPlayer: (name) => request('/players', { method: 'POST', body: JSON.stringify({ name }) }),
  deletePlayer: (id) => request(`/players/${id}`, { method: 'DELETE' }),

  getSessions: () => request('/sessions'),
  getSession: (id) => request(`/sessions/${id}`),
  createSession: (data) => request('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  saveScores: (id, data) => request(`/sessions/${id}/scores`, { method: 'POST', body: JSON.stringify(data) }),
  addScoreEvent: (id, data) => request(`/sessions/${id}/events`, { method: 'POST', body: JSON.stringify(data) }),
  completeSession: (id) => request(`/sessions/${id}/complete`, { method: 'POST' }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
};
