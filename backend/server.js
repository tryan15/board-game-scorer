const express = require('express');
const cors = require('cors');
const { init } = require('./db/database');

const app = express();

app.use(cors());
app.use(express.json());

// In serverless, module load and first request race. Cache the init promise
// so all requests wait for the same initialization, not duplicate it.
let _initPromise = null;
app.use((req, res, next) => {
  if (!_initPromise) _initPromise = init();
  _initPromise.then(next).catch((e) =>
    res.status(500).json({ error: 'DB init failed: ' + e.message })
  );
});

// Mount at both prefixes: experimentalServices may or may not strip /api before forwarding
const games = require('./routes/games');
const players = require('./routes/players');
const sessions = require('./routes/sessions');

app.use('/api/games', games);
app.use('/api/players', players);
app.use('/api/sessions', sessions);
app.use('/games', games);
app.use('/players', players);
app.use('/sessions', sessions);

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/health', (req, res) => res.json({ ok: true }));

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  init()
    .then(() => app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`)))
    .catch((err) => { console.error('Failed to initialize database:', err); process.exit(1); });
}

module.exports = app;
