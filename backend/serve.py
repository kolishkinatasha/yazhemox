"""Local preview with portable MIME types, including Windows .js overrides."""
import argparse
import errno
from functools import partial
from http.client import HTTPConnection, HTTPException
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import webbrowser

HOST = '127.0.0.1'


class PreviewServer(ThreadingHTTPServer):
    # Windows can otherwise bind two listening sockets to the same address.
    allow_reuse_address = os.name != 'nt'


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript', '.mjs': 'text/javascript',
        '.css': 'text/css', '.json': 'application/json',
        '.wasm': 'application/wasm', '.glb': 'model/gltf-binary',
        '.gz': 'application/gzip', '.woff2': 'font/woff2',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

def serves_site(port, index):
    connection = HTTPConnection(HOST, port, timeout=1)
    try:
        connection.request('GET', '/')
        response = connection.getresponse()
        return response.status == 200 and response.read(len(index) + 1) == index
    except (OSError, HTTPException):
        return False
    finally:
        connection.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4173)
    parser.add_argument('--open', action='store_true', help='Open the site in the default browser.')
    args = parser.parse_args()
    directory = Path(__file__).resolve().parent.parent / 'frontend' / 'dist'
    index = directory / 'index.html'
    if not index.is_file():
        parser.exit(1, f'Cannot find {index}. Extract the entire project before starting it.\n')
    handler = partial(Handler, directory=str(directory))
    try:
        server = PreviewServer((HOST, args.port), handler)
    except OSError as error:
        if not args.open or (error.errno != errno.EADDRINUSE and getattr(error, 'winerror', None) != 10048):
            parser.exit(1, f'Could not start the local server: {error}\n')
        if serves_site(args.port, index.read_bytes()):
            url = f'http://{HOST}:{args.port}/'
            print(f'Already running: {url}', flush=True)
            webbrowser.open(url)
            return
        server = PreviewServer((HOST, 0), handler)

    with server:
        url = f'http://{HOST}:{server.server_port}/'
        print(f'Local: {url}', flush=True)
        if args.open:
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
