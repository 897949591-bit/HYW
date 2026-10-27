import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.env.PORTFOLIO_MEDIA_SOURCE || resolve(root, '../胡耀文-内容营销作品集'));
const { CLOUDFLARE_ACCOUNT_ID: account, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey } = process.env;
if (!account || !accessKeyId || !secretAccessKey) throw new Error('Configure CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in the local environment. Do not commit credentials.');
const bucket = process.env.R2_BUCKET || 'hu-yaowen-portfolio-media';
const client = new S3Client({ region: 'auto', endpoint: `https://${account}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
const manifest = JSON.parse(await readFile(resolve(root, 'media-manifest.json'), 'utf8'));
const types = { mp4: 'video/mp4', pdf: 'application/pdf', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
for (const item of manifest) {
  const path = resolve(source, item.key); const info = await stat(path);
  if (info.size !== item.bytes) throw new Error(`Local file changed: ${item.key}`);
  let exists;
  try { exists = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: item.key })); }
  catch (e) { if (e.$metadata?.httpStatusCode !== 404) throw e; }
  if (exists?.ContentLength === item.bytes) { console.log(`Already uploaded: ${item.key}`); continue; }
  if (exists) throw new Error(`Refusing to overwrite a different object: ${item.key}`);
  const upload = new Upload({ client, params: { Bucket: bucket, Key: item.key, Body: createReadStream(path), ContentType: types[item.key.split('.').pop()], CacheControl: 'public, max-age=86400' }, queueSize: 2, partSize: 16 * 1024 * 1024, leavePartsOnError: false });
  await upload.done();
  const check = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: item.key }));
  if (check.ContentLength !== item.bytes) throw new Error(`Upload size mismatch: ${item.key}`);
  console.log(`Uploaded: ${item.key} (${item.bytes} bytes)`);
}
console.log(`Verified all ${manifest.length} media objects.`);
