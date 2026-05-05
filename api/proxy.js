const API_BASE = 'https://api.transport.nsw.gov.au';
const API_KEY = process.env.NSW_API_KEY;

module.exports = async (req, res) => {
  const path = req.query.path || req.url.replace(/^\/api\//, '');
  if (!path) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Missing path parameter' }));
    return;
  }
  const target = API_BASE + '/' + path + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');

  if (!API_KEY) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'NSW_API_KEY env var not configured' }));
    return;
  }

  try {
    const url = new URL(target, API_BASE);
    const response = await fetch(url, {
      headers: { 'Authorization': `apikey ${API_KEY}` }
    });
    const data = await response.text();
    res.statusCode = response.status;
    const ct = response.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', ct);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(data);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  }
};
