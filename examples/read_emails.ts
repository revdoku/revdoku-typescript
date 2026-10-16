import { setTimeout as sleep } from 'node:timers/promises';
import { Revdoku, RevdokuError } from 'revdoku';

const mailboxId = process.env.REVDOKU_MAILBOX_ID ?? '';
if (!mailboxId) throw new Error('Set REVDOKU_MAILBOX_ID');
const client = new Revdoku({ accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });

// AI labels check a new email for up to about a minute. Until then, reading it
// returns 503 EMAIL_LABELING_PENDING with Retry-After.
async function readEmail(emailId: string) {
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      return (await client.getEmail({ mailboxId, emailId })).data.email;
    } catch (error) {
      if (!(error instanceof RevdokuError) || error.code !== 'EMAIL_LABELING_PENDING') throw error;
      await sleep((error.retryAfter ?? 5) * 1000);
    }
  }
  return undefined;
}

let cursor: string | undefined;
const seen = new Set<string>();
for (;;) {
  const { data: page } = await client.listEmails({ mailboxId, limit: 100, order: 'asc', read: false, cursor });
  for (const summary of page.emails) {
    if (summary.labels.some(label => label.name === 'Junk')) continue; // Revdoku withholds junk content.
    const email = await readEmail(summary.id);
    if (!email) {
      console.error(`${summary.id} is still being labeled. Run again later.`);
      continue;
    }
    console.log(JSON.stringify({
      id: email.id,
      subject: email.subject,
      body_status: email.bodyStatus,
      body_text: email.bodyText,
      attachments: email.attachments,
    }));
  }
  if (!page.pagination.hasMore) break;
  cursor = page.pagination.nextCursor ?? undefined;
  if (!cursor || seen.has(cursor)) throw new Error('Email pagination did not advance');
  seen.add(cursor);
}
// Reading does not change the shared read status.
