import { writeFile } from 'node:fs/promises';
import { Revdoku } from '@revdoku/api';

const key = process.env.REVDOKU_API_KEY;
const mailboxId = process.env.REVDOKU_BUCKET_ID;
const emailId = process.env.REVDOKU_EMAIL_ID;
const attachmentId = process.env.REVDOKU_ATTACHMENT_ID;
const output = process.env.REVDOKU_DOWNLOAD_PATH;
if (!key || !mailboxId || !emailId || !attachmentId || !output)
  throw new Error('Set all required environment variables');
const api = new Revdoku({ apiKey: key, accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
const bytes = await api.downloadAttachment({ mailboxId, emailId, attachmentId });
await writeFile(output, bytes, { flag: 'wx', mode: 0o600 });
console.log(output);
