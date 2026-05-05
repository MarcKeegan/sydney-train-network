module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return res.status(500).json({ error: 'MAPBOX_TOKEN not configured' });
  res.status(200).json({ token });
};
