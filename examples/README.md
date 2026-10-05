# Receive your first email

This walkthrough uses the SDK in this checkout. A **mailbox** has its own receiving address and private file storage. Keep its `bkt_...` ID for subsequent requests. The examples run on your computer or backend; keep the API key there.

## Install from source

The public GitHub source is available now. These commands do not depend on a package-registry release. Use a POSIX shell, or WSL on Windows:

```sh
git clone --depth 1 https://github.com/revdoku/revdoku-typescript.git
cd revdoku-typescript
git rev-parse HEAD
```

Record the printed commit ID with your dependency configuration so you can [repeat this source build](#repeat-a-source-build).

Requires Node.js 22 or newer. From the cloned package directory:

```sh
npm install --ignore-scripts
npm run build
npm --prefix examples install --ignore-scripts
npm --prefix examples run build
```

### Run an example

Run only the command for your current walkthrough step, from the package directory:

| Step | Command | Source |
| --- | --- | --- |
| List mailboxes | `node examples/dist/list_mailboxes.js` | [Source](list_mailboxes.ts) |
| Create mailbox | `node examples/dist/create_mailbox.js` | [Source](create_mailbox.ts) |
| Read emails | `node examples/dist/read_emails.js` | [Source](read_emails.ts) |
| Download attachment | `node examples/dist/download_attachment.js` | [Source](download_attachment.ts) |
| List files | `node examples/dist/list_files.js` | [Source](list_files.ts) |

## Configure

1. [Sign up](https://app.revdoku.com/users/sign_up) or sign in. Signup creates a first mailbox.
2. Open [Account → Access](https://app.revdoku.com/account/access), create an API key, and select its account and mailbox access. You can also start from **Connect via API**.
3. Set the key in your local environment. Replace the placeholder below; keep real keys out of committed files.

   ```sh
   export REVDOKU_API_KEY="YOUR_API_KEY"
   ```

4. Leave `REVDOKU_ACCOUNT_ID` unset for the key's default account. To use another granted account, get its ID with `GET /v1/accounts` or `revdoku accounts`, then set `export REVDOKU_ACCOUNT_ID="acct_RETURNED_ID"`. Keep that selection for every step. Selecting an account in the dashboard or supplying a mailbox ID does not change the key's default account.

| Task | Access needed |
| --- | --- |
| List/read emails, download attachments, list files | Read access to that mailbox |
| Discover its receiving address through the API, mark email read, upload files | Write access to that mailbox |
| Create another mailbox | Account-wide admin permission; a key limited to selected mailboxes cannot create mailboxes |
| Delete an email | Admin access to that mailbox |

The [first request](../QUICKSTART.md) checks the connection. The SDK already uses `https://api.revdoku.com` and adds `/v1` in its generated paths. Keep that default. When making raw HTTP requests instead, use `https://api.revdoku.com/v1` as the REST base URL.

## Receive and download

1. **Choose a mailbox.** Reuse the starter mailbox: run the **List mailboxes** request in [QUICKSTART.md](../QUICKSTART.md) and copy its `id`. Use the dashboard's receiving address, or ask a mailbox writer for it. If you need a separate mailbox and have account-wide admin access, run **Create mailbox** from the command table above once. It prints a mailbox ID and ready address, for example:

   ```text
   bkt_RETURNED_ID example@revdokumail.com
   ```

   Save the actual ID:

   ```sh
   export REVDOKU_BUCKET_ID="bkt_RETURNED_ID"
   ```

2. **Send a test email** from your normal email app to that exact receiving address. Use a subject such as `First API test` and attach a small text file. Revdoku receives this message; the examples do not send it.
3. **Run Read emails.** It lists unread messages, follows every page and fetches each message's text and attachment metadata. A printed result contains fields like these (IDs and content will differ):

   ```json
   {"id":"eml_RETURNED_ID","subject":"First API test","body_status":"complete","body_text":"Hello","attachments":[{"id":"df_RETURNED_ID","filename":"hello.txt"}]}
   ```

   A successful exit with no output means there are no unread messages in this account and mailbox. Wait for delivery and run it again; if you already opened the email in the dashboard, mark it unread there or remove the example's unread filter to list all messages. Reading through this example leaves shared read status unchanged.
4. **Download one attachment.** Copy the email's `id` and an entry's `attachments[].id` from that output. Choose a local output path that does not exist:

   ```sh
   export REVDOKU_EMAIL_ID="eml_RETURNED_ID"
   export REVDOKU_ATTACHMENT_ID="df_RETURNED_ID"
   export REVDOKU_DOWNLOAD_PATH="./hello.txt"
   ```

   Run **Download attachment**. It prints the saved path; open that file to verify its contents. If the path already exists, choose another path. The example refuses to overwrite files.
5. **Run List files** to see the mailbox's stored files, including the original email and attachments. It follows every file page.

## Understand the results

| Value | Meaning |
| --- | --- |
| `data.email` | Message returned by Get email; lists contain summaries under `data.emails` |
| `body_status` | `complete`, `empty`, `truncated` or `unavailable`; `body_text` may be null |
| Email `id` | Revdoku `eml_...` ID used in read/download requests; the sender's `message_id` header is different |
| Attachment `id` | `df_...` ID from that email's attachment metadata |
| `data.download` | Temporary URL and metadata returned by the SDK download method, rather than file bytes |

Field names above describe JSON. See [SDK fields and errors](#sdk-fields-and-errors) for the actual member names in this SDK.

The download example obtains a fresh URL, fetches its bytes using a separate HTTP client **without the API key**, and saves to your chosen path. It buffers one attachment in memory. URLs expire after 15 minutes; request a new descriptor if one expires. n8n's download operation instead returns binary data, while Zapier returns a file reference for the next action. [Compare integrations](https://github.com/revdoku/revdoku/blob/main/guides/api-packages.md#downloads).

## Handle failures

The **Create mailbox** source demonstrates the SDK's native error response. It prints the HTTP error and returned details, then exits unsuccessfully. It never repeats creation automatically.

| Failure | Next step |
| --- | --- |
| `401 UNAUTHORIZED` | Check that the API key is set and still valid. |
| `403 FORBIDDEN` | Check the key's selected account, mailboxes and permission for this operation. |
| `404` for a mailbox or email | Check the account selection and IDs; inaccessible resources may also return 404. |
| `503 EMAIL_NOT_READY` | Creation may have succeeded. Save `error.details.mailbox_id`, read that mailbox's email settings, and inspect `blocked_reason` before deciding what to do next. |
| Timeout or lost creation response | List mailboxes and reconcile the result before deciding whether to create another one. |
| `429` rate limit | For reads, wait for `Retry-After` before a bounded retry. |
| `MAILBOX_CREATION_LIMIT_REACHED` | Wait until `error.details.resets_at` or change capacity; immediate retries cannot help. |

Every successful creation consumes capacity. Deleting the mailbox does not refund it. [Creation recovery](https://revdoku.com/api.md#creation-result) and [retry guidance](https://revdoku.com/api.md#rate-limits) explain the API behavior.

## Run continuously

These examples are one-time reads and writes. Running **Read emails** again prints messages that remain unread. Shared read status can be changed by people and other integrations; it is not your application's processing checkpoint.

For a recurring consumer, list in arrival order and persist `pagination.next_cursor` after successful processing, including on empty pages. Reuse it with the same account, mailbox, order and filters; deduplicate effects using the email ID. Continue while `has_more` is true even when a page contains fewer than the requested number of items. [Polling, n8n and Zapier comparison](https://github.com/revdoku/revdoku/blob/main/guides/api-packages.md#new-email-processing).

## Language reference

### Use the SDK in your application

Build and pack this checkout, then install that tarball in your application:

```sh
npm pack
cd /absolute/path/to/your-app
npm install /absolute/path/to/revdoku-typescript/revdoku-api-1.0.535.tgz
```

Use `import { Configuration, DefaultApi } from '@revdoku/api'` in an ES module (`.mjs`, or a project with `"type": "module"`). This also works from TypeScript. Registry installation is available only after an npm release exists.

### SDK fields and errors

JSON fields are converted to these SDK members: `result.data.email.bodyText`, `email.bodyStatus`, `page.pagination.hasMore`, `page.pagination.nextCursor`.

For API errors, use `ResponseError.response.status`, `await error.response.json()`, and `error.response.headers.get("Retry-After")`. The [Create mailbox source](create_mailbox.ts) shows how to report a failed request without repeating it.

### Repeat a source build

In a fresh checkout, replace `RECORDED_COMMIT_ID` with the commit you saved above, then rerun the installation commands:

```sh
git fetch --depth 1 origin RECORDED_COMMIT_ID
git checkout --detach FETCH_HEAD
```
