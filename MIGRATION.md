# Upgrade from v1 to v2

This is a major SDK release. Recompile your application against v2 before deployment.
The REST paths remain unchanged.

| Change | Update your integration |
| --- | --- |
| Signup accepts `email` and `accept_terms_and_policy` | Remove username, key label and permission-scope options. Signup generates the first mailbox address. |
| Verification returns `SignupResponse` | Save `data.api_key` from the first successful verification. Repeated verification returns completion details without the key. |
| `downloadEmailAttachment` and `downloadEmailOriginal` are renamed | Use `getEmailAttachmentDownloadUrl` and `getEmailOriginalDownloadUrl` (with your language's naming convention). They return temporary URL descriptors. |
| Nested mailbox creation models have readable names | Use `MailboxCreateOptions` and `MailboxEmailOptions` instead of the generated `CreateMailboxRequestMailbox*` names. |
| File and domain results have named models | Use their typed fields instead of untyped dictionaries. User metadata still accepts arbitrary JSON. |
| Node.js requires version 22+ | Import `Revdoku` from `@revdoku/api`. The full generated API is available as `client.api`. `DefaultApi` remains exported. |
| Go uses a v2 module | Import `github.com/revdoku/revdoku-go/v2`. |

The Node client returns the API's `data` envelope. It converts JSON field names to
camelCase, so `api_key` becomes `apiKey`. `downloadAttachment` returns bytes;
`getAttachmentDownloadUrl` returns a descriptor. The client does not retry writes.
