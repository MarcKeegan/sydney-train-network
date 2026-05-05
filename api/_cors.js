const DEFAULT_ALLOWED = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:8765',
  'http://127.0.0.1:8765'
];

function allowedOrigins() {
  const env = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return new Set([...DEFAULT_ALLOWED, ...env]);
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allow = allowedOrigins();
  if (origin && allow.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function handlePreflight(req, res) {
  if (req.method !== 'OPTIONS') return false;
  applyCors(req, res);
  res.status(204).end();
  return true;
}

module.exports = { applyCors, handlePreflight };
