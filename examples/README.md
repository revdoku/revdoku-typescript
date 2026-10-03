# Four runnable examples

Run these from this package's source directory using the language-specific commands below. Each example calls the generated SDK directly. The shell commands use a POSIX shell; Windows users can run them in WSL.

| Example | What it does | Additional environment variables |
| --- | --- | --- |
| Create inbox | Creates one mailbox and prints its bucket ID and receiving address. | None |
| Read emails | Lists every unread email in arrival order, follows all pages, and fetches each message's text and attachment metadata. | `REVDOKU_BUCKET_ID` |
| Download attachment | Gets a fresh download link and saves one attachment to a new local file. | `REVDOKU_BUCKET_ID`, `REVDOKU_EMAIL_ID`, `REVDOKU_ATTACHMENT_ID`, `REVDOKU_DOWNLOAD_PATH` |
| List files | Follows offset pagination and prints the bucket's stored files, including email files. | `REVDOKU_BUCKET_ID` |

## Configure

1. Set `REVDOKU_API_KEY` privately in your environment. Use a credential authorized for the selected account and bucket. Creating an inbox requires permission to create buckets; the other examples require bucket read access.
2. Optionally set `REVDOKU_ACCOUNT_ID`. Leaving it unset or empty uses the key's default account. An existing bucket ID does not select an account automatically.
3. For reads, set `REVDOKU_BUCKET_ID` to an existing bucket. Use an email ID and an attachment's `id` from **Read emails** for the attachment example. `REVDOKU_DOWNLOAD_PATH` is a local filename you choose, with an existing parent directory; the example refuses to overwrite it.
4. Install the package and run one command from the language section below.

Reading email does not mark it read. `body_text` can be null; `body_status` indicates whether it is complete, empty, truncated or unavailable. The read example prints each message's body status, available text and attachment metadata. Pagination follows `has_more` and the server's next cursor/offset, even when a page contains fewer than 100 items. These are one-time reads; a recurring consumer must persist its cursor with the same account, bucket and filters.

Every run of **Create inbox** creates another bucket and consumes creation capacity. If creation times out or returns `EMAIL_NOT_READY`, inspect the retained `error.details.bucket_id` or your bucket list before trying again. The examples stop on API failures.

The attachment example buffers one attachment in memory, obtains its signed URL at execution time, and uses a separate HTTP client without the API token. It saves to your chosen local path, ignoring the sender-controlled filename.

## TypeScript / Node.js

Requires Node.js 22 or newer. Build the SDK, then the examples:

```sh
npm install --ignore-scripts
npm run build
cd examples
npm install --ignore-scripts
npm run build
node dist/create_inbox.js
node dist/read_emails.js
node dist/download_attachment.js
node dist/list_files.js
```

The example project installs the SDK from `file:..`, so these commands work before registry publication. In a separate application, install `@revdoku/api` at your chosen released version.

Sources: [create inbox](create_inbox.ts), [read emails](read_emails.ts), [download attachment](download_attachment.ts), [list files](list_files.ts).
