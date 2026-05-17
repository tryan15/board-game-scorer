# Board Game Scorer

Mobile-responsive score keeping app for board games.

## Setup

### 1. Install Node.js
Download and install from https://nodejs.org (LTS version recommended).

### 2. Install and start the backend
```
cd backend
npm install
npm run dev
```
The API will run on http://localhost:3001

### 3. Install and start the frontend (new terminal)
```
cd frontend
npm install
npm run dev
```
The app will open at http://localhost:5173

## Features

- **Wingspan** pre-loaded with all 6 scoring categories
- **Custom game builder** — create scoring pads for any game
- **Step-by-step scoring** — walks you through each element with +/− buttons
- **Running totals** with a live leaderboard bar chart during scoring
- **Results screen** with winner banner, full breakdown table, and Play Again
- **Session history** saved to SQLite — persists across restarts
- **Mobile first** — designed for phones, works on desktop too

## Adding More Games

Click **+ New Game** in the app (or the nav bar) and define:
- Game name and description
- Each scoring element in order (name + optional description/rule)

You can edit or delete games from the home screen.
