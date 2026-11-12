import { setTimeout as sleep } from 'node:timers/promises';
import { Revdoku, RevdokuError } from 'revdoku';

const bucketId = process.env.REVDOKU_BUCKET_ID ?? '';
if (!bucketId) throw new Error('Set REVDOKU_BUCKET_ID');
const client = new Revdoku({ accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });

// The AI filter checks a new message for up to about a minute. Until then, reading it
// returns 503 EMAIL_LABELING_PENDING with Retry-After.
async function readMessage(ticketId: string, messageId: string) {
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      return (await client.getTicketMessage({ bucketId, ticketId, messageId })).data.message;
    } catch (error) {
      if (!(error instanceof RevdokuError) || error.code !== 'EMAIL_LABELING_PENDING') throw error;
      await sleep((error.retryAfter ?? 5) * 1000);
    }
  }
  return undefined;
}

// A ticket is one conversation: an email or a message left on your docs site.
let cursor: string | undefined;
const seen = new Set<string>();
for (;;) {
  const { data: page } = await client.listTickets({ bucketId, limit: 100, status: 'open', cursor });
  for (const ticket of page.tickets) {
    const { data: thread } = await client.listTicketMessages({ bucketId, ticketId: ticket.id });
    for (const summary of thread.messages) {
      if (summary.direction !== 'received') continue;
      if (summary.labels.some(label => label.name === 'Junk')) continue; // Revdoku withholds junk content.
      const message = await readMessage(ticket.id, summary.id);
      if (!message) {
        console.error(`${summary.id} is still being checked. Run again later.`);
        continue;
      }
      console.log(JSON.stringify({
        ticket_id: ticket.id,
        number: ticket.number,
        channel: ticket.channel,
        id: message.id,
        subject: message.subject,
        body_status: message.bodyStatus,
        body_text: message.bodyText,
        attachments: message.attachments,
      }));
    }
  }
  if (!page.pagination.hasMore) break;
  cursor = page.pagination.nextCursor ?? undefined;
  if (!cursor || seen.has(cursor)) throw new Error('Ticket pagination did not advance');
  seen.add(cursor);
}
// Reading does not change the shared read status or the ticket status.
