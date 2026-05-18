const BASE = import.meta.env.VITE_API_URL ?? '/api';

function getToken() {
  return localStorage.getItem('auth_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || res.statusText);
  }
  return res.json();
}

export const api = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login:    (data) => request('/auth/login',    { method: 'POST', body: JSON.stringify(data) }),
  logout:   ()     => request('/auth/logout',   { method: 'POST' }),
  me:       ()     => request('/auth/me'),

  getGames:   ()         => request('/games'),
  getGame:    (id)       => request(`/games/${id}`),
  createGame: (data)     => request('/games',     { method: 'POST',   body: JSON.stringify(data) }),
  updateGame: (id, data) => request(`/games/${id}`, { method: 'PUT',  body: JSON.stringify(data) }),
  deleteGame: (id)       => request(`/games/${id}`, { method: 'DELETE' }),

  getPlayers:   ()     => request('/players'),
  createPlayer: (name) => request('/players',     { method: 'POST',   body: JSON.stringify({ name }) }),
  deletePlayer: (id)   => request(`/players/${id}`, { method: 'DELETE' }),

  getSessions:     ()         => request('/sessions'),
  getSession:      (id)       => request(`/sessions/${id}`),
  createSession:   (data)     => request('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  saveScores:      (id, data) => request(`/sessions/${id}/scores`,   { method: 'POST', body: JSON.stringify(data) }),
  addScoreEvent:   (id, data) => request(`/sessions/${id}/events`,   { method: 'POST', body: JSON.stringify(data) }),
  completeSession: (id)       => request(`/sessions/${id}/complete`, { method: 'POST' }),
  deleteSession:   (id)       => request(`/sessions/${id}`, { method: 'DELETE' }),
};
