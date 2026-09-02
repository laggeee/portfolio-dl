"""Servidor de desenvolvimento.

O `python -m http.server` não manda Cache-Control, e o navegador então usa
cache heurístico. Com módulos ES isso é especialmente traiçoeiro: a página
recarrega, mas o import continua servindo a versão antiga do arquivo — e
você depura um código que não está mais em disco.
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class SemCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # silencia o ruído de request por request


if __name__ == '__main__':
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 5178
    print(f'true-port em http://localhost:{porta}  (sem cache)')
    ThreadingHTTPServer(('127.0.0.1', porta), SemCache).serve_forever()
