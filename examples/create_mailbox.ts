import { Revdoku, RevdokuError } from '@revdoku/api';

const key = process.env.REVDOKU_API_KEY;
if (!key) throw new Error('Set REVDOKU_API_KEY');
const api = new Revdoku({ apiKey: key, accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
try {
  const result = await api.createMailbox({
    username: process.env.REVDOKU_MAILBOX_USERNAME || undefined,
    domain: process.env.REVDOKU_MAILBOX_DOMAIN || undefined,
  });
  console.log(result.data.mailbox.id, result.data.mailbox.email?.address);
} catch (error) {
  if (error instanceof RevdokuError) {
    console.error(`HTTP ${error.status}: ${error.code}`, JSON.stringify(error.details));
    if (error.retryAfter) console.error(`Retry-After: ${error.retryAfter}`);
  }
  console.error('Creation was not confirmed. Check existing mailboxes before another creation attempt.');
  process.exitCode = 1;
}
