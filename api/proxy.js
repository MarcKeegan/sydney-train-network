const API_BASE = 'https://api.transport.nsw.gov.au';
const API_KEY = process.env.NSW_API_KEY;

module.exports = async (req, res) =&gt; {
  if (!API_KEY) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'NSW_API_KEY env var not configured' }));
    return;
  }
  const originalUrl = req.url || '';
  const target = API_BASE + originalUrl.replace(/^\/api/, '');
  try {
    const response = await fetch(target, { headers: { 'Authorization': `apikey ${API_KEY}` } });
    const body = await response.text();
    res.statusCode = response.status;
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(body);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  }
};
