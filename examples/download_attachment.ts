import { writeFile } from 'node:fs/promises';
import { Revdoku } from 'revdoku';

const projectId = process.env.REVDOKU_PROJECT_ID;
const ticketId = process.env.REVDOKU_TICKET_ID;
const messageId = process.env.REVDOKU_MESSAGE_ID;
const attachmentId = process.env.REVDOKU_ATTACHMENT_ID;
const output = process.env.REVDOKU_DOWNLOAD_PATH;
if (!projectId || !ticketId || !messageId || !attachmentId || !output)
  throw new Error('Set REVDOKU_PROJECT_ID, REVDOKU_TICKET_ID, REVDOKU_MESSAGE_ID, REVDOKU_ATTACHMENT_ID and REVDOKU_DOWNLOAD_PATH');
const client = new Revdoku({ accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
const bytes = await client.downloadAttachment({ projectId, ticketId, messageId, attachmentId });
await writeFile(output, bytes, { flag: 'wx', mode: 0o600 }); // Never overwrites an existing file.
console.log(output);
