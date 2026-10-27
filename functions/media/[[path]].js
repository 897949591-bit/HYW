import { ALLOWED } from '../../lib/allowed-media.js';

const TYPES = { mp4: 'video/mp4', pdf: 'application/pdf', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };

export async function onRequest({ request, env }) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  let key;
  try { key = decodeURIComponent(new URL(request.url).pathname.slice('/media/'.length)); }
  catch { return new Response('Not found', { status: 404 }); }
  if (!ALLOWED.has(key)) return new Response('Not found', { status: 404 });
  if (!env.MEDIA) return new Response('Media storage unavailable', { status: 503 });
  const object = await env.MEDIA.get(key, { range: request.headers, onlyIf: request.headers });
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cache-Control', 'public, max-age=86400');
  if (!headers.has('Content-Type')) headers.set('Content-Type', TYPES[key.split('.').pop()] || 'application/octet-stream');
  if (!('body' in object)) {
    const notModified = request.headers.has('If-None-Match') || request.headers.has('If-Modified-Since');
    return new Response(null, { status: notModified ? 304 : 412, headers });
  }
  let status = 200;
  let length = object.size;
  if (object.range) {
    let start, end;
    if (Number.isFinite(object.range.suffix)) {
      length = Math.min(object.size, object.range.suffix);
      start = object.size - length; end = object.size - 1;
    } else {
      start = object.range.offset ?? 0;
      length = Math.min(object.range.length ?? (object.size - start), object.size - start);
      end = start + length - 1;
    }
    if (length <= 0) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${object.size}` } });
    headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
    status = 206;
  }
  headers.set('Content-Length', String(length));
  return new Response(request.method === 'HEAD' ? null : object.body, { status, headers });
}
