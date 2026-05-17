const express = require('express');
const cors = require('cors');
const { init } = require('./db/database');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/games', require('./routes/games'));
app.use('/players', require('./routes/players'));
app.use('/sessions', require('./routes/sessions'));

app.get('/health', (req, res) => res.json({ ok: true }));

async function start() {
  await init();
  if (require.main === module) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
  }
}

start().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;
