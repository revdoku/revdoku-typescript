import { Configuration, DefaultApi } from "@revdoku/api";

const key = process.env.REVDOKU_API_KEY;
if (!key) throw new Error("Set REVDOKU_API_KEY");
const api = new DefaultApi(new Configuration({ accessToken: key }));
const result = await api.listMailboxes({ accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
for (const mailbox of result.data.mailboxes) console.log(mailbox.id, mailbox.title);
