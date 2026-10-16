import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Revdoku } from 'revdoku';

const mailboxId = process.env.REVDOKU_MAILBOX_ID;
const localPath = process.argv[2];
if (!mailboxId || !localPath)
  throw new Error('Set REVDOKU_MAILBOX_ID and pass a local file path');
const client = new Revdoku({ accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
const { data } = await client.getMailbox({ mailboxId });
const result = await client.uploadFile({
  mailboxId,
  path: process.argv[3] || basename(localPath),
  content: await readFile(localPath),
  expectedMailboxVersion: data.mailbox.versionId ?? undefined, // Rejects the save after a concurrent change.
});
console.log(result.data.file.id, result.data.file.path);
