#!/usr/bin/env python3
"""Simple CORS proxy + static file server for Sydney Train Network map."""
import http.server, socketserver, urllib.request, urllib.parse, json, os, sys

API_KEY = os.environ.get('NSW_API_KEY', '')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8766

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # quieter

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/'):
            self.proxy_api()
        else:
            super().do_GET()

    def proxy_api(self):
        if not API_KEY or API_KEY == '[REDACTED]':
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': 'NSW_API_KEY not set. Start server with: NSW_API_KEY=your_key python3 proxy_server.py'
            }).encode())
            return
        try:
            target = 'https://api.transport.nsw.gov.au' + self.path[4:]
            req = urllib.request.Request(target, headers={'Authorization': f'apikey {API_KEY}'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                body = resp.read()
                self.send_response(resp.status)
                ct = resp.headers.get('Content-Type', 'application/json')
                self.send_header('Content-Type', ct)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(body)
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

os.chdir('/opt/data/sydney-train-network')
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    print("Proxy active at /api/*")
    if not API_KEY:
        print("WARNING: NSW_API_KEY not set. Live departures will fail.")
    httpd.serve_forever()
