import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Revdoku } from 'revdoku';

const bucketId = process.env.REVDOKU_BUCKET_ID;
const localPath = process.argv[2];
if (!bucketId || !localPath)
  throw new Error('Set REVDOKU_BUCKET_ID and pass a local file path');
const client = new Revdoku({ accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
const { data } = await client.getBucket({ bucketId });
const result = await client.uploadFile({
  bucketId,
  path: process.argv[3] || basename(localPath),
  content: await readFile(localPath),
  expectedBucketVersion: data.bucket.versionId ?? undefined, // Rejects the save after a concurrent change.
});
console.log(result.data.file.id, result.data.file.path);
