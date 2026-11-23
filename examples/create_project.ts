import { Revdoku, RevdokuError } from 'revdoku';

const client = new Revdoku({ accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
try {
  const result = await client.createProject({
    username: process.env.REVDOKU_EMAIL_USERNAME || undefined,
    domain: process.env.REVDOKU_EMAIL_DOMAIN || undefined,
  });
  console.log(result.data.project.id, result.data.project.email?.address);
} catch (error) {
  if (error instanceof RevdokuError) {
    console.error(`HTTP ${error.status}: ${error.code}`, JSON.stringify(error.details));
    if (error.retryAfter !== undefined) console.error(`Retry after ${error.retryAfter} seconds`);
  }
  // Never repeat a creation automatically: it may have succeeded.
  console.error('Creation was not confirmed. Check existing projects before another creation attempt.');
  process.exitCode = 1;
}
