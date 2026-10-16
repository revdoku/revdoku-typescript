import { createHash } from 'node:crypto';
import { DefaultApi, ListEmailsRequest, ListMailboxesRequest, ListFilesRequest, GetMailboxRequest,
  GetEmailRequest, GetEmailAttachmentDownloadRequest } from './apis/DefaultApi';
import { Configuration, ResponseError, RequestOpts, InitOverrideFunction } from './runtime';
import { MailboxCreate } from './models/MailboxCreate';
import { SaveUploadedFile201Response } from './models/SaveUploadedFile201Response';

export interface RevdokuOptions {
  /** API key. Defaults to the REVDOKU_API_KEY environment variable. */
  apiKey?: string;
  accountId?: string;
  /** API origin, without /v1. Defaults to https://api.revdoku.com. */
  baseUrl?: string;
  /** Timeout for each HTTP request, including its response body. Default: 30 seconds. */
  timeoutMs?: number;
}

export interface RequestOptions { signal?: AbortSignal }

/** Options of the calls that transfer file bytes to or from storage. */
export interface TransferOptions extends RequestOptions {
  /** Timeout for each request of this call, including the storage transfer. Default: the client `timeoutMs`. */
  timeoutMs?: number;
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
// Carries a per-call timeout from the request options to the fetch function.
const TIMEOUT = Symbol('timeoutMs');
type CallInit = RequestInit & { [TIMEOUT]?: number };

function checkTimeout(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0 || value > 2_147_483_647)
    throw new Error(`${name} must be an integer from 1 to 2147483647`);
  return value;
}

const HTTP_DATE = /^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/;

/** The Retry-After header in whole seconds: a number of seconds or an HTTP date. */
function retryAfterSeconds(value: string | null): number | undefined {
  const text = value?.trim() ?? '';
  if (/^\d+$/.test(text)) return Number(text);
  const date = HTTP_DATE.test(text) ? Date.parse(text) : NaN;
  return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

export class RevdokuError extends Error {
  /** `retryAfter` is the Retry-After header in seconds, when present. */
  constructor(message: string, public readonly status: number,
    public readonly code: string, public readonly details?: unknown,
    public readonly requestId?: string, public readonly retryAfter?: number) {
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
        body?.error?.request_id, retryAfterSeconds(error.response.headers.get('Retry-After')));
    }
  }
}

/** Node.js client. Mutations are never retried automatically. */
export class Revdoku {
  /** Full generated API for less common operations and HTTP response access. */
  readonly api: DefaultApi;
  private readonly accountId?: string;
  private readonly timeoutMs: number;
  /** Local development storage can use HTTP only when the API itself does. */
  private readonly localHttp: boolean;

  constructor(options: RevdokuOptions = {}) {
    const origin = new URL(options.baseUrl || 'https://api.revdoku.com');
    if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/' ||
      (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && LOCAL_HOSTS.includes(origin.hostname))))
      throw new Error('baseUrl must be an HTTPS origin without /v1; HTTP is allowed for localhost');
    this.timeoutMs = checkTimeout(options.timeoutMs ?? 30_000, 'timeoutMs');
    this.localHttp = origin.protocol === 'http:';
    const apiKey = options.apiKey ?? process.env.REVDOKU_API_KEY;
    if (!apiKey) throw new Error('Set apiKey or REVDOKU_API_KEY');
    this.accountId = options.accountId;
    this.api = new Api(new Configuration({ basePath: origin.origin, accessToken: apiKey,
      fetchApi: (url, init) => {
        const { [TIMEOUT]: timeoutMs, ...rest } = (init ?? {}) as CallInit;
        return fetch(url, { ...rest, redirect: 'error', credentials: 'omit', signal: this.signal(rest.signal, timeoutMs) });
      } }));
  }

  private signal(signal?: AbortSignal | null, timeoutMs = this.timeoutMs): AbortSignal {
    const timeout = AbortSignal.timeout(timeoutMs);
    return signal ? AbortSignal.any([signal, timeout]) : timeout;
  }

  /** Request options for the API calls of a transfer, with its timeout. */
  private transfer(options: TransferOptions): { init: CallInit; timeoutMs: number } {
    const timeoutMs = options.timeoutMs === undefined ? this.timeoutMs : checkTimeout(options.timeoutMs, 'timeoutMs');
    return { init: { signal: options.signal, [TIMEOUT]: timeoutMs }, timeoutMs };
  }

  private storageUrl(value: string): URL {
    const url = new URL(value);
    const local = this.localHttp && url.protocol === 'http:' && LOCAL_HOSTS.includes(url.hostname);
    if ((url.protocol !== 'https:' && !local) || url.username || url.password)
      throw new Error('Expected an HTTPS storage URL without credentials');
    return url;
  }

  private account<T extends { accountId?: string }>(input: T): T {
    return { ...input, accountId: input.accountId ?? this.accountId };
  }

  listMailboxes(input: ListMailboxesRequest = {}, options: RequestOptions = {}) {
    return this.api.listMailboxes(this.account(input), options);
  }

  getMailbox(input: GetMailboxRequest, options: RequestOptions = {}) {
    return this.api.getMailbox(this.account(input), options);
  }

  createMailbox(input: Omit<MailboxCreate, 'email'> & {
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

  listFiles(input: ListFilesRequest, options: RequestOptions = {}) {
    return this.api.listFiles(this.account(input), options);
  }

  getAttachmentDownload(input: GetEmailAttachmentDownloadRequest, options: RequestOptions = {}) {
    return this.api.getEmailAttachmentDownload(this.account(input), options);
  }

  /**
   * Returns attachment bytes. Does not change shared read status or write local files.
   * `timeoutMs` applies to the API call and to the storage download.
   */
  async downloadAttachment(input: GetEmailAttachmentDownloadRequest,
    options: TransferOptions & { maxBytes?: number } = {}): Promise<Uint8Array> {
    const maxBytes = options.maxBytes ?? 64 * 1024 * 1024;
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new Error('maxBytes must be a nonnegative safe integer');
    const { init, timeoutMs } = this.transfer(options);
    const { data: { download } } = await this.api.getEmailAttachmentDownload(this.account(input), init);
    if (download.sizeBytes != null && (!Number.isSafeInteger(download.sizeBytes) || download.sizeBytes < 0))
      throw new Error('Invalid attachment size in download metadata');
    if (download.sizeBytes != null && download.sizeBytes > maxBytes) throw new Error('Attachment exceeds maxBytes');
    const response = await fetch(this.storageUrl(download.url), { redirect: 'error', credentials: 'omit',
      signal: this.signal(options.signal, timeoutMs) });
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

  /**
   * Uploads bytes and commits a file version. Pass the mailbox version_id to protect concurrent edits.
   * `timeoutMs` applies to each API call and to the storage upload.
   */
  async uploadFile(input: { mailboxId: string; path: string; content: Uint8Array | string;
    contentType?: string; accountId?: string; expectedMailboxVersion?: string },
    options: TransferOptions = {}): Promise<SaveUploadedFile201Response> {
    if (!input.path || input.path.startsWith('/') || input.path.includes('\\') ||
      input.path.split('/').some(part => !part || part === '..' || part === '.'))
      throw new Error('path must be a mailbox-relative file path');
    if (typeof input.content !== 'string' && !(input.content instanceof Uint8Array))
      throw new TypeError('content must be a string or a Uint8Array');
    const { init, timeoutMs } = this.transfer(options);
    const bytes = typeof input.content === 'string' ? Buffer.from(input.content, 'utf8') : Buffer.from(input.content);
    const accountId = input.accountId ?? this.accountId;
    const prepared = await this.api.prepareFileUpload({ prepareFileUploadRequest: {
      mailboxId: input.mailboxId, accountId, path: input.path,
      blob: { filename: input.path.split('/').pop()!, byteSize: bytes.length,
        contentType: input.contentType || 'application/octet-stream', purpose: 'mailbox_file',
        checksum: createHash('md5').update(bytes).digest('base64'), sha256: createHash('sha256').update(bytes).digest('hex') }
    } }, init);
    if (prepared.data.skipped && prepared.data.duplicate && prepared.data.file && prepared.data.version) {
      return { success: true, data: { file: prepared.data.file, version: prepared.data.version,
        created: false, duplicate: true } };
    }
    const upload = prepared.data.directUpload;
    if (!upload || !prepared.data.signedId) throw new Error('Upload preparation did not return a storage destination');
    const headers = new Headers(upload.headers);
    if (headers.has('authorization') || headers.has('cookie')) throw new Error('Unexpected credentials in storage upload headers');
    const response = await fetch(this.storageUrl(upload.url), { method: 'PUT', headers,
      body: new Uint8Array(bytes).buffer, redirect: 'error', credentials: 'omit', signal: this.signal(options.signal, timeoutMs) });
    await response.body?.cancel();
    if (!response.ok) throw new Error(`Storage upload failed: HTTP ${response.status}`);
    return this.api.saveUploadedFile({ mailboxId: input.mailboxId, saveUploadedFileRequest: {
      accountId, path: input.path, signedBlobId: prepared.data.signedId,
      expectedMailboxVersion: input.expectedMailboxVersion
    } }, init);
  }
}
