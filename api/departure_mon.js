const { applyCors, handlePreflight } = require('./_cors');

const API_BASE = 'https://api.transport.nsw.gov.au/v1/tp/departure_mon';
const API_KEY = process.env.NSW_API_KEY;

// Sydney-local YYYYMMDD / HHmm — TfNSW expects times in the network's timezone,
// not UTC. Using toISOString() for date and toTimeString() for time mixed those.
function sydneyDateTime() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date());
  const get = (t) => fmt.find(p => p.type === t).value;
  return {
    date: `${get('year')}${get('month')}${get('day')}`,
    time: `${get('hour')}${get('minute')}`
  };
}

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  applyCors(req, res);

  const { stopId, date, time } = req.query;

  if (!API_KEY) {
    res.status(500).json({ error: 'NSW_API_KEY env var not configured in Vercel' });
    return;
  }
  if (!stopId) {
    res.status(400).json({ error: 'Missing stopId query parameter' });
    return;
  }

  const now = sydneyDateTime();
  const params = new URLSearchParams({
    outputFormat: 'rapidJSON',
    coordOutputFormat: 'EPSG:4326',
    mode: 'direct',
    type_dm: 'stop',
    name_dm: stopId,
    itdDate: date || now.date,
    itdTime: time || now.time,
    TfNSWDM: 'true',
    version: '10.2.1.42'
  });

  try {
    const target = `${API_BASE}?${params.toString()}`;
    const response = await fetch(target, {
      headers: { Authorization: `apikey ${API_KEY}` }
    });
    const body = await response.text();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.status(response.status).end(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
