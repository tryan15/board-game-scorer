# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

Two servers must run concurrently. On Windows, use PowerShell and prefix commands with `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH` if `node`/`npm` aren't found.

```powershell
# Terminal 1 — backend (port 3001)
cd backend
npm install
npm run dev        # nodemon with auto-reload
# or: node server.js

# Terminal 2 — frontend (port 5173)
cd frontend
npm install
npm run dev
```

There are no tests and no lint step configured.

## Architecture

**Backend** (`backend/`) — CommonJS Node.js + Express + Turso (`@libsql/client`). All routes are mounted with the `/api` prefix in `server.js` (e.g. `/api/games`). `require.main === module` guards the `app.listen()` call so the file can be exported as a Vercel serverless function without starting a local server.

- `db/database.js` — creates the Turso client (falls back to `file:local.db` when `TURSO_DATABASE_URL` is unset), runs `CREATE TABLE IF NOT EXISTS` for all tables on startup, seeds Wingspan and Pinochle on first run.
- `routes/games.js`, `routes/players.js`, `routes/sessions.js` — REST handlers. Transactions use `db.transaction('write')` from `@libsql/client`. `lastInsertRowid` is wrapped with `Number()` because Turso returns it as a BigInt.

**Frontend** (`frontend/`) — React 18 + Vite. Tailwind CSS is loaded via CDN in `index.html` (no PostCSS build step). All API calls go through `src/api.js`, which proxies `/api/*` to `localhost:3001` via Vite's dev server proxy.

## Data Model

```
games           — name, description, scoring_type ('endgame' | 'ingame')
scoring_elements — game_id, name, description, point_value (nullable), sort_order
players         — name (unique); ordered by last_used in GET /players
sessions        — game_id, completed (0|1)
session_players — session_id, player_id, sort_order
scores          — session_id, player_id, element_id, value  ← end-game mode
score_events    — session_id, player_id, points, label, created_at  ← in-game mode
```

## Scoring Modes

Games have two mutually exclusive scoring flows:

**`endgame`** — After selecting players, the user is routed to `/session/:id` (`ScoringSession.jsx`). They step through each `scoring_element` one at a time, entering a value per player. On finish, scores are written to the `scores` table.

**`ingame`** — After selecting players, the user is routed to `/session/:id/live` (`LiveScoring.jsx`). A live scoreboard is shown; each tap of "+ Add Score" writes a row to `score_events`. `PlayerSelect.jsx` reads `game.scoring_type` after session creation to decide which route to navigate to.

`Results.jsx` handles both: it checks `session.scoring_type` and either sums `scores` (by element) or `score_events` (by player) to compute totals.

## Key Conventions

- `GET /api/sessions/:id` always returns both `scores` and `score_events` arrays (one will be empty depending on mode), plus `scoring_type` from the joined game row.
- `GET /api/players` returns players ordered by `MAX(sessions.created_at) DESC` so recently-used players appear first in the player picker.
- Frontend uses no state management library — all state is local `useState` per page component. Data is fetched on mount with `useEffect`.
- The bottom nav hides itself during active scoring sessions (`/session/:id` and `/session/:id/live`) but reappears on the results screen.
