import { Revdoku } from 'revdoku';

// Reads REVDOKU_API_KEY. REVDOKU_ACCOUNT_ID is optional.
const client = new Revdoku({ accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
let cursor: string | undefined;
const seen = new Set<string>();
for (;;) {
  const { data: page } = await client.listMailboxes({ status: 'active', limit: 100, cursor });
  for (const mailbox of page.mailboxes) console.log(mailbox.id, mailbox.email?.address || mailbox.id);
  if (!page.pagination.hasMore) break;
  cursor = page.pagination.nextCursor ?? undefined;
  if (!cursor || seen.has(cursor)) throw new Error('Mailbox pagination did not advance');
  seen.add(cursor);
}
