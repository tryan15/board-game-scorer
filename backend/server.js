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

app.use('/api/games', require('./routes/games'));
app.use('/api/players', require('./routes/players'));
app.use('/api/sessions', require('./routes/sessions'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  init()
    .then(() => app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`)))
    .catch((err) => { console.error('Failed to initialize database:', err); process.exit(1); });
}

module.exports = app;
