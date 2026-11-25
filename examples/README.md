# Read your first support ticket

These examples run the SDK from this repository. To use the SDK in your own
application, install it from the package registry instead: see
[Use the SDK in your application](#use-the-sdk-in-your-application).

A **project** has its own email address and the files of its docs site. Each conversation
that arrives there is a support ticket. Keep the project's `prj_...` ID for later requests. Run the examples on your computer or backend,
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
| List projects | `node examples/dist/list_projects.js` | [Source](list_projects.ts) |
| Create project | `node examples/dist/create_project.js` | [Source](create_project.ts) |
| Read tickets | `node examples/dist/read_tickets.js` | [Source](read_tickets.ts) |
| Download attachment | `node examples/dist/download_attachment.js` | [Source](download_attachment.ts) |
| List files | `node examples/dist/list_files.js` | [Source](list_files.ts) |

## Configure

1. [Sign up](https://app.revdoku.com/users/sign_up) or sign in. The setup steps after signup create your first project.
2. In the dashboard, select **Connect via API** and copy a new API key. You can also manage keys in [Account → Access](https://app.revdoku.com/account/access).
3. Set the key in your environment. Keep real keys out of committed files.

   ```sh
   export REVDOKU_API_KEY="YOUR_API_KEY"
   ```

4. Leave `REVDOKU_ACCOUNT_ID` unset to use the key's default account. To use another granted account, set `export REVDOKU_ACCOUNT_ID="acct_RETURNED_ID"`. Keep that value for every step.

| Task | Access needed |
| --- | --- |
| List and read tickets, download attachments, list files | Read access to that project |
| Reply to a ticket, solve it, change its labels | Write access to that project |
| Create another project | Admin access to the account. A key for selected projects cannot create projects. |
| Delete a message | Admin access to that project |

Requests go to `https://api.revdoku.com`. Every path starts with `/v1`, for
example `https://api.revdoku.com/v1/projects`. The SDK takes the origin without
`/v1`. Keep its default.

## Receive and download

1. **Choose a project.** Run **List projects** and copy the `id` of a project. If you need a separate project and have admin access to the account, run **Create project** once. Both print a project ID and its address, for example:

   ```text
   prj_RETURNED_ID support@example.revdoku.net
   ```

   Save the ID:

   ```sh
   export REVDOKU_PROJECT_ID="prj_RETURNED_ID"
   ```

2. **Send a test email** from your normal email app to that address. Use a subject such as `First API test` and attach a small text file.
3. **Run Read tickets.** It lists open tickets, follows every page and gets the text and attachment metadata of each received message. It skips messages with the Junk label. The output has fields like these (IDs and content differ):

   ```json
   {"ticket_id":"tkt_RETURNED_ID","number":1,"channel":"email","id":"eml_RETURNED_ID","subject":"First API test","body_status":"complete","body_text":"Hello","attachments":[{"id":"eat_RETURNED_ID","name":"hello.txt","content_type":"text/plain","size_bytes":5,"origin":null}]}
   ```

   When the AI filter is on, it checks a new message for up to about one minute. The
   example waits for it, so the first run after delivery can take that long.

   No output means that the project has no open tickets. Wait for delivery and run it again. Reading through this example does not change a ticket.
4. **Download one attachment.** Copy the `ticket_id`, the message `id` and an `attachments[].id` from that output. Choose a local path that does not exist:

   ```sh
   export REVDOKU_TICKET_ID="tkt_RETURNED_ID"
   export REVDOKU_MESSAGE_ID="eml_RETURNED_ID"
   export REVDOKU_ATTACHMENT_ID="df_RETURNED_ID"
   export REVDOKU_DOWNLOAD_PATH="./hello.txt"
   ```

   Run **Download attachment**. It prints the saved path. The example never overwrites a file.
5. **Run List files** to see the files in the project: `_repo/` is a read-only copy of the project's GitHub repository, and `_kb/` is the knowledge base.

## Understand the results

| Value | Meaning |
| --- | --- |
| `data.message` | The message from `getTicketMessage` (TypeScript) or `get_ticket_message` (Python). `data.messages` lists the messages of a ticket, and `data.tickets` lists tickets. |
| `body_status` | `complete`, `empty`, `truncated`, `unavailable` or `withheld`. `body_text` can be null. |
| Ticket `id` | The `tkt_...` ID of the conversation. `number` is the short number that people see. |
| Message `id` | The Revdoku `eml_...` ID. The sender's Message-ID header is a different value: `headers.message_id`. |
| Attachment `id` | The `eat_...` ID from the attachment metadata of the message. |
| `data.download` | A temporary URL and metadata, from the link request for an attachment. |

The names above are JSON names. See [SDK fields and errors](#sdk-fields-and-errors) for the names in this SDK.

The download helper gets a new link and fetches the bytes **without the API
key**. It keeps one attachment in memory. Links expire after 15 minutes.

## Handle failures

The **Create project** example prints the error code and details, then exits. It never repeats the creation.

| Failure | Next step |
| --- | --- |
| `401 UNAUTHORIZED` | Make sure that the API key is set and valid. |
| `403 FORBIDDEN` | Check the account, projects and permissions of the key. |
| `404` for a project, ticket or message | Check the account and the IDs. The API also returns 404 for resources that the key cannot see. |
| `503 EMAIL_NOT_READY` | The creation can have succeeded. Read the project in `error.details.project_id` before you do anything else. |
| Timeout or lost creation response | List projects before you create another one. |
| `429` or `503` with `Retry-After`, such as `503 EMAIL_INDEX_BUILDING` | For reads, wait that many seconds, then try again a limited number of times. |
| `503 EMAIL_LABELING_PENDING` | The AI filter is still checking a new message. **Read tickets** waits `Retry-After` seconds and reads it again, for up to about one minute. |
| `PROJECT_CREATION_LIMIT_REACHED` | Wait until `error.details.resets_at`. An immediate retry cannot succeed. |

Each successful creation uses creation capacity. Deleting the project does not
give it back. See [Errors](https://support.revdoku.com/docs/api#errors).

## Run continuously

These examples run once. Running **Read tickets** again prints the tickets that
are still open. People and other integrations can solve a ticket, so its status
is not a processing checkpoint for your application.

For a recurring consumer, list tickets with `updated_after` set to the newest
`updated_at` that you saw, and follow `pagination.next_cursor` while `has_more`
is `true`. A ticket comes back when it gets a new message, so deduplicate by
message ID.
See [List tickets](https://support.revdoku.com/docs/api-reference/tickets#list-tickets).

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

SDK fields are camelCase: `result.data.message.bodyText`, `message.bodyStatus`, `page.pagination.hasMore`, `page.pagination.nextCursor`. The JSON API uses snake_case.

For API errors, catch `RevdokuError` and read `status`, `code`, `details` and `retryAfter`. The [Create project source](create_project.ts) reports a failed request without repeating it.
