import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/media/[[path]].js';
const url = 'https://portfolio.example/media/assets/videos/v08.mp4';
function object(overrides = {}) { return { size: 1000, httpEtag: '"video1"', body: new Uint8Array(10), writeHttpMetadata(h) { h.set('Content-Type', 'video/mp4'); }, ...overrides }; }
function context(request, stored = object()) { return { request, env: { MEDIA: { get: async () => stored } } }; }
test('video byte ranges are streamed with correct seek headers', async () => {
  let options;
  const c = context(new Request(url, { headers: { Range: 'bytes=20-29' } }), object({ range: { offset: 20, length: 10 } }));
  c.env.MEDIA.get = async (_, o) => { options = o; return object({ range: { offset: 20, length: 10 } }); };
  const r = await onRequest(c);
  assert.equal(r.status, 206); assert.equal(r.headers.get('Content-Range'), 'bytes 20-29/1000'); assert.equal(r.headers.get('Content-Length'), '10'); assert.equal(options.range.get('Range'), 'bytes=20-29');
});
test('HEAD returns metadata without video bytes', async () => { const r = await onRequest(context(new Request(url, { method: 'HEAD' }))); assert.equal(r.status, 200); assert.equal(await r.text(), ''); assert.equal(r.headers.get('Content-Length'), '1000'); });
test('matching ETag returns 304', async () => { const o = object(); delete o.body; const r = await onRequest(context(new Request(url, { headers: { 'If-None-Match': '"video1"' } }), o)); assert.equal(r.status, 304); });
test('unlisted objects cannot be read', async () => { let accessed = false; const c = context(new Request('https://portfolio.example/media/private.txt')); c.env.MEDIA.get = async () => { accessed = true; }; assert.equal((await onRequest(c)).status, 404); assert.equal(accessed, false); });
test('missing objects return 404', async () => { assert.equal((await onRequest(context(new Request(url), null))).status, 404); });
test('upload methods are not exposed', async () => { assert.equal((await onRequest(context(new Request(url, { method: 'PUT' })))).status, 405); });

test('R2 range objects may expose an undefined suffix field', async () => {
  const c = context(new Request(url, { headers: { Range: 'bytes=0-31' } }), object({ range: { offset: 0, length: 32, suffix: undefined } }));
  const r = await onRequest(c);
  assert.equal(r.status, 206); assert.equal(r.headers.get('Content-Range'), 'bytes 0-31/1000'); assert.equal(r.headers.get('Content-Length'), '32');
});
