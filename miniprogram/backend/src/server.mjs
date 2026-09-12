import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const SERVICE_NAME = '彩色小连珠 API';

function sendJson(response, statusCode, body) {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  response.end(payload);
}

export function createGameApiServer() {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');

    if (request.method === 'GET' && url.pathname === '/health') {
      sendJson(response, 200, { service: SERVICE_NAME, status: 'ok' });
      return;
    }

    sendJson(response, 404, { error: 'not_found' });
  });

  server.requestTimeout = 10_000;
  server.headersTimeout = 12_000;
  server.keepAliveTimeout = 5_000;
  return server;
}

export function startGameApiServer({
  host = process.env.BACKEND_HOST || '127.0.0.1',
  port = Number.parseInt(process.env.BACKEND_PORT || '8788', 10),
} = {}) {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('BACKEND_PORT 必须是 1 到 65535 之间的整数');
  }

  const server = createGameApiServer();
  server.listen(port, host, () => {
    console.log(`${SERVICE_NAME} listening on http://${host}:${port}`);
  });
  return server;
}

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMainModule) startGameApiServer();
