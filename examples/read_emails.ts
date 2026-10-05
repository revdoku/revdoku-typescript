import { Configuration, DefaultApi } from "@revdoku/api";

const key = process.env.REVDOKU_API_KEY;
const mailboxId = process.env.REVDOKU_BUCKET_ID;
if (!key || !mailboxId)
  throw new Error("Set REVDOKU_API_KEY and REVDOKU_BUCKET_ID");
const accountId = process.env.REVDOKU_ACCOUNT_ID || undefined;
const api = new DefaultApi(new Configuration({ accessToken: key }));
let cursor: string | undefined;
const seen = new Set<string>();
for (;;) {
  const { data: page } = await api.listEmails({
    mailboxId,
    accountId,
    limit: 100,
    order: "asc",
    read: false,
    cursor,
  });
  for (const summary of page.emails) {
    const {
      data: { email },
    } = await api.getEmail({ mailboxId, emailId: summary.id, accountId });
    console.log(
      JSON.stringify({
        id: email.id,
        subject: email.subject,
        body_status: email.bodyStatus,
        body_text: email.bodyText,
        attachments: email.attachments,
      }),
    );
  }
  if (!page.pagination.hasMore) break;
  cursor = page.pagination.nextCursor;
  if (!cursor || seen.has(cursor))
    throw new Error("Email pagination did not advance");
  seen.add(cursor);
}
// Reading does not change shared read/unread status.
