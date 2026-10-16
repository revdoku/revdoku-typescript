# Receive your first email

These examples run the SDK from this repository. To use the SDK in your own
application, install it from the package registry instead: see
[Use the SDK in your application](#use-the-sdk-in-your-application).

A **mailbox** has its own receiving address and private file storage. Keep its
`bkt_...` ID for later requests. Run the examples on your computer or backend,
and keep the API key there.

## Build the examples

Clone this repository. Use a POSIX shell, or WSL on Windows:

```sh
git clone --depth 1 https://github.com/revdoku/revdoku-typescript.git
cd revdoku-typescript
```

Requires Node.js 22 or newer. From the cloned repository, build the package and the examples:

```sh
npm install --ignore-scripts
npm run build
npm --prefix examples install --ignore-scripts
npm --prefix examples run build
```

The examples use the package that you built in this checkout.

### Run an example

Run only the command for your current step, from the repository directory:

| Step | Command | Source |
| --- | --- | --- |
| List mailboxes | `node examples/dist/list_mailboxes.js` | [Source](list_mailboxes.ts) |
| Create mailbox | `node examples/dist/create_mailbox.js` | [Source](create_mailbox.ts) |
| Read emails | `node examples/dist/read_emails.js` | [Source](read_emails.ts) |
| Download attachment | `node examples/dist/download_attachment.js` | [Source](download_attachment.ts) |
| Upload file | `node examples/dist/upload_file.js ./notes.txt` | [Source](upload_file.ts) |
| List files | `node examples/dist/list_files.js` | [Source](list_files.ts) |

## Configure

1. [Sign up](https://app.revdoku.com/users/sign_up) or sign in. Signup creates a first mailbox.
2. In the dashboard, select **Connect via API** and copy a new API key. You can also manage keys in [Account → Access](https://app.revdoku.com/account/access).
3. Set the key in your environment. Keep real keys out of committed files.

   ```sh
   export REVDOKU_API_KEY="YOUR_API_KEY"
   ```

4. Leave `REVDOKU_ACCOUNT_ID` unset to use the key's default account. To use another granted account, set `export REVDOKU_ACCOUNT_ID="acct_RETURNED_ID"`. Keep that value for every step.

| Task | Access needed |
| --- | --- |
| List and read emails, download attachments, list files | Read access to that mailbox |
| Mark an email read | Read access to that mailbox |
| Read detailed receiving settings or upload files | Write access to that mailbox |
| Create another mailbox | Admin access to the account. A key for selected mailboxes cannot create mailboxes. |
| Delete an email | Admin access to that mailbox |

Requests go to `https://api.revdoku.com`. Every path starts with `/v1`, for
example `https://api.revdoku.com/v1/mailboxes`. The SDK takes the origin without
`/v1`. Keep its default.

## Receive and download

1. **Choose a mailbox.** Run **List mailboxes** and copy the `id` of a mailbox. If you need a separate mailbox and have admin access to the account, run **Create mailbox** once. Both print a mailbox ID and its address, for example:

   ```text
   bkt_RETURNED_ID example@revdokumail.com
   ```

   Save the ID:

   ```sh
   export REVDOKU_MAILBOX_ID="bkt_RETURNED_ID"
   ```

2. **Send a test email** from your normal email app to that address. Use a subject such as `First API test` and attach a small text file.
3. **Run Read emails.** It lists unread emails, follows every page and gets the text and attachment metadata of each email. It skips emails with the Junk label. The output has fields like these (IDs and content differ):

   ```json
   {"id":"eml_RETURNED_ID","subject":"First API test","body_status":"complete","body_text":"Hello","attachments":[{"id":"df_RETURNED_ID","filename":"hello.txt"}]}
   ```

   When AI labels are on, they check a new email for up to about one minute. The
   example waits for them, so the first run after delivery can take that long.

   No output means that the mailbox has no unread emails. Wait for delivery and run it again. If you opened the email in the dashboard, mark it unread there. Reading through this example does not change the read status.
4. **Download one attachment.** Copy the email `id` and an `attachments[].id` from that output. Choose a local path that does not exist:

   ```sh
   export REVDOKU_EMAIL_ID="eml_RETURNED_ID"
   export REVDOKU_ATTACHMENT_ID="df_RETURNED_ID"
   export REVDOKU_DOWNLOAD_PATH="./hello.txt"
   ```

   Run **Download attachment**. It prints the saved path. The example never overwrites a file.
5. **Run Upload file** with a local file, then **List files** to see the files in the mailbox.

## Understand the results

| Value | Meaning |
| --- | --- |
| `data.email` | The email from `getEmail` (TypeScript) or `get_email` (Python). Lists have summaries in `data.emails`. |
| `body_status` | `complete`, `empty`, `truncated` or `unavailable`. `body_text` can be null. |
| Email `id` | The Revdoku `eml_...` ID. The sender's `message_id` header is a different value. |
| Attachment `id` | The `df_...` ID from the attachment metadata of the email. |
| `data.download` | A temporary URL and metadata, from the link request for an attachment. |

The names above are JSON names. See [SDK fields and errors](#sdk-fields-and-errors) for the names in this SDK.

The download helper gets a new link and fetches the bytes **without the API
key**. It keeps one attachment in memory. Links expire after 15 minutes.

## Handle failures

The **Create mailbox** example prints the error code and details, then exits. It never repeats the creation.

| Failure | Next step |
| --- | --- |
| `401 UNAUTHORIZED` | Make sure that the API key is set and valid. |
| `403 FORBIDDEN` | Check the account, mailboxes and permissions of the key. |
| `404` for a mailbox or email | Check the account and the IDs. The API also returns 404 for resources that the key cannot see. |
| `503 EMAIL_NOT_READY` | The creation can have succeeded. Read the mailbox in `error.details.mailbox_id` before you do anything else. |
| Timeout or lost creation response | List mailboxes before you create another one. |
| `429` or `503` with `Retry-After`, such as `503 EMAIL_INDEX_BUILDING` | For reads, wait that many seconds, then try again a limited number of times. |
| `503 EMAIL_LABELING_PENDING` | AI labels are still checking a new email. **Read emails** waits `Retry-After` seconds and reads it again, for up to about one minute. |
| `MAILBOX_CREATION_LIMIT_REACHED` | Wait until `error.details.resets_at`. An immediate retry cannot succeed. |

Each successful creation uses creation capacity. Deleting the mailbox does not
give it back. See [Errors](https://revdoku.com/api.md#errors).

## Run continuously

These examples run once. Running **Read emails** again prints the emails that
are still unread. People and other integrations can change the read status, so
it is not a processing checkpoint for your application.

For a recurring consumer, list in ascending order and save
`pagination.next_cursor` after each page, also after an empty page. Use it with
the same account, mailbox, order and filters. Deduplicate by email ID. Continue
while `has_more` is `true`, even when a page has fewer items than the limit.
See [List emails](https://revdoku.com/api/reference/emails.md#list-emails).

## Language reference

### Use the SDK in your application

Install the package from npm:

```sh
npm install revdoku
```

```ts
import { Revdoku } from 'revdoku';

const client = new Revdoku(); // Reads REVDOKU_API_KEY.
```

Use an ES module (`.mjs`, or a project with `"type": "module"`) or TypeScript. CommonJS uses `require('revdoku')`. Pass `apiKey` to use a different key.

### SDK fields and errors

SDK fields are camelCase: `result.data.email.bodyText`, `email.bodyStatus`, `page.pagination.hasMore`, `page.pagination.nextCursor`. The JSON API uses snake_case.

For API errors, catch `RevdokuError` and read `status`, `code`, `details` and `retryAfter`. The [Create mailbox source](create_mailbox.ts) reports a failed request without repeating it.
