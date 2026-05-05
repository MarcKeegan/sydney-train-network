const { applyCors, handlePreflight } = require('./_cors');

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  applyCors(req, res);
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return res.status(500).json({ error: 'MAPBOX_TOKEN not configured' });
  res.status(200).json({ token });
};
