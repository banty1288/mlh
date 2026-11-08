import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
const server = http.createServer(async (req,res) => {
  try {
    const raw = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname);
    const requested = raw === '/' ? '/index.html' : raw;
    const file = path.resolve(root, `.${requested}`);
    if (!file.startsWith(root + path.sep) && file !== path.join(root,'index.html')) { res.writeHead(403); res.end('Forbidden'); return; }
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
    res.end(body);
  } catch {
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');
  }
});
server.listen(port, () => console.log(`Solana Sentinel running at http://localhost:${port}`));
