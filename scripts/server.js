const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT || '3000', 10);
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
};

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resolveFilePath(reqPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(reqPath);
  } catch (e) {
    return null;
  }
  if (decodedPath === '/' || decodedPath === '') {
    return path.join(ROOT_DIR, 'index.html');
  }

  let fullPath = path.resolve(ROOT_DIR, '.' + (decodedPath.startsWith('/') ? decodedPath : '/' + decodedPath));

  // Security check: ensure path stays within ROOT_DIR
  const rel = path.relative(ROOT_DIR, fullPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;
  }

  // 1. If path exists as a file, return it
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    return fullPath;
  }

  // 2. If path + '.html' exists as a file, return it (clean URLs support)
  const htmlPath = fullPath + '.html';
  if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
    return htmlPath;
  }

  // 3. If directory, check for index.html or same-named .html
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    const dirIndex = path.join(fullPath, 'index.html');
    if (fs.existsSync(dirIndex) && fs.statSync(dirIndex).isFile()) {
      return dirIndex;
    }
  }

  // 4. Try stripping trailing slash if any
  if (decodedPath.endsWith('/')) {
    const trimmedPath = fullPath.replace(/[\\/]+$/, '') + '.html';
    if (fs.existsSync(trimmedPath) && fs.statSync(trimmedPath).isFile()) {
      return trimmedPath;
    }
  }

  return null;
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  const targetFile = resolveFilePath(pathname);

  if (!targetFile) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html>
<head><title>404 Not Found</title></head>
<body style="font-family:sans-serif;text-align:center;padding:50px;">
  <h1>404 Not Found</h1>
  <p>The requested URL <code>${escapeHTML(pathname)}</code> was not found on this server.</p>
  <p><a href="/">Return to Homepage</a></p>
</body>
</html>`);
    return;
  }

  const ext = path.extname(targetFile).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(targetFile, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
});

let currentPort = PORT;

function startServer(port) {
  server.listen(port, '0.0.0.0', () => {
    console.log(`BPOXCEL server running at http://localhost:${port}`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`Port ${currentPort} is already in use. Trying port ${currentPort + 1}...`);
    currentPort += 1;
    startServer(currentPort);
  } else {
    console.error('Server error:', err);
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Keep process active
const keepAlive = setInterval(() => {}, 1000 * 60 * 60);
keepAlive.unref();

startServer(currentPort);

