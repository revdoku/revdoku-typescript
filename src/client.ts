import { createHash } from 'node:crypto';
import { DefaultApi, ListEmailsRequest, ListMailboxesRequest, ListMailboxFilesRequest,
  GetEmailRequest, GetEmailAttachmentDownloadUrlRequest } from './apis/DefaultApi';
import { Configuration, ResponseError, RequestOpts, InitOverrideFunction } from './runtime';
import { StartAgentSignupRequest } from './models/StartAgentSignupRequest';
import { VerifyAgentSignupRequest } from './models/VerifyAgentSignupRequest';
import { MailboxCreateOptions } from './models/MailboxCreateOptions';
import { SavedFileResponse } from './models/SavedFileResponse';

export interface RevdokuOptions {
  apiKey?: string;
  accountId?: string;
  /** API origin, without /v1. Defaults to https://api.revdoku.com. */
  baseUrl?: string;
  /** Timeout for each HTTP request, including its response body. Default: 30 seconds. */
  timeoutMs?: number;
}

export interface RequestOptions { signal?: AbortSignal }

export class RevdokuError extends Error {
  constructor(message: string, public readonly status: number,
    public readonly code: string, public readonly details?: unknown,
    public readonly requestId?: string, public readonly retryAfter?: string) {
    super(message);
    this.name = 'RevdokuError';
  }
}

class Api extends DefaultApi {
  protected async request(options: RequestOpts, overrides?: RequestInit | InitOverrideFunction): Promise<Response> {
    try { return await super.request(options, overrides); }
    catch (error) {
      if (!(error instanceof ResponseError)) throw error;
      const body = await error.response.json().catch(() => undefined);
      throw new RevdokuError(body?.error?.message || `HTTP ${error.response.status}`,
        error.response.status, body?.error?.code || 'HTTP_ERROR', body?.error?.details,
        body?.error?.request_id, error.response.headers.get('Retry-After') || undefined);
    }
  }
}

function storageUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('Expected an HTTPS storage URL without credentials');
  return url;
}

/** Node.js client. Mutations are never retried automatically. */
export class Revdoku {
  /** Full generated API for less common operations and HTTP response access. */
  readonly api: DefaultApi;
  private readonly accountId?: string;
  private readonly timeoutMs: number;

  constructor(options: RevdokuOptions = {}) {
    const origin = new URL(options.baseUrl || 'https://api.revdoku.com');
    if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/' ||
      (origin.protocol !== 'https:' && !(origin.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname))))
      throw new Error('baseUrl must be an HTTPS origin without /v1; HTTP is allowed for localhost');
    this.timeoutMs = options.timeoutMs ?? 30_000;
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs <= 0 || this.timeoutMs > 2_147_483_647)
      throw new Error('timeoutMs must be an integer from 1 to 2147483647');
    this.accountId = options.accountId;
    this.api = new Api(new Configuration({ basePath: origin.origin, accessToken: options.apiKey,
      fetchApi: (url, init) => fetch(url, { ...init, redirect: 'error', credentials: 'omit',
        signal: this.signal(init?.signal) }) }));
  }

  private signal(signal?: AbortSignal | null): AbortSignal {
    const timeout = AbortSignal.timeout(this.timeoutMs);
    return signal ? AbortSignal.any([signal, timeout]) : timeout;
  }

  private account<T extends { accountId?: string }>(input: T): T {
    return { ...input, accountId: input.accountId ?? this.accountId };
  }

  signup(input: StartAgentSignupRequest, options: RequestOptions = {}) {
    return this.api.startAgentSignup({ startAgentSignupRequest: input }, options);
  }

  verifySignup(input: VerifyAgentSignupRequest, options: RequestOptions = {}) {
    return this.api.verifyAgentSignup({ verifyAgentSignupRequest: input }, options);
  }

  listMailboxes(input: ListMailboxesRequest = {}, options: RequestOptions = {}) {
    return this.api.listMailboxes(this.account(input), options);
  }

  getMailbox(input: { mailboxId: string; accountId?: string }, options: RequestOptions = {}) {
    return this.api.getMailbox({ id: input.mailboxId, accountId: input.accountId ?? this.accountId }, options);
  }

  createMailbox(input: Omit<MailboxCreateOptions, 'email'> & {
    username?: string; domain?: string; accountId?: string;
  } = {}, options: RequestOptions = {}) {
    const { username, domain, accountId, ...mailbox } = input;
    return this.api.createMailbox({ createMailboxRequest: {
      accountId: accountId ?? this.accountId,
      mailbox: { ...mailbox, ...(username !== undefined || domain !== undefined ? { email: { username, domain } } : {}) }
    } }, options);
  }

  listEmails(input: ListEmailsRequest, options: RequestOptions = {}) {
    return this.api.listEmails(this.account(input), options);
  }

  getEmail(input: GetEmailRequest, options: RequestOptions = {}) {
    return this.api.getEmail(this.account(input), options);
  }

  listFiles(input: Omit<ListMailboxFilesRequest, 'id'> & { mailboxId: string }, options: RequestOptions = {}) {
    const { mailboxId, ...query } = input;
    return this.api.listMailboxFiles(this.account({ ...query, id: mailboxId }), options);
  }

  getAttachmentDownloadUrl(input: GetEmailAttachmentDownloadUrlRequest, options: RequestOptions = {}) {
    return this.api.getEmailAttachmentDownloadUrl(this.account(input), options);
  }

  /** Returns attachment bytes. Does not change shared read status or write local files. */
  async downloadAttachment(input: GetEmailAttachmentDownloadUrlRequest,
    options: RequestOptions & { maxBytes?: number } = {}): Promise<Uint8Array> {
    const maxBytes = options.maxBytes ?? 64 * 1024 * 1024;
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new Error('maxBytes must be a nonnegative safe integer');
    const { data: { download } } = await this.getAttachmentDownloadUrl(input, options);
    if (download.authentication !== 'none') throw new Error('Unexpected download authentication');
    if (download.sizeBytes != null && (!Number.isSafeInteger(download.sizeBytes) || download.sizeBytes < 0))
      throw new Error('Invalid attachment size in download metadata');
    if (download.sizeBytes != null && download.sizeBytes > maxBytes) throw new Error('Attachment exceeds maxBytes');
    const response = await fetch(storageUrl(download.url), { redirect: 'error', credentials: 'omit', signal: this.signal(options.signal) });
    if (response.status !== 200) {
      await response.body?.cancel();
      throw new Error(`Attachment download failed: HTTP ${response.status}`);
    }
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    if (reader) {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > maxBytes) throw new Error('Attachment exceeds maxBytes');
          chunks.push(value);
        }
      } catch (error) { await reader.cancel().catch(() => {}); throw error; }
      finally { reader.releaseLock(); }
    }
    if (download.sizeBytes != null && length !== download.sizeBytes)
      throw new Error('Attachment size does not match the download metadata');
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  }

  /** Uploads bytes and commits a file version. Pass a revision ID to protect concurrent edits. */
  async uploadFile(input: { mailboxId: string; path: string; content: Uint8Array | string;
    contentType?: string; accountId?: string; expectedMailboxRevisionId?: string },
    options: RequestOptions = {}): Promise<SavedFileResponse> {
    if (!input.path || input.path.startsWith('/') || input.path.includes('\\') ||
      input.path.split('/').some(part => !part || part === '..' || part === '.'))
      throw new Error('path must be a mailbox-relative file path');
    const bytes = typeof input.content === 'string' ? Buffer.from(input.content, 'utf8') : Buffer.from(input.content);
    const accountId = input.accountId ?? this.accountId;
    const prepared = await this.api.prepareFileUpload({ prepareFileUploadRequest: {
      mailboxId: input.mailboxId, accountId, path: input.path,
      blob: { filename: input.path.split('/').pop()!, byteSize: bytes.length,
        contentType: input.contentType || 'application/octet-stream', purpose: 'mailbox_file',
        checksum: createHash('md5').update(bytes).digest('base64'), sha256: createHash('sha256').update(bytes).digest('hex') }
    } }, options);
    if (prepared.data.skipped && prepared.data.duplicate && prepared.data.file && prepared.data.version) {
      return { success: true, data: { file: prepared.data.file, version: prepared.data.version,
        created: false, duplicate: true } };
    }
    const upload = prepared.data.directUpload;
    if (!upload || !prepared.data.signedId) throw new Error('Upload preparation did not return a storage destination');
    const headers = new Headers(upload.headers);
    if (headers.has('authorization') || headers.has('cookie')) throw new Error('Unexpected credentials in storage upload headers');
    const response = await fetch(storageUrl(upload.url), { method: 'PUT', headers,
      body: new Uint8Array(bytes).buffer, redirect: 'error', credentials: 'omit', signal: this.signal(options.signal) });
    await response.body?.cancel();
    if (!response.ok) throw new Error(`Storage upload failed: HTTP ${response.status}`);
    return this.api.saveUploadedFile({ id: input.mailboxId, saveUploadedFileRequest: {
      accountId, path: input.path, signedBlobId: prepared.data.signedId,
      expectedMailboxRevisionId: input.expectedMailboxRevisionId
    } }, options);
  }
}
