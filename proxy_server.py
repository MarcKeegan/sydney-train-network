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

    def _json(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

os.chdir("/opt/data/sydney-train-network")
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Local server: http://localhost:{PORT}")
    if not API_KEY:
        print("WARNING: NSW_API_KEY not set.")
    httpd.serve_forever()
