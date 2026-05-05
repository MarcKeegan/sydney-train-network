const API_BASE = 'https://api.transport.nsw.gov.au/v1/tp/departure_mon';
const API_KEY = process.env.NSW_API_KEY;

module.exports = async (req, res) => {
  const { stopId, date, time } = req.query;

  if (!API_KEY) {
    res.status(500).json({ error: 'NSW_API_KEY env var not configured in Vercel' });
    return;
  }
  if (!stopId) {
    res.status(400).json({ error: 'Missing stopId query parameter' });
    return;
  }

  const params = new URLSearchParams({
    outputFormat: 'rapidJSON',
    coordOutputFormat: 'EPSG:4326',
    mode: 'direct',
    type_dm: 'stop',
    name_dm: stopId,
    itdDate: date || new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    itdTime: time || new Date().toTimeString().slice(0, 5).replace(/:/g, ''),
    TfNSWDM: 'true',
    version: '10.2.1.42'
  });

  try {
    const target = `${API_BASE}?${params.toString()}`;
    const response = await fetch(target, {
      headers: { Authorization: `apikey ${API_KEY}` }
    });
    const body = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
