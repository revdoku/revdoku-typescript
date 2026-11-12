import { Revdoku } from 'revdoku';

const bucketId = process.env.REVDOKU_BUCKET_ID;
if (!bucketId) throw new Error('Set REVDOKU_BUCKET_ID');
const client = new Revdoku({ accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
let cursor: string | undefined;
const seen = new Set<string>();
for (;;) {
  const { data: page } = await client.listFiles({ bucketId, limit: 100, cursor });
  for (const file of page.files) console.log(JSON.stringify(file));
  if (!page.pagination.hasMore) break;
  cursor = page.pagination.nextCursor ?? undefined;
  if (!cursor || seen.has(cursor)) throw new Error('File pagination did not advance');
  seen.add(cursor);
}
