import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');

for (const id of ['wallet-input','scan-button','dashboard','sol-balance','activity-body','token-list','signals-list','ai-button','export-button']) {
  assert.ok(html.includes(`id="${id}"`), `index.html missing UI element ${id}`);
}
for (const method of ['getBalance','getTokenAccountsByOwner','getSignaturesForAddress','getTransaction']) {
  assert.ok(app.includes(`'${method}'`), `app.js does not call ${method}`);
}
assert.ok(app.includes('x-goog-api-key'), 'Gemini API header should be used');
assert.ok(app.includes('validateSolanaAddress'), 'wallet validation should exist');
assert.ok(app.includes('createObjectURL'), 'JSON export should exist');
assert.ok(css.includes('.metric-grid') && css.includes('@media'), 'responsive styles should exist');
assert.ok(readme.includes('Important limitations'), 'README must disclose limitations');
console.log('Smoke checks passed.');
