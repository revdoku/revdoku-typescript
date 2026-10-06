import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Revdoku } from '@revdoku/api';

const apiKey = process.env.REVDOKU_API_KEY;
const mailboxId = process.env.REVDOKU_BUCKET_ID;
const localPath = process.argv[2];
if (!apiKey || !mailboxId || !localPath)
  throw new Error('Set REVDOKU_API_KEY and REVDOKU_BUCKET_ID; pass a local file path');
const api = new Revdoku({ apiKey, accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
const { data } = await api.getMailbox({ mailboxId });
const result = await api.uploadFile({ mailboxId, path: process.argv[3] || basename(localPath),
  content: await readFile(localPath), expectedMailboxRevisionId: data.mailbox.currentMailboxRevisionId ?? undefined });
console.log(result.data.file.id, result.data.file.path);
