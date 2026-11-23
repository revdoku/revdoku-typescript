import { Revdoku } from 'revdoku';

const projectId = process.env.REVDOKU_PROJECT_ID;
if (!projectId) throw new Error('Set REVDOKU_PROJECT_ID');
const client = new Revdoku({ accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
let cursor: string | undefined;
const seen = new Set<string>();
for (;;) {
  const { data: page } = await client.listFiles({ projectId, limit: 100, cursor });
  for (const file of page.files) console.log(JSON.stringify(file));
  if (!page.pagination.hasMore) break;
  cursor = page.pagination.nextCursor ?? undefined;
  if (!cursor || seen.has(cursor)) throw new Error('File pagination did not advance');
  seen.add(cursor);
}
