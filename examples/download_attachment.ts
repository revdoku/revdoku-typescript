import { writeFile } from "node:fs/promises";
import { Configuration, DefaultApi } from "@revdoku/api";

const key = process.env.REVDOKU_API_KEY;
const mailboxId = process.env.REVDOKU_BUCKET_ID;
const emailId = process.env.REVDOKU_EMAIL_ID;
const attachmentId = process.env.REVDOKU_ATTACHMENT_ID;
const output = process.env.REVDOKU_DOWNLOAD_PATH;
if (!key || !mailboxId || !emailId || !attachmentId || !output)
  throw new Error("Set all required environment variables");
const api = new DefaultApi(new Configuration({ accessToken: key }));
const {
  data: { download },
} = await api.downloadEmailAttachment({
  mailboxId,
  emailId,
  attachmentId,
  accountId: process.env.REVDOKU_ACCOUNT_ID || undefined,
});
const url = new URL(download.url);
if (
  download.authentication !== "none" ||
  url.protocol !== "https:" ||
  url.username ||
  url.password
) {
  throw new Error("Expected an HTTPS download without API authentication");
}
// Use plain fetch, without the SDK's bearer token, and a fresh signed URL.
const response = await fetch(url, {
  redirect: "error",
  signal: AbortSignal.timeout(60_000),
});
if (response.status !== 200)
  throw new Error(`Download failed: HTTP ${response.status}`);
await writeFile(output, Buffer.from(await response.arrayBuffer()), {
  flag: "wx",
  mode: 0o600,
});
console.log(output);
