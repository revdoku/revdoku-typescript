# Revdoku API reference for TypeScript

Generated from the Revdoku OpenAPI. Web version with examples: https://revdoku.com/api/reference.md

```sh
npm install revdoku
```

Node.js 22 or later.

```ts
import { Revdoku, RevdokuError } from 'revdoku';

const client = new Revdoku(); // reads REVDOKU_API_KEY
const { data } = await client.listMailboxes();
```

- Every call returns the API envelope. Read results from `data`.
- Field names are camelCase: `next_cursor` is `nextCursor`.
- API error responses throw `RevdokuError` with `status`, `code`, `message`, `details`, `requestId` and `retryAfter` (seconds). Network, timeout and TLS failures throw `FetchError` from the SDK, with the original error as `cause`.
- Options: `new Revdoku({ apiKey, accountId, baseUrl, timeoutMs })`. `baseUrl` is the origin without `/v1`.
- `client.api` has every operation below. Mutations are never retried automatically.

## Helpers

- `client.listMailboxes(input?)`: List mailboxes.
- `client.getMailbox({ mailboxId })`: Read a mailbox.
- `client.createMailbox({ username?, domain?, title?, accountId? })`: Create a mailbox. Never retry automatically after an uncertain result.
- `client.listEmails({ mailboxId, ...filters })`: List emails. Poll with the saved pagination.nextCursor.
- `client.getEmail({ mailboxId, emailId })`: Read an email.
- `client.listFiles({ mailboxId, ...filters })`: List files.
- `client.getAttachmentDownload({ mailboxId, emailId, attachmentId })`: Get a temporary download link for an attachment.
- `client.downloadAttachment({ mailboxId, emailId, attachmentId }, { maxBytes?, timeoutMs? })`: Download attachment bytes as a Uint8Array.
- `client.uploadFile({ mailboxId, path, content, contentType?, expectedMailboxVersion? }, { timeoutMs? })`: Upload bytes or text and save a file version. `timeoutMs` also limits the storage transfer.

## Authentication

Operations that need no API key run before you have one. They use the generated `DefaultApi` class instead of `Revdoku`, so their errors are `ResponseError`, not `RevdokuError`.

### Email a sign-in code

`POST /v1/agent_auth/request_code` · [web reference](https://revdoku.com/api/reference/authentication.md#email-a-sign-in-code)

`new DefaultApi().requestSignInCode({ requestSignInCodeRequest })`

Needs no API key. Sends a six-digit code to an existing account email. The response is the same for every address, so it never reveals whether an account exists. Create new accounts in the browser at https://app.revdoku.com/users/sign_up.

Body `requestSignInCodeRequest` (`RequestSignInCodeRequest`): `email` (string (email), required), `accountId` (string), `reason` (string or null).

### Exchange a sign-in code for an API key

`POST /v1/agent_auth/verify_code` · [web reference](https://revdoku.com/api/reference/authentication.md#exchange-a-sign-in-code-for-an-api-key)

`new DefaultApi().verifySignInCode({ verifySignInCodeRequest })`

Needs no API key. Creates an AI agent connection for an account owner or administrator. Accounts with two-factor authentication must use browser sign-in.

Body `verifySignInCodeRequest` (`VerifySignInCodeRequest`): `email` (string (email), required), `code` (string, required), `label` (string), `permissionScope` (string: `mailbox_read`, `mailbox_write`, `mailbox_admin`), `mailboxAccess` (string: `all`, `selected`), `mailboxIds` (array of string), `mailboxPermissions` (object), `accountId` (string), `reason` (string or null).

### Exchange a one-time dashboard connection code for an API key

`POST /v1/agent_auth/exchange_grant` · [web reference](https://revdoku.com/api/reference/authentication.md#exchange-a-one-time-dashboard-connection-code-for-an-api-key)

`new DefaultApi().exchangeConnectionGrant({ exchangeConnectionGrantRequest })`

Needs no API key. The dashboard creates the one-time code when a signed-in administrator copies a connection prompt.

Body `exchangeConnectionGrantRequest` (`ExchangeConnectionGrantRequest`): `grantToken` (string, required), `label` (string), `accountId` (string), `reason` (string or null).

### Create a dashboard link for the user

`POST /v1/agent_auth/browser_login_link` · [web reference](https://revdoku.com/api/reference/authentication.md#create-a-dashboard-link-for-the-user)

`client.api.createBrowserLink({ createBrowserLinkRequest })`

Returns a dashboard URL for a path such as /mailboxes. The user signs in normally; the link grants no access.

Body `createBrowserLinkRequest` (`CreateBrowserLinkRequest`): `redirectPath` (string), `accountId` (string), `reason` (string or null).

## Accounts

### Read the connection and selected account

`GET /v1/status` · [web reference](https://revdoku.com/api/reference/accounts.md#read-the-connection-and-selected-account)

`client.api.getStatus()`

Works with every API key, including mailbox-scoped keys. Read quotas with GET /v1/account/limits.

Parameters: `accountId` (string), `reason` (string or null).

### List accounts granted to this credential

`GET /v1/accounts` · [web reference](https://revdoku.com/api/reference/accounts.md#list-accounts-granted-to-this-credential)

`client.api.listAccounts()`

Works with every API key. Lists the account of this credential and the client accounts that an agency owner granted to it. Send an id from this list as account_id to act in that account.

Parameters: `limit` (integer), `cursor` (string).

### Create a client account

`POST /v1/accounts` · [web reference](https://revdoku.com/api/reference/accounts.md#create-a-client-account)

`client.api.createClientAccount({ createClientAccountRequest })`

Requires an agency owner credential with client-account access. The credential default does not change; send the new account_id on later requests.

Body `createClientAccountRequest` (`CreateClientAccountRequest`): `name` (string, required), `clientName` (string), `accountId` (string), `reason` (string or null).

### Read one granted account

`GET /v1/accounts/{account_id}` · [web reference](https://revdoku.com/api/reference/accounts.md#read-one-granted-account)

`client.api.getAccount({ accountId })`

Works with every API key. Returns the name, kind, region and status of one account that this credential can use, and the permissions of the credential in it. Other account IDs return 403.

Parameters: `accountId` (string, required).

### Read effective account limits

`GET /v1/account/limits` · [web reference](https://revdoku.com/api/reference/accounts.md#read-effective-account-limits)

`client.api.getAccountLimits()`

Values come from the plan and account overrides. Zero means no allowance; null means no cap. Storage, mailbox and email traffic allowances are shared within a billing group.

Parameters: `accountId` (string).

## Mailboxes

### List mailboxes

`GET /v1/mailboxes` · [web reference](https://revdoku.com/api/reference/mailboxes.md#list-mailboxes)

`client.listMailboxes()`. Full API: `client.api.listMailboxes()`.

Lists active mailboxes by default, newest first. Counts and pages cover only mailboxes this credential can access. Reads no email content.

Parameters: `accountId` (string), `reason` (string or null), `status` (string: `active`, `archived`, `all`), `q` (string), `limit` (integer), `cursor` (string).

### Create a mailbox

`POST /v1/mailboxes` · [web reference](https://revdoku.com/api/reference/mailboxes.md#create-a-mailbox)

`client.createMailbox({ username, domain, title })`. Full API: `client.api.createMailbox({ createMailboxRequest })`.

Waits until the address can receive email. On revdokumail.com, email.username is a prefix with a permanent 4-character random suffix on every plan; a custom domain takes the exact name. If confirmation does not finish, EMAIL_NOT_READY returns the created mailbox_id in error.details: read that mailbox instead of creating another. The title defaults to email.username; a title that another active mailbox uses returns 409 MAILBOX_TITLE_TAKEN. Never retry a creation automatically.

Body `createMailboxRequest` (`CreateMailboxRequest`): `mailbox` (MailboxCreate), `accountId` (string), `reason` (string or null).

### Read a mailbox

`GET /v1/mailboxes/{mailbox_id}` · [web reference](https://revdoku.com/api/reference/mailboxes.md#read-a-mailbox)

`client.getMailbox({ mailboxId })`. Full API: `client.api.getMailbox({ mailboxId })`.

Reading never changes the mailbox. Read address settings, emails and files through their own endpoints.

Parameters: `mailboxId` (string, required), `accountId` (string), `reason` (string or null).

### Update a mailbox title, description or metadata

`PATCH /v1/mailboxes/{mailbox_id}` · [web reference](https://revdoku.com/api/reference/mailboxes.md#update-a-mailbox-title-description-or-metadata)

`client.api.updateMailbox({ mailboxId, updateMailboxRequest })`

metadata must be a JSON object. It replaces the stored object; {} clears it. Send expected_metadata_version from your last read; a stale value changes nothing and returns MAILBOX_METADATA_CONFLICT. Titles are unique among active mailboxes; a used title returns 409 MAILBOX_TITLE_TAKEN.

Parameters: `mailboxId` (string, required).

Body `updateMailboxRequest` (`UpdateMailboxRequest`): `mailbox` (MailboxUpdate, required), `expectedMetadataVersion` (string), `accountId` (string), `reason` (string or null).

### Permanently delete an archived mailbox

`DELETE /v1/mailboxes/{mailbox_id}` · [web reference](https://revdoku.com/api/reference/mailboxes.md#permanently-delete-an-archived-mailbox)

`client.api.deleteMailbox({ mailboxId, deleteMailboxRequest })`

Archive the mailbox first. Send delete.confirmation from the mailbox read after the user confirms. Large mailboxes finish deleting in the background.

Parameters: `mailboxId` (string, required).

Body `deleteMailboxRequest` (`DeleteMailboxRequest`): `confirmation` (string, required), `accountId` (string), `reason` (string or null).

### Archive a mailbox

`POST /v1/mailboxes/{mailbox_id}/archive` · [web reference](https://revdoku.com/api/reference/mailboxes.md#archive-a-mailbox)

`client.api.archiveMailbox({ mailboxId, actionRequest })`

Archived mailboxes keep their files and emails and become read-only.

Parameters: `mailboxId` (string, required).

Body `actionRequest` (`ActionRequest`): `accountId` (string), `reason` (string or null).

### Unarchive a mailbox

`POST /v1/mailboxes/{mailbox_id}/unarchive` · [web reference](https://revdoku.com/api/reference/mailboxes.md#unarchive-a-mailbox)

`client.api.unarchiveMailbox({ mailboxId, actionRequest })`

Requires mailbox-admin permission. The mailbox becomes writable again. If another active mailbox has the same title, the title gets a number suffix. A mailbox that is not archived returns MAILBOX_NOT_ARCHIVED.

Parameters: `mailboxId` (string, required).

Body `actionRequest` (`ActionRequest`): `accountId` (string), `reason` (string or null).

## Email settings

### Read address settings

`GET /v1/mailboxes/{mailbox_id}/email` · [web reference](https://revdoku.com/api/reference/email-settings.md#read-address-settings)

`client.api.getMailboxEmailSettings({ mailboxId })`

Requires mailbox write permission.

Parameters: `mailboxId` (string, required), `accountId` (string), `reason` (string or null).

### Change the primary address

`POST /v1/mailboxes/{mailbox_id}/email/rotate` · [web reference](https://revdoku.com/api/reference/email-settings.md#change-the-primary-address)

`client.api.changeMailboxAddress({ mailboxId, changeMailboxAddressRequest })`

Requires a paid plan and mailbox admin permission. Send the current address as expected_address. Omit username for a generated name. A custom-domain change returns 202; read the settings until assignment.status is active or failed. For account owners and administrators the old address becomes an alias unless keep_old_as_alias is false. Without a free alias slot the request returns EMAIL_ALIAS_LIMIT; send false to retire the old address.

Parameters: `mailboxId` (string, required).

Body `changeMailboxAddressRequest` (`ChangeMailboxAddressRequest`): `confirm` (boolean `true`, required), `expectedAddress` (string, required), `username` (string), `domain` (string), `keepOldAsAlias` (boolean), `accountId` (string), `reason` (string or null).

### Add an alias address

`POST /v1/mailboxes/{mailbox_id}/email/aliases` · [web reference](https://revdoku.com/api/reference/email-settings.md#add-an-alias-address)

`client.api.createEmailAlias({ mailboxId, createEmailAliasRequest })`

Requires a paid plan and a full-account owner or administrator with mailbox-admin permission. The primary address stays unchanged.

Parameters: `mailboxId` (string, required).

Body `createEmailAliasRequest` (`CreateEmailAliasRequest`): `username` (string, required), `domain` (string), `accountId` (string), `reason` (string or null).

### Remove an alias address

`DELETE /v1/mailboxes/{mailbox_id}/email/aliases/{alias_id}` · [web reference](https://revdoku.com/api/reference/email-settings.md#remove-an-alias-address)

`client.api.deleteEmailAlias({ mailboxId, aliasId })`

Stops new and queued deliveries to the alias. Saved emails stay.

Parameters: `mailboxId` (string, required), `aliasId` (string, required), `accountId` (string), `reason` (string or null).

### Replace the allowed senders

`PATCH /v1/mailboxes/{mailbox_id}/email/allowlist` · [web reference](https://revdoku.com/api/reference/email-settings.md#replace-the-allowed-senders)

`client.api.updateEmailAllowlist({ mailboxId, updateEmailAllowlistRequest })`

Requires an account owner or administrator with mailbox-admin permission. Send sender_allowlist.version from the settings read as expected_version.

Parameters: `mailboxId` (string, required).

Body `updateEmailAllowlistRequest` (`UpdateEmailAllowlistRequest`): `senderAllowlist` (object, required), `expectedVersion` (string, required), `accountId` (string), `reason` (string or null).

### Read the email webhook

`GET /v1/mailboxes/{mailbox_id}/email/webhook` · [web reference](https://revdoku.com/api/reference/email-settings.md#read-the-email-webhook)

`client.api.getEmailWebhook({ mailboxId })`

Requires mailbox-admin permission. webhook is null when no webhook is set. The signing secret is never returned here.

Parameters: `mailboxId` (string, required), `accountId` (string).

### Set the email webhook

`PUT /v1/mailboxes/{mailbox_id}/email/webhook` · [web reference](https://revdoku.com/api/reference/email-settings.md#set-the-email-webhook)

`client.api.setEmailWebhook({ mailboxId, setEmailWebhookRequest })`

Requires mailbox-admin permission and a public HTTPS URL. A new URL or rotate_secret=true creates a new signing secret, returns it once and cancels pending deliveries. The same URL without rotate_secret returns the webhook without a secret.

Parameters: `mailboxId` (string, required).

Body `setEmailWebhookRequest` (`SetEmailWebhookRequest`): `webhookUrl` (string (uri), required), `rotateSecret` (boolean), `accountId` (string), `reason` (string or null).

### Remove the email webhook

`DELETE /v1/mailboxes/{mailbox_id}/email/webhook` · [web reference](https://revdoku.com/api/reference/email-settings.md#remove-the-email-webhook)

`client.api.deleteEmailWebhook({ mailboxId })`

Cancels queued deliveries. A delivery already in progress can finish. Returns the mailbox ID, also when no webhook is set.

Parameters: `mailboxId` (string, required), `accountId` (string).

### Get a live email subscription ticket

`GET /v1/mailboxes/{mailbox_id}/email/subscription` · [web reference](https://revdoku.com/api/reference/email-settings.md#get-a-live-email-subscription-ticket)

`client.api.getEmailSubscription({ mailboxId })`

Requires mailbox read permission. Connect to websocket_url with email_subscription_token=TOKEN within 60 seconds, then subscribe to EmailReceivedChannel. Catch up with the email list cursor after every connect.

Parameters: `mailboxId` (string, required), `accountId` (string).

## Emails

### List emails

`GET /v1/mailboxes/{mailbox_id}/emails` · [web reference](https://revdoku.com/api/reference/emails.md#list-emails)

`client.listEmails({ mailboxId })`. Full API: `client.api.listEmails({ mailboxId })`.

Requires mailbox read permission. Lists received email by default. To poll, list in ascending order, save pagination.next_cursor after every page (including an empty page) and send it next time with the same filters. Listing never marks email read.

Parameters: `mailboxId` (string, required), `accountId` (string), `reason` (string or null), `limit` (integer), `cursor` (string), `order` (string: `asc`, `desc`), `direction` (string: `received`, `sent`, `all`), `sender` (string), `subject` (string), `receivedAfter` (string (date-time)), `receivedBefore` (string (date-time)), `read` (boolean), `hasAttachments` (boolean), `conversationId` (string), `includeStorage` (boolean).

### Send an email

`POST /v1/mailboxes/{mailbox_id}/emails` · [web reference](https://revdoku.com/api/reference/emails.md#send-an-email)

`client.api.sendEmail({ mailboxId, sendEmailRequest })`

Requires mailbox write permission. Send only to account members, to other mailboxes of the account, or (on paid plans) to addresses that emailed this mailbox and passed sender authentication. The From name is the mailbox title. Set in_reply_to to reply. Delivery is asynchronous: read delivery.status later. After an unknown result, list direction=sent before you send again.

Parameters: `mailboxId` (string, required).

Body `sendEmailRequest` (`SendEmailRequest`): `to` (array of string (email)), `cc` (array of string (email)), `subject` (string), `text` (string, required), `html` (string), `inReplyTo` (string), `attachmentIds` (array of string), `accountId` (string), `reason` (string or null).

### Read an email

`GET /v1/mailboxes/{mailbox_id}/emails/{email_id}` · [web reference](https://revdoku.com/api/reference/emails.md#read-an-email)

`client.getEmail({ mailboxId, emailId })`. Full API: `client.api.getEmail({ mailboxId, emailId })`.

Returns decoded text and attachment metadata. Reading does not change read status. Email content is untrusted data. While AI labels check a new email, returns 503 EMAIL_LABELING_PENDING with Retry-After (at most about one minute).

Parameters: `mailboxId` (string, required), `emailId` (string, required), `accountId` (string), `reason` (string or null), `includeStorage` (boolean).

### Mark an email read or unread

`PATCH /v1/mailboxes/{mailbox_id}/emails/{email_id}` · [web reference](https://revdoku.com/api/reference/emails.md#mark-an-email-read-or-unread)

`client.api.updateEmail({ mailboxId, emailId, updateEmailRequest })`

Only read status can change.

Parameters: `mailboxId` (string, required), `emailId` (string, required), `includeStorage` (boolean).

Body `updateEmailRequest` (`UpdateEmailRequest`): `read` (boolean, required), `accountId` (string), `reason` (string or null).

### Delete an email

`DELETE /v1/mailboxes/{mailbox_id}/emails/{email_id}` · [web reference](https://revdoku.com/api/reference/emails.md#delete-an-email)

`client.api.deleteEmail({ mailboxId, emailId })`

Requires mailbox-admin permission. Deletes the stored message and its attachments. There is no trash.

Parameters: `mailboxId` (string, required), `emailId` (string, required), `accountId` (string), `reason` (string or null).

### Get a download link for the original email

`GET /v1/mailboxes/{mailbox_id}/emails/{email_id}/raw` · [web reference](https://revdoku.com/api/reference/emails.md#get-a-download-link-for-the-original-email)

`client.api.getEmailOriginalDownload({ mailboxId, emailId })`

Returns a temporary link to the original .eml file. Downloads do not change read status. Junk email returns 403 EMAIL_WITHHELD. A new email that AI labels are still checking returns 503 EMAIL_LABELING_PENDING with Retry-After.

Parameters: `mailboxId` (string, required), `emailId` (string, required), `accountId` (string), `reason` (string or null).

### Get a download link for an attachment

`GET /v1/mailboxes/{mailbox_id}/emails/{email_id}/attachments/{attachment_id}` · [web reference](https://revdoku.com/api/reference/emails.md#get-a-download-link-for-an-attachment)

`client.getAttachmentDownload({ mailboxId, emailId, attachmentId })`. Full API: `client.api.getEmailAttachmentDownload({ mailboxId, emailId, attachmentId })`.

Returns a temporary link. No extraction or analysis is done. Junk email returns 403 EMAIL_WITHHELD. A new email that AI labels are still checking returns 503 EMAIL_LABELING_PENDING with Retry-After.

Parameters: `mailboxId` (string, required), `emailId` (string, required), `attachmentId` (string, required), `accountId` (string), `reason` (string or null).

## Files

### Prepare a file upload (step 1 of 3)

`POST /v1/direct_uploads` · [web reference](https://revdoku.com/api/reference/files.md#prepare-a-file-upload-step-1-of-3)

`client.uploadFile({ mailboxId, path, content })` (runs all three upload steps). Full API: `client.api.prepareFileUpload({ prepareFileUploadRequest })`.

Returns a storage URL. Then PUT the bytes to direct_upload.url with exactly direct_upload.headers and no API key (step 2), and save the file with POST /v1/mailboxes/{mailbox_id}/files (step 3). Identical content at the same path returns skipped=true and duplicate=true without an upload.

Body `prepareFileUploadRequest` (`PrepareFileUploadRequest`): `mailboxId` (string, required), `path` (string, required), `existingFilePolicy` (string: `replace`, `skip`), `blob` (UploadBlob, required), `accountId` (string), `reason` (string or null).

### List files

`GET /v1/mailboxes/{mailbox_id}/files` · [web reference](https://revdoku.com/api/reference/files.md#list-files)

`client.listFiles({ mailboxId })`. Full API: `client.api.listFiles({ mailboxId })`.

Lists current files, including stored emails under _email/. Listing never marks files read.

Parameters: `mailboxId` (string, required), `accountId` (string), `reason` (string or null), `q` (string), `folder` (string), `limit` (integer), `cursor` (string).

### Save an uploaded file (step 3 of 3)

`POST /v1/mailboxes/{mailbox_id}/files` · [web reference](https://revdoku.com/api/reference/files.md#save-an-uploaded-file-step-3-of-3)

`client.uploadFile({ mailboxId, path, content })` (runs all three upload steps). Full API: `client.api.saveUploadedFile({ mailboxId, saveUploadedFileRequest })`.

Saves the uploaded blob at path. An existing path gets a new version.

Parameters: `mailboxId` (string, required).

Body `saveUploadedFileRequest` (`SaveUploadedFileRequest`): `path` (string, required), `signedBlobId` (string, required), `name` (string), `role` (string: `source`, `reference`, `generated`, `agent_output`, `export`, `artifact`), `existingFilePolicy` (string: `replace`, `skip`), `expectedMailboxVersion` (string), `accountId` (string), `reason` (string or null).

### Find a file by path

`GET /v1/mailboxes/{mailbox_id}/files/by_path` · [web reference](https://revdoku.com/api/reference/files.md#find-a-file-by-path)

`client.api.getFileByPath({ mailboxId, path })`

Returns file metadata only. Read content with the download endpoint. The disposition and content_url parameters return INVALID_ARGUMENT.

Parameters: `mailboxId` (string, required), `path` (string, required), `accountId` (string), `reason` (string or null).

### Append text to a file

`POST /v1/mailboxes/{mailbox_id}/files/append_text` · [web reference](https://revdoku.com/api/reference/files.md#append-text-to-a-file)

`client.api.appendText({ mailboxId, appendTextRequest })`

Appends UTF-8 text to an existing text file and creates a new version. A missing file returns MAILBOX_FILE_NOT_FOUND.

Parameters: `mailboxId` (string, required).

Body `appendTextRequest` (`AppendTextRequest`): `path` (string, required), `content` (string, required), `newlineBefore` (boolean), `expectedMailboxVersion` (string), `accountId` (string), `reason` (string or null).

### Read file metadata

`GET /v1/mailboxes/{mailbox_id}/files/{file_id}` · [web reference](https://revdoku.com/api/reference/files.md#read-file-metadata)

`client.api.getFile({ mailboxId, fileId })`

Reading metadata never marks the file read.

Parameters: `mailboxId` (string, required), `fileId` (string, required), `accountId` (string), `reason` (string or null).

### Delete a file

`DELETE /v1/mailboxes/{mailbox_id}/files/{file_id}` · [web reference](https://revdoku.com/api/reference/files.md#delete-a-file)

`client.api.deleteFile({ mailboxId, fileId })`

Requires mailbox-admin permission. Files under _email/ return EMAIL_PATH_READ_ONLY; delete the email instead.

Parameters: `mailboxId` (string, required), `fileId` (string, required), `accountId` (string), `reason` (string or null).

### Get a download link for a file

`GET /v1/mailboxes/{mailbox_id}/files/{file_id}/download` · [web reference](https://revdoku.com/api/reference/files.md#get-a-download-link-for-a-file)

`client.api.getFileDownload({ mailboxId, fileId })`

Returns a temporary link and marks this version read. Send version_id for an older version.

Parameters: `mailboxId` (string, required), `fileId` (string, required), `versionId` (string), `accountId` (string), `reason` (string or null).

### Rename or move a file in the same mailbox

`POST /v1/mailboxes/{mailbox_id}/files/{file_id}/rename` · [web reference](https://revdoku.com/api/reference/files.md#rename-or-move-a-file-in-the-same-mailbox)

`client.api.renameFile({ mailboxId, fileId, renameFileRequest })`

Changes the path without uploading the content again.

Parameters: `mailboxId` (string, required), `fileId` (string, required).

Body `renameFileRequest` (`RenameFileRequest`): `newPath` (string, required), `accountId` (string), `reason` (string or null).

### Move a file

`POST /v1/mailboxes/{mailbox_id}/files/{file_id}/move` · [web reference](https://revdoku.com/api/reference/files.md#move-a-file)

`client.api.moveFile({ mailboxId, fileId, moveFileRequest })`

Works in the same mailbox or into target_mailbox_id. Content is not uploaded again. Send target_path for an exact path or target_folder to keep the name.

Parameters: `mailboxId` (string, required), `fileId` (string, required).

Body `moveFileRequest` (`MoveFileRequest`): `targetMailboxId` (string), `targetPath` (string), `targetFolder` (string), `accountId` (string), `reason` (string or null).

### Copy a file

`POST /v1/mailboxes/{mailbox_id}/files/{file_id}/copy` · [web reference](https://revdoku.com/api/reference/files.md#copy-a-file)

`client.api.copyFile({ mailboxId, fileId, moveFileRequest })`

Works in the same mailbox or into target_mailbox_id. Content is not uploaded again. Send target_path for an exact path or target_folder to keep the name.

Parameters: `mailboxId` (string, required), `fileId` (string, required).

Body `moveFileRequest` (`MoveFileRequest`): `targetMailboxId` (string), `targetPath` (string), `targetFolder` (string), `accountId` (string), `reason` (string or null).

### List file versions

`GET /v1/mailboxes/{mailbox_id}/files/{file_id}/versions` · [web reference](https://revdoku.com/api/reference/files.md#list-file-versions)

`client.api.listFileVersions({ mailboxId, fileId })`

Newest first.

Parameters: `mailboxId` (string, required), `fileId` (string, required), `accountId` (string), `reason` (string or null), `limit` (integer), `cursor` (string).

### Restore a file version

`POST /v1/mailboxes/{mailbox_id}/files/{file_id}/versions/{version_id}/restore` · [web reference](https://revdoku.com/api/reference/files.md#restore-a-file-version)

`client.api.restoreFileVersion({ mailboxId, fileId, versionId, actionRequest })`

Creates a new current version with the content of the selected version. History is kept. Requires a plan with version restore.

Parameters: `mailboxId` (string, required), `fileId` (string, required), `versionId` (string, required).

Body `actionRequest` (`ActionRequest`): `accountId` (string), `reason` (string or null).

### Start a batch upload

`POST /v1/mailboxes/{mailbox_id}/upload_sessions` · [web reference](https://revdoku.com/api/reference/files.md#start-a-batch-upload)

`client.api.createUploadSession({ mailboxId, createUploadSessionRequest })`

Starts an upload session for many files and returns storage targets for the first files. The session locks the mailbox for other writers; incoming email still arrives. Send files in batches with POST .../uploads, PUT the bytes to each upload.url, save each batch with POST .../finalize_batch, then call POST .../finalize. Unsaved uploads are discarded when the session expires.

Parameters: `mailboxId` (string, required).

Body `createUploadSessionRequest` (`CreateUploadSessionRequest`): `files` (array of UploadSessionFile), `expectedFileCount` (integer), `clientSessionKey` (string), `existingFilePolicy` (string: `replace`, `skip`), `expectedMailboxVersion` (string), `accountId` (string), `reason` (string or null).

### Get storage targets for a batch

`POST /v1/mailboxes/{mailbox_id}/upload_sessions/{session_id}/uploads` · [web reference](https://revdoku.com/api/reference/files.md#get-storage-targets-for-a-batch)

`client.api.addUploadSessionFiles({ mailboxId, sessionId, addUploadSessionFilesRequest })`

Returns upload.url and upload.headers for each file that needs bytes. Repeating a path returns a fresh target, for example after a failed PUT. Files with identical content are skipped.

Parameters: `mailboxId` (string, required), `sessionId` (string, required).

Body `addUploadSessionFilesRequest` (`AddUploadSessionFilesRequest`): `files` (array of UploadSessionFile, required), `accountId` (string), `reason` (string or null).

### Save uploaded files

`POST /v1/mailboxes/{mailbox_id}/upload_sessions/{session_id}/finalize_batch` · [web reference](https://revdoku.com/api/reference/files.md#save-uploaded-files)

`client.api.saveUploadSessionBatch({ mailboxId, sessionId })`

Saves up to limit files whose bytes were uploaded. Call it after each batch to keep each request short. DIRECT_UPLOAD_NOT_FOUND names a file whose bytes are missing in error.details.path; upload it again and retry.

Parameters: `mailboxId` (string, required), `sessionId` (string, required).

Body `saveUploadSessionBatchRequest` (`SaveUploadSessionBatchRequest`, optional): `limit` (integer), `accountId` (string), `reason` (string or null).

### Finish or cancel a batch upload

`POST /v1/mailboxes/{mailbox_id}/upload_sessions/{session_id}/finalize` · [web reference](https://revdoku.com/api/reference/files.md#finish-or-cancel-a-batch-upload)

`client.api.finalizeUploadSession({ mailboxId, sessionId })`

complete=true saves the remaining uploaded files, creates one mailbox version and releases the lock. A 202 response with finalize_pending=true means more files remain: call finalize again after Retry-After. complete=false cancels the session and discards its unsaved files. Finalizing a finished session returns it unchanged.

Parameters: `mailboxId` (string, required), `sessionId` (string, required).

Body `finalizeUploadSessionRequest` (`FinalizeUploadSessionRequest`, optional): `complete` (boolean), `accountId` (string), `reason` (string or null).

## Email domains

### List custom email domains

`GET /v1/account/email_domains` · [web reference](https://revdoku.com/api/reference/email-domains.md#list-custom-email-domains)

`client.api.listEmailDomains()`

Requires a full-account owner or administrator credential.

Parameters: `accountId` (string), `limit` (integer), `cursor` (string).

### Connect a custom email domain

`POST /v1/account/email_domains` · [web reference](https://revdoku.com/api/reference/email-domains.md#connect-a-custom-email-domain)

`client.api.createEmailDomain({ createEmailDomainRequest })`

Claims an exact hostname and returns the DNS records to publish. Never change DNS without the domain owner's authorization.

Body `createEmailDomainRequest` (`CreateEmailDomainRequest`): `hostname` (string, required), `accountId` (string), `reason` (string or null).

### Check a hostname for conflicting DNS

`POST /v1/account/email_domains/check` · [web reference](https://revdoku.com/api/reference/email-domains.md#check-a-hostname-for-conflicting-dns)

`client.api.checkEmailDomain({ createEmailDomainRequest })`

Makes no claim and changes no DNS. If the root domain already receives email, use an unused subdomain such as inbox.example.com.

Body `createEmailDomainRequest` (`CreateEmailDomainRequest`): `hostname` (string, required), `accountId` (string), `reason` (string or null).

### Read a custom email domain

`GET /v1/account/email_domains/{domain_id}` · [web reference](https://revdoku.com/api/reference/email-domains.md#read-a-custom-email-domain)

`client.api.getEmailDomain({ domainId })`

Requires a full-account owner or administrator credential. Returns the domain status and the DNS records to publish.

Parameters: `domainId` (string, required), `accountId` (string).

### Remove an unused custom email domain

`DELETE /v1/account/email_domains/{domain_id}` · [web reference](https://revdoku.com/api/reference/email-domains.md#remove-an-unused-custom-email-domain)

`client.api.deleteEmailDomain({ domainId, deleteEmailDomainRequest })`

Send the domain hostname and confirm=true. A domain that mailbox addresses still use returns EMAIL_DOMAIN_IN_USE.

Parameters: `domainId` (string, required).

Body `deleteEmailDomainRequest` (`DeleteEmailDomainRequest`): `hostname` (string, required), `confirm` (boolean `true`, required), `accountId` (string), `reason` (string or null).

### Check DNS and provider setup again

`POST /v1/account/email_domains/{domain_id}/verify` · [web reference](https://revdoku.com/api/reference/email-domains.md#check-dns-and-provider-setup-again)

`client.api.verifyEmailDomain({ domainId, verifyEmailDomainRequest })`

Queues the check and returns the current state. Read the domain again to see the result.

Parameters: `domainId` (string, required).

Body `verifyEmailDomainRequest` (`VerifyEmailDomainRequest`): `accountId` (string), `reason` (string or null).
