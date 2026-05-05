#!/usr/bin/env python3
import http.server, socketserver, urllib.request, json, os, sys

API_KEY = os.environ.get("NSW_API_KEY", "")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8766

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/"):
            self.proxy_api()
        else:
            super().do_GET()

    def proxy_api(self):
        if not API_KEY:
            self._json(500, {"error": "NSW_API_KEY not set."})
            return
        try:
            target = "https://api.transport.nsw.gov.au" + self.path[4:]
            req = urllib.request.Request(target, headers={"Authorization": "apikey " + API_KEY})
            with urllib.request.urlopen(req, timeout=15) as resp:
                self.send_response(resp.status)
                ct = resp.headers.get("Content-Type", "application/json")
                self.send_header("Content-Type", ct)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(resp.read())
        except Exception as e:
            self._json(500, {"error": str(e)})

    def do_POST(self):
        if self.path == "/api/gtfs_vehiclepos":
            self.serve_gtfs_vehiclepos()
        else:
            self.send_response(404)
            self.end_headers()

    def serve_gtfs_vehiclepos(self):
        if not API_KEY:
            self._json(500, {"error": "NSW_API_KEY not set."})
            return
        try:
            import subprocess, tempfile, os, json
            # Fetch protobuf via curl (handles auth best)
            with tempfile.NamedTemporaryFile(suffix=".pb", delete=False) as f:
                pb_path = f.name
            try:
                cmd = [
                    "curl", "-s", "-H", "Authorization: apikey " + API_KEY,
                    "https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/sydneytrains",
                    "--output", pb_path
                ]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
                if result.returncode != 0:
                    self._json(500, {"error": "curl failed", "details": result.stderr})
                    return
                # Check if response is actually protobuf or a JSON error
                with open(pb_path, "rb") as f:
                    header = f.read(20)
                if header.startswith(b'{') or len(header) < 500:
                    with open(pb_path, "r") as f:
                        text = f.read()
                    self._json(401, {"error": "NSW API returned error (likely unauthorized). Check your API key.", "response_preview": text[:500]})
                    return
                # Decode protobuf
                from google.transit import gtfs_realtime_pb2
                feed = gtfs_realtime_pb2.FeedMessage()
                with open(pb_path, "rb") as f:
                    feed.ParseFromString(f.read())
                trains = []
                for entity in feed.entity:
                    v = entity.vehicle
                    trains.append({
                        "id": entity.id,
                        "lat": v.position.latitude if v.position.HasField("latitude") else None,
                        "lon": v.position.longitude if v.position.HasField("longitude") else None,
                        "route": v.trip.route_id if v.trip.HasField("route_id") else None,
                        "trip": v.trip.trip_id if v.trip.HasField("trip_id") else None,
                        "timestamp": v.timestamp if v.HasField("timestamp") else None,
                        "stop_id": v.stop_id if v.HasField("stop_id") else None,
                        "label": v.vehicle.label if v.vehicle.HasField("label") else None,
                        "occupancy": v.occupancy_status if v.HasField("occupancy_status") else None
                    })
                self._json(200, {"trains": trains, "count": len(trains)})
            finally:
                try:
                    os.unlink(pb_path)
                except:
                    pass
        except Exception as e:
            self._json(500, {"error": str(e)})

    def _json(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

os.chdir(os.path.dirname(os.path.abspath(__file__)))
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Local server: http://localhost:{PORT}")
    if not API_KEY:
        print("WARNING: NSW_API_KEY not set.")
    httpd.serve_forever()
