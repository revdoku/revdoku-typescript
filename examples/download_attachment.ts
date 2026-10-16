import { writeFile } from 'node:fs/promises';
import { Revdoku } from 'revdoku';

const mailboxId = process.env.REVDOKU_MAILBOX_ID;
const emailId = process.env.REVDOKU_EMAIL_ID;
const attachmentId = process.env.REVDOKU_ATTACHMENT_ID;
const output = process.env.REVDOKU_DOWNLOAD_PATH;
if (!mailboxId || !emailId || !attachmentId || !output)
  throw new Error('Set REVDOKU_MAILBOX_ID, REVDOKU_EMAIL_ID, REVDOKU_ATTACHMENT_ID and REVDOKU_DOWNLOAD_PATH');
const client = new Revdoku({ accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
const bytes = await client.downloadAttachment({ mailboxId, emailId, attachmentId });
await writeFile(output, bytes, { flag: 'wx', mode: 0o600 }); // Never overwrites an existing file.
console.log(output);
