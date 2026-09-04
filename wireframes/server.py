import http.server
import socketserver
import urllib.parse
import os

PORT = 8899
DIRECTORY = "/home/richingga/projects/bebas/wireframes"

class StrictHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        # Jika ada query string seperti ?v=2, tolak dengan 404
        if parsed.query:
            self.send_error(404, "File not found (query strings disabled)")
            return
        # Pastikan tidak ada caching di browser
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

with socketserver.TCPServer(("0.0.0.0", PORT), StrictHandler) as httpd:
    print(f"Serving strictly at port {PORT}")
    httpd.serve_forever()
