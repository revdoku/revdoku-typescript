import { Revdoku } from 'revdoku';

const mailboxId = process.env.REVDOKU_MAILBOX_ID;
if (!mailboxId) throw new Error('Set REVDOKU_MAILBOX_ID');
const client = new Revdoku({ accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
let cursor: string | undefined;
const seen = new Set<string>();
for (;;) {
  const { data: page } = await client.listFiles({ mailboxId, limit: 100, cursor });
  for (const file of page.files) console.log(JSON.stringify(file));
  if (!page.pagination.hasMore) break;
  cursor = page.pagination.nextCursor ?? undefined;
  if (!cursor || seen.has(cursor)) throw new Error('File pagination did not advance');
  seen.add(cursor);
}
