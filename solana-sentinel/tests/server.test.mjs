import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const port = 4187;
const child = spawn(process.execPath, ['server.mjs'], {env:{...process.env,PORT:String(port)},stdio:'ignore'});
try {
  let ready = false;
  for (let attempt=0; attempt<30; attempt++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/`); if (r.ok) { ready=true; break; } } catch {}
    await delay(100);
  }
  assert.ok(ready, 'static server should start');
  const html = await fetch(`http://127.0.0.1:${port}/`);
  assert.match(html.headers.get('content-type'), /text\/html/);
  assert.match(await html.text(), /SOLANA/);
  const js = await fetch(`http://127.0.0.1:${port}/src/app.js`);
  assert.ok(js.ok, 'app module should be served');
  const css = await fetch(`http://127.0.0.1:${port}/src/styles.css`);
  assert.ok(css.ok, 'styles should be served');
  const missing = await fetch(`http://127.0.0.1:${port}/does-not-exist`);
  assert.equal(missing.status, 404);
  console.log('Server tests passed.');
} finally { child.kill('SIGTERM'); }
