const API_URL = 'https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/sydneytrains';
const API_KEY = process.env.NSW_API_KEY;
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.status(204).end();
    return;
  }

  if (!API_KEY) {
    res.status(500).json({ error: 'NSW_API_KEY env var not configured in Vercel' });
    return;
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(API_URL, {
      headers: { Authorization: `apikey ${API_KEY}` }
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(response.status);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ error: 'NSW API error', status: response.status, preview: text.slice(0, 200) }));
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
    const trains = [];
    for (const entity of feed.entity) {
      const v = entity.vehicle;
      if (!v) continue;
      const pos = v.position || {};
      const trip = v.trip || {};
      const vehicle = v.vehicle || {};
      trains.push({
        id: trip.tripId || entity.id,
        lat: pos.latitude !== undefined ? pos.latitude : null,
        lon: pos.longitude !== undefined ? pos.longitude : null,
        route: trip.routeId || null,
        routeCode: trip.routeId || null,
        trip: trip.tripId || null,
        timestamp: v.timestamp || null,
        stopId: v.stopId || null,
        label: vehicle.label || null,
        occupancy: v.occupancyStatus,
        speed: pos.speed !== undefined ? pos.speed : null,
        bearing: pos.bearing !== undefined ? pos.bearing : null
      });
    }

    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ trains, count: trains.length }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
