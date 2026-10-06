# @revdoku/api

Email mailboxes and private files for Node.js 22+. JavaScript and TypeScript use
the same `Revdoku` client. Requests retain the API's named `data` envelope.

## Install and make a request

Until this version is released on npm, build a local package:

```sh
git clone https://github.com/revdoku/revdoku-typescript.git
cd revdoku-typescript
npm install
npm pack
# From your application, install the .tgz file printed by npm pack:
npm install /absolute/path/to/revdoku-api-2.0.0.tgz
```

Set `REVDOKU_API_KEY` in your backend environment, then run:

```js
import { Revdoku } from '@revdoku/api';

const revdoku = new Revdoku({ apiKey: process.env.REVDOKU_API_KEY });
const { data } = await revdoku.listMailboxes();
for (const mailbox of data.mailboxes) {
  console.log(mailbox.id, mailbox.email?.address);
}
```

CommonJS also works: `const { Revdoku } = require('@revdoku/api')`.
Keep API keys on your backend. Helper methods use the default account unless you set `accountId` on the client
or a request. When calling the advanced `api` object, pass `accountId` explicitly
if you need another account.

[Upgrade from v1](MIGRATION.md).

## Signup

```js
const signup = new Revdoku();
const challenge = await signup.signup({
  email: 'person@example.com', acceptTermsAndPolicy: true,
});
// Get the code from that email address.
const result = await signup.verifySignup({
  signupToken: challenge.data.signup.signupToken, code: '123456',
});
// Store result.data.apiKey securely. First verification returns it only once.
```

Signup creates the starter mailbox automatically. Repeated verification returns
completion information and a recovery URL, without another API key. By signing up,
you accept the [Terms](https://revdoku.com/terms) and
[Acceptable Use Policy](https://revdoku.com/acceptable-use), and acknowledge the
[Privacy Policy](https://revdoku.com/privacy).

## Email and files

```js
const created = await revdoku.createMailbox({ username: 'orders' });
// username and domain are optional. Always use the returned address.
const mailboxId = created.data.mailbox.id;
const page = await revdoku.listEmails({ mailboxId });
const message = await revdoku.getEmail({ mailboxId, emailId: 'eml_...' });
const bytes = await revdoku.downloadAttachment({
  mailboxId, emailId: 'eml_...', attachmentId: 'df_...',
});
await revdoku.uploadFile({ mailboxId, path: 'notes.txt', content: 'Hello' });
```

Reading does not mark email read. Use the generated `api.updateEmail` operation
when you want to change shared read status. For continuous processing, save each
page's `nextCursor` after processing, including empty pages. Keep filters fixed
and deduplicate by email ID. [Polling reference](https://revdoku.com/api.md#poll-for-new-messages).

`downloadAttachment` returns bytes, with a default 64 MiB bound. Set `maxBytes` in
its second argument to change that bound. Use `getAttachmentDownloadUrl` when you
want the temporary URL and metadata instead. Neither method writes local files.

`uploadFile` accepts UTF-8 text or a `Uint8Array`. It computes both checksums, uploads
to storage without your API key, then commits the file version. Identical content returns the existing file with
`data.duplicate: true`, without uploading again. Pass
`expectedMailboxRevisionId` when editing to reject concurrent changes. If a write
response is lost, inspect the mailbox before repeating the write.

## Errors and request control

```js
import { RevdokuError } from '@revdoku/api';

try {
  await revdoku.listMailboxes({}, { signal: AbortSignal.timeout(5000) });
} catch (error) {
  if (error instanceof RevdokuError) {
    console.error(error.status, error.code, error.message);
    // error.details, requestId and retryAfter are available when returned.
  } else {
    throw error; // Network, cancellation, or local validation failure.
  }
}
```

Requests time out after 30 seconds by default. Set `timeoutMs` on the client to
change it. Nothing is retried automatically. An uncertain creation can have
succeeded; check existing mailboxes before creating another.

Use `revdoku.api` for the full generated API and advanced response controls.
The SDK base URL is an origin (`https://api.revdoku.com`), without `/v1`.

[Runnable examples](examples/README.md) · [API reference](https://revdoku.com/api.md)
· [Contribute](CONTRIBUTING.md) · [MIT license](LICENSE)
