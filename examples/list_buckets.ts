import { Revdoku } from 'revdoku';

// Reads REVDOKU_API_KEY. REVDOKU_ACCOUNT_ID is optional.
const client = new Revdoku({ accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
let cursor: string | undefined;
const seen = new Set<string>();
for (;;) {
  const { data: page } = await client.listBuckets({ status: 'active', limit: 100, cursor });
  for (const bucket of page.buckets) console.log(bucket.id, bucket.email?.address || bucket.id);
  if (!page.pagination.hasMore) break;
  cursor = page.pagination.nextCursor ?? undefined;
  if (!cursor || seen.has(cursor)) throw new Error('Bucket pagination did not advance');
  seen.add(cursor);
}
