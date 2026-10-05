import { Configuration, DefaultApi, ResponseError } from "@revdoku/api";

const key = process.env.REVDOKU_API_KEY;
if (!key) throw new Error("Set REVDOKU_API_KEY");
const api = new DefaultApi(new Configuration({ accessToken: key }));
try {
  const result = await api.createMailbox({
    createMailboxRequest: {
      accountId: process.env.REVDOKU_ACCOUNT_ID || undefined,
      mailbox: { title: "Example mailbox" },
    },
  });
  console.log(result.data.mailbox?.id, result.data.mailbox?.email?.address);
} catch (error) {
  if (error instanceof ResponseError) {
    const body = await error.response.json().catch(() => undefined);
    console.error(`HTTP ${error.response.status}:`, JSON.stringify(body?.error ?? {}));
    const delay = error.response.headers.get("Retry-After");
    if (delay) console.error(`Retry-After: ${delay}`);
  }
  console.error("Creation was not confirmed. Check existing mailboxes before another creation attempt.");
  process.exitCode = 1;
}
