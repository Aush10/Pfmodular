import type { PF1Character } from '../types/character';
import type {
  LoadedCharacter,
  SaveReceipt,
  StorageAdapter,
  StorageResult,
  StorageStatus,
  StoredCharacterSummary,
  StoredPlayer,
} from './types';

/** Browser-only folder storage. Call pickFolderAndOpen from a user gesture. */
export const STORAGE_ROOT_NAME = 'AIgamesheet';
export const STORAGE_USERS_NAME = 'pfmusers';
export const STORAGE_CRASH_NAME = 'Crash';
export const CHARACTER_FILE_NAME = 'character.json';

const CHARACTER_FORMAT = 'pf1e-character';
const PROJECTION_FORMAT = 'pf1e-storage-projection';
const DEFAULT_SCHEMA_VERSION = 1;
const DEFAULT_APP_VERSION = '0.0.0';
const MAX_SEGMENT_LENGTH = 60;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_JSON_DEPTH = 64;
const MAX_JSON_NODES = 100_000;
const MAX_ARRAY_ITEMS = 50_000;
const MAX_OBJECT_KEYS = 20_000;
const MAX_BACKUPS_PER_FILE = 10;

const WINDOWS_DEVICE_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const WINDOWS_DEVICE_BASENAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const FORBIDDEN_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const SYSTEM_FOLDER_NAMES = new Set([
  'windows',
  'program files',
  'program files (x86)',
  'users',
  'system32',
  'appdata',
  '$recycle.bin',
  '$winreagent',
  'recovery',
  'boot',
]);

type PermissionValue = 'granted' | 'prompt' | 'denied';

export interface FsFileLike {
  size: number;
  text(): Promise<string>;
}

export interface FsWritableFileLike {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

export interface FsFileHandleLike {
  kind?: 'file';
  name?: string;
  getFile(): Promise<FsFileLike>;
  createWritable(): Promise<FsWritableFileLike>;
}

export interface FsDirectoryHandleLike {
  kind?: 'directory';
  name: string;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FsDirectoryHandleLike>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FsFileHandleLike>;
  entries?(): AsyncIterableIterator<[string, FsDirectoryHandleLike | FsFileHandleLike]>;
  removeEntry?(name: string, options?: { recursive?: boolean }): Promise<void>;
  queryPermission?(descriptor?: { mode: 'readwrite' }): Promise<PermissionValue>;
  requestPermission?(descriptor?: { mode: 'readwrite' }): Promise<PermissionValue>;
}

export interface DirectoryHandleStore {
  get(): Promise<FsDirectoryHandleLike | undefined>;
  set(handle: FsDirectoryHandleLike): Promise<void>;
}

export interface FsStorageAdapterOptions {
  folderPicker?: (options?: { mode: 'readwrite' }) => Promise<FsDirectoryHandleLike>;
  handleStore?: DirectoryHandleStore;
  appVersion?: string;
  schemaVersion?: number;
  now?: () => Date;
}

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

interface StoredEnvelope {
  format: string;
  schemaVersion: number;
  appVersion: string;
  savedAt: string;
  sha256: string;
  characterId?: string;
  data: JsonValue;
}

interface CharacterLayout {
  root: FsDirectoryHandleLike;
  images: FsDirectoryHandleLike;
  dslMacros: FsDirectoryHandleLike;
  dslStepper: FsDirectoryHandleLike;
  dslXdx: FsDirectoryHandleLike;
  srd: FsDirectoryHandleLike;
  ai: FsDirectoryHandleLike;
  aiReadOnly: FsDirectoryHandleLike;
  notebook: FsDirectoryHandleLike;
  tools: FsDirectoryHandleLike;
  modules: FsDirectoryHandleLike;
  backups: FsDirectoryHandleLike;
}

class StorageFault extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'StorageFault';
  }
}

function failure(code: string, message: string): StorageResult<never> {
  return { ok: false, error: { code, message } };
}

function toFailure(error: unknown): StorageResult<never> {
  if (error instanceof StorageFault) {
    return failure(error.code, error.message);
  }
  return failure('STORAGE_ERROR', 'The folder storage operation could not be completed.');
}

function assert(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) {
    throw new StorageFault(code, message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNotFound(error: unknown): boolean {
  return isRecord(error) && (error.name === 'NotFoundError' || error.code === 'ENOENT');
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const providerCredential = /(?:openai|gemini|google|anthropic|claude|azure|mistral|cohere|groq|together|deepseek)(?:api)?(?:key|token)$/;
  return (
    normalized === 'env' ||
    normalized === 'environment' ||
    normalized === 'processenv' ||
    normalized === 'envvars' ||
    normalized === 'environmentvariables' ||
    normalized === 'environmentvalues' ||
    normalized.startsWith('sessionstorage') ||
    normalized === 'token' ||
    normalized === 'accesstoken' ||
    normalized === 'authtoken' ||
    normalized === 'apitoken' ||
    normalized === 'aikey' ||
    normalized === 'key' ||
    normalized.endsWith('apikey') ||
    normalized.endsWith('aikey') ||
    normalized.endsWith('apitoken') ||
    normalized.endsWith('authtoken') ||
    providerCredential.test(normalized) ||
    normalized.includes('secret') ||
    normalized.includes('password') ||
    normalized.includes('credential') ||
    normalized === 'authorization'
  );
}

/** Produces one Windows-safe folder segment; it never resolves a path. */
export function sanitizePathSegment(value: string): string | null {
  if (typeof value !== 'string') return null;

  const stripped = value
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '')
    .replace(/(?:\.\.)+/g, '')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, MAX_SEGMENT_LENGTH)
    .replace(/[. ]+$/g, '');

  const baseName = stripped.split('.')[0].replace(/[. ]+$/g, '');
  return !stripped || WINDOWS_DEVICE_NAME.test(stripped) || WINDOWS_DEVICE_BASENAME.test(baseName) ? null : stripped;
}

function isSafeStoredSegment(value: string): boolean {
  return sanitizePathSegment(value) === value;
}

function assertAllowedEntityName(value: string, scope: 'player' | 'character'): string {
  const safe = sanitizePathSegment(value);
  assert(safe, 'INVALID_NAME', 'Use a non-empty player or character name that is valid for a Windows folder.');
  if (scope === 'player' && safe.toLowerCase() === STORAGE_CRASH_NAME.toLowerCase()) {
    throw new StorageFault('RESERVED_NAME', '"Crash" is reserved for recovery data and cannot be a player folder.');
  }
  if (scope === 'character' && ['settings', 'dsl'].includes(safe.toLowerCase())) {
    throw new StorageFault('RESERVED_NAME', 'This character name is reserved by the storage layout.');
  }
  return safe;
}

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(',')}}`;
}

function cloneForStorage(value: unknown, depth = 0, nodes = { count: 0 }): JsonValue {
  assert(depth <= MAX_JSON_DEPTH, 'DATA_TOO_DEEP', 'Saved data is nested too deeply.');
  nodes.count += 1;
  assert(nodes.count <= MAX_JSON_NODES, 'DATA_TOO_LARGE', 'Saved data contains too many values.');

  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    assert(Number.isFinite(value), 'INVALID_DATA', 'Saved data contains an invalid number.');
    return value;
  }
  if (Array.isArray(value)) {
    assert(value.length <= MAX_ARRAY_ITEMS, 'DATA_TOO_LARGE', 'Saved data contains an oversized list.');
    return value.map((item) => cloneForStorage(item, depth + 1, nodes));
  }

  assert(isRecord(value), 'INVALID_DATA', 'Saved data must be plain JSON-compatible data.');
  const keys = Object.keys(value);
  assert(keys.length <= MAX_OBJECT_KEYS, 'DATA_TOO_LARGE', 'Saved data contains an oversized object.');
  const output: { [key: string]: JsonValue } = Object.create(null) as { [key: string]: JsonValue };
  for (const key of keys) {
    assert(!FORBIDDEN_JSON_KEYS.has(key), 'UNSAFE_DATA', `Saved data contains a forbidden key: ${key}.`);
    // Do not persist credentials, environment values, or browser session data.
    if (isSensitiveKey(key)) continue;
    const item = value[key];
    if (typeof item !== 'undefined') output[key] = cloneForStorage(item, depth + 1, nodes);
  }
  return output;
}

function validateLoadedJson(value: unknown, depth = 0, nodes = { count: 0 }): asserts value is JsonValue {
  assert(depth <= MAX_JSON_DEPTH, 'DATA_TOO_DEEP', 'The stored JSON is nested too deeply.');
  nodes.count += 1;
  assert(nodes.count <= MAX_JSON_NODES, 'DATA_TOO_LARGE', 'The stored JSON contains too many values.');

  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    assert(Number.isFinite(value), 'INVALID_DATA', 'The stored JSON contains an invalid number.');
    return;
  }
  if (Array.isArray(value)) {
    assert(value.length <= MAX_ARRAY_ITEMS, 'DATA_TOO_LARGE', 'The stored JSON contains an oversized list.');
    for (const item of value) validateLoadedJson(item, depth + 1, nodes);
    return;
  }

  assert(isRecord(value), 'INVALID_DATA', 'The stored JSON has an unsupported value.');
  const keys = Object.keys(value);
  assert(keys.length <= MAX_OBJECT_KEYS, 'DATA_TOO_LARGE', 'The stored JSON contains an oversized object.');
  for (const key of keys) {
    assert(!FORBIDDEN_JSON_KEYS.has(key), 'UNSAFE_DATA', `The stored JSON contains a forbidden key: ${key}.`);
    validateLoadedJson(value[key], depth + 1, nodes);
  }
}

function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function assertFileSize(text: string): void {
  assert(encodeUtf8(text).byteLength <= MAX_FILE_BYTES, 'FILE_TOO_LARGE', 'The storage file exceeds the 5 MiB safety limit.');
}

async function sha256(value: JsonValue): Promise<string> {
  const cryptoApi = globalThis.crypto;
  assert(cryptoApi?.subtle, 'CRYPTO_UNAVAILABLE', 'Web Crypto is required to verify saved data.');
  const encoded = encodeUtf8(canonicalJson(value));
  const bytes = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(bytes).set(encoded);
  const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createCharacterId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  assert(cryptoApi?.getRandomValues, 'CRYPTO_UNAVAILABLE', 'Web Crypto is required to create a character ID.');
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function openHandleDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pf1e-folder-storage', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('handles')) {
        request.result.createObjectStore('handles');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function createIndexedDbHandleStore(): DirectoryHandleStore {
  return {
    async get(): Promise<FsDirectoryHandleLike | undefined> {
      if (typeof indexedDB === 'undefined') return undefined;
      const database = await openHandleDatabase();
      try {
        const transaction = database.transaction('handles', 'readonly');
        const value = await requestToPromise(transaction.objectStore('handles').get('root'));
        await transactionToPromise(transaction);
        return value as FsDirectoryHandleLike | undefined;
      } finally {
        database.close();
      }
    },
    async set(handle: FsDirectoryHandleLike): Promise<void> {
      assert(typeof indexedDB !== 'undefined', 'INDEXED_DB_UNAVAILABLE', 'IndexedDB is required to remember the selected folder.');
      const database = await openHandleDatabase();
      try {
        const transaction = database.transaction('handles', 'readwrite');
        transaction.objectStore('handles').put(handle, 'root');
        await transactionToPromise(transaction);
      } finally {
        database.close();
      }
    },
  };
}

async function listEntries(directory: FsDirectoryHandleLike): Promise<Array<[string, FsDirectoryHandleLike | FsFileHandleLike]>> {
  assert(directory.entries, 'API_UNSUPPORTED', 'This browser does not support directory enumeration. Use current Edge or Chrome.');
  const entries: Array<[string, FsDirectoryHandleLike | FsFileHandleLike]> = [];
  for await (const entry of directory.entries()) entries.push(entry);
  return entries;
}

function isDirectoryHandle(handle: FsDirectoryHandleLike | FsFileHandleLike): handle is FsDirectoryHandleLike {
  return handle.kind === undefined || handle.kind === 'directory';
}

async function getInternalDirectory(
  parent: FsDirectoryHandleLike,
  desiredName: string,
  create: boolean,
): Promise<FsDirectoryHandleLike> {
  const matches = (await listEntries(parent)).filter(
    ([name, handle]) => isSafeStoredSegment(name) && name.toLowerCase() === desiredName.toLowerCase() && isDirectoryHandle(handle),
  );
  assert(matches.length <= 1, 'NAME_COLLISION', `More than one folder matches ${desiredName}.`);
  if (matches.length === 1) return parent.getDirectoryHandle(matches[0][0]);
  assert(create, 'NOT_FOUND', `The ${desiredName} folder does not exist.`);
  return parent.getDirectoryHandle(desiredName, { create: true });
}

async function getNamedDirectory(
  parent: FsDirectoryHandleLike,
  rawName: string,
  scope: 'player' | 'character',
  create: boolean,
): Promise<{ directory: FsDirectoryHandleLike; name: string }> {
  const safeName = assertAllowedEntityName(rawName, scope);
  const matches = (await listEntries(parent)).filter(
    ([name, handle]) => isSafeStoredSegment(name) && name.toLowerCase() === safeName.toLowerCase() && isDirectoryHandle(handle),
  );
  assert(matches.length <= 1, 'NAME_COLLISION', `More than one folder matches "${safeName}".`);

  if (matches.length === 1) {
    assert(
      matches[0][0] === safeName,
      'NAME_COLLISION',
      `"${safeName}" collides with the existing folder "${matches[0][0]}". Folder names are case-insensitive.`,
    );
    return { directory: await parent.getDirectoryHandle(matches[0][0]), name: safeName };
  }

  assert(create, 'NOT_FOUND', `No ${scope} named "${safeName}" exists.`);
  return { directory: await parent.getDirectoryHandle(safeName, { create: true }), name: safeName };
}

function assertSelectableRootName(name: string): void {
  const normalized = name.trim().toLowerCase();
  assert(normalized.length > 0, 'UNSAFE_ROOT', 'Do not select a drive root. Choose an empty folder or an AIgamesheet folder.');
  assert(!/^[a-z]:[\\/]*$/i.test(normalized), 'UNSAFE_ROOT', 'Do not select a drive root. Choose an empty folder or an AIgamesheet folder.');
  assert(!SYSTEM_FOLDER_NAMES.has(normalized), 'UNSAFE_ROOT', 'Do not select a system folder. Choose an empty folder or an AIgamesheet folder.');
}

async function getManagedRoot(selectedRoot: FsDirectoryHandleLike, create: boolean): Promise<FsDirectoryHandleLike> {
  assertSelectableRootName(selectedRoot.name);
  if (selectedRoot.name.toLowerCase() === STORAGE_ROOT_NAME.toLowerCase()) return selectedRoot;

  const entries = await listEntries(selectedRoot);
  const appFolders = entries.filter(
    ([name, handle]) => isSafeStoredSegment(name) && name.toLowerCase() === STORAGE_ROOT_NAME.toLowerCase() && isDirectoryHandle(handle),
  );
  assert(appFolders.length <= 1, 'NAME_COLLISION', 'The selected folder contains conflicting AIgamesheet folders.');
  if (appFolders.length === 1) return selectedRoot.getDirectoryHandle(appFolders[0][0]);

  assert(entries.length === 0, 'UNSAFE_ROOT', 'Choose an empty folder, or a folder that already contains AIgamesheet.');
  assert(create, 'NOT_FOUND', 'The selected folder has no AIgamesheet directory.');
  return selectedRoot.getDirectoryHandle(STORAGE_ROOT_NAME, { create: true });
}

async function ensureCharacterLayout(root: FsDirectoryHandleLike): Promise<CharacterLayout> {
  const images = await getInternalDirectory(root, 'images', true);
  const dsl = await getInternalDirectory(root, 'DSL', true);
  const dslMacros = await getInternalDirectory(dsl, 'macros', true);
  const dslStepper = await getInternalDirectory(dsl, 'stepper', true);
  const dslXdx = await getInternalDirectory(dsl, 'xdx', true);
  const srd = await getInternalDirectory(root, 'SRD', true);
  const ai = await getInternalDirectory(root, 'AI', true);
  const aiReadOnly = await getInternalDirectory(ai, 'read_only', true);
  const notebook = await getInternalDirectory(root, 'notebook', true);
  const tools = await getInternalDirectory(root, 'tools', true);
  const modules = await getInternalDirectory(root, 'Modules', true);
  const backups = await getInternalDirectory(root, 'backups', true);
  return { root, images, dslMacros, dslStepper, dslXdx, srd, ai, aiReadOnly, notebook, tools, modules, backups };
}

async function ensureBaseTree(selectedRoot: FsDirectoryHandleLike): Promise<{
  managedRoot: FsDirectoryHandleLike;
  users: FsDirectoryHandleLike;
  crash: CharacterLayout;
}> {
  const managedRoot = await getManagedRoot(selectedRoot, true);
  const users = await getInternalDirectory(managedRoot, STORAGE_USERS_NAME, true);
  const crashRoot = await getInternalDirectory(users, STORAGE_CRASH_NAME, true);
  return { managedRoot, users, crash: await ensureCharacterLayout(crashRoot) };
}

function assertSafeFileName(name: string): void {
  assert(sanitizePathSegment(name) === name, 'UNSAFE_PATH', 'Storage attempted to use an unsafe file name.');
}

async function readTextFromFile(handle: FsFileHandleLike): Promise<string> {
  const file = await handle.getFile();
  assert(file.size <= MAX_FILE_BYTES, 'FILE_TOO_LARGE', 'The storage file exceeds the 5 MiB safety limit.');
  const text = await file.text();
  assertFileSize(text);
  return text;
}

async function readTextIfPresent(directory: FsDirectoryHandleLike, fileName: string): Promise<string | null> {
  assertSafeFileName(fileName);
  try {
    return await readTextFromFile(await directory.getFileHandle(fileName));
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

async function writeDirect(directory: FsDirectoryHandleLike, fileName: string, text: string): Promise<void> {
  assertSafeFileName(fileName);
  assertFileSize(text);
  const handle = await directory.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(text);
    await writable.close();
  } catch (error) {
    try {
      await writable.close();
    } catch {
      // The original error is more useful than a close failure.
    }
    throw error;
  }
}

function backupFileName(backupKey: string, sequence: number): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  return `${backupKey}.${timestamp}.${sequence.toString().padStart(4, '0')}.bak`;
}

async function trimBackups(backupDirectory: FsDirectoryHandleLike, backupKey: string): Promise<void> {
  const backups = (await listEntries(backupDirectory))
    .filter(([name, handle]) => !isDirectoryHandle(handle) && name.startsWith(`${backupKey}.`) && name.endsWith('.bak'))
    .map(([name]) => name)
    .sort();
  const excess = backups.length - MAX_BACKUPS_PER_FILE;
  if (excess <= 0) return;
  assert(backupDirectory.removeEntry, 'API_UNSUPPORTED', 'This browser cannot prune old backups.');
  for (const name of backups.slice(0, excess)) await backupDirectory.removeEntry(name);
}

interface BackupEnvelopeOptions {
  format: string;
  schemaVersion: number;
  appVersion: string;
}

async function sanitizedEnvelopeBackup(text: string, options: BackupEnvelopeOptions): Promise<string | null> {
  try {
    const prior = await parseEnvelope(text, options.format, options.schemaVersion);
    const safeData = cloneForStorage(prior.data);
    const safeCharacterId =
      options.format === CHARACTER_FORMAT && typeof prior.characterId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prior.characterId)
        ? prior.characterId
        : options.format === CHARACTER_FORMAT
          ? createCharacterId()
          : undefined;
    const safeEnvelope = await createEnvelope(
      options.format,
      safeData,
      options.schemaVersion,
      options.appVersion,
      new Date().toISOString(),
      safeCharacterId,
    );
    return JSON.stringify(safeEnvelope, null, 2);
  } catch {
    // Never turn malformed or untrusted raw text into a backup. Character data
    // remains protected by the previous valid backup, if one exists.
    return null;
  }
}

async function writeSafely(
  directory: FsDirectoryHandleLike,
  fileName: string,
  text: string,
  backupDirectory: FsDirectoryHandleLike,
  backupKey = fileName,
  backupEnvelope?: BackupEnvelopeOptions,
): Promise<void> {
  assertSafeFileName(fileName);
  assertSafeFileName(backupKey);
  const temporaryName = `${fileName}.tmp`;
  assertSafeFileName(temporaryName);

  await writeDirect(directory, temporaryName, text);
  const temporaryText = await readTextIfPresent(directory, temporaryName);
  assert(temporaryText === text, 'VERIFY_FAILED', `Temporary ${fileName} verification failed.`);

  const priorText = await readTextIfPresent(directory, fileName);
  const safePriorText = priorText !== null && backupEnvelope ? await sanitizedEnvelopeBackup(priorText, backupEnvelope) : null;
  if (safePriorText !== null) {
    let sequence = 0;
    let candidate = backupFileName(backupKey, sequence);
    while ((await readTextIfPresent(backupDirectory, candidate)) !== null) {
      sequence += 1;
      candidate = backupFileName(backupKey, sequence);
    }
    await writeDirect(backupDirectory, candidate, safePriorText);
    const verifiedBackup = await readTextIfPresent(backupDirectory, candidate);
    assert(verifiedBackup === safePriorText, 'VERIFY_FAILED', `Backup ${fileName} verification failed.`);
  }

  await writeDirect(directory, fileName, text);
  const finalText = await readTextIfPresent(directory, fileName);
  assert(finalText === text, 'VERIFY_FAILED', `${fileName} verification failed.`);
  assert(directory.removeEntry, 'API_UNSUPPORTED', 'This browser cannot remove temporary storage files.');
  await directory.removeEntry(temporaryName);
  await trimBackups(backupDirectory, backupKey);
}

function parseUntrustedJson(text: string): JsonValue {
  assertFileSize(text);
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new StorageFault('INVALID_JSON', 'A storage JSON file is malformed.');
  }
  validateLoadedJson(value);
  return value;
}

async function createEnvelope(
  format: string,
  data: JsonValue,
  schemaVersion: number,
  appVersion: string,
  savedAt: string,
  characterId?: string,
): Promise<StoredEnvelope> {
  return {
    format,
    schemaVersion,
    appVersion,
    savedAt,
    sha256: await sha256(data),
    ...(characterId ? { characterId } : {}),
    data,
  };
}

async function parseEnvelope(text: string, expectedFormat: string, schemaVersion: number): Promise<StoredEnvelope> {
  const value = parseUntrustedJson(text);
  assert(isRecord(value), 'INVALID_ENVELOPE', 'The storage file does not contain a valid data envelope.');
  const format = value.format;
  const storedVersion = value.schemaVersion;
  const appVersion = value.appVersion;
  const savedAt = value.savedAt;
  const checksum = value.sha256;
  const data = value.data;
  assert(format === expectedFormat, 'INVALID_ENVELOPE', 'The storage file has an unexpected format.');
  assert(storedVersion === schemaVersion, 'UNSUPPORTED_VERSION', 'The storage file uses an unsupported schema version.');
  assert(typeof appVersion === 'string' && typeof savedAt === 'string', 'INVALID_ENVELOPE', 'The storage file metadata is invalid.');
  assert(typeof checksum === 'string' && /^[a-f0-9]{64}$/i.test(checksum), 'INVALID_ENVELOPE', 'The storage checksum is invalid.');
  validateLoadedJson(data);
  assert((await sha256(data)) === checksum, 'CHECKSUM_MISMATCH', 'The storage file failed its integrity check.');

  const characterId = value.characterId;
  if (expectedFormat === CHARACTER_FORMAT) {
    assert(typeof characterId === 'string' && characterId.length > 0 && characterId.length <= 128, 'INVALID_ENVELOPE', 'The character ID is invalid.');
  }
  return { format, schemaVersion: storedVersion, appVersion, savedAt, sha256: checksum, data, ...(typeof characterId === 'string' ? { characterId } : {}) };
}

function characterFromEnvelope(envelope: StoredEnvelope): LoadedCharacter {
  assert(isRecord(envelope.data), 'INVALID_CHARACTER', 'The stored character is not an object.');
  assert(typeof envelope.data.name === 'string' && typeof envelope.data.player === 'string', 'INVALID_CHARACTER', 'The stored character is missing its identity fields.');
  // A fresh JSON-only clone removes any manually injected sensitive fields before returning it to UI code.
  return {
    character: cloneForStorage(envelope.data) as unknown as PF1Character,
    characterId: envelope.characterId as string,
    savedAt: envelope.savedAt,
  };
}

async function readCharacterEnvelopeIfPresent(
  directory: FsDirectoryHandleLike,
  schemaVersion: number,
): Promise<StoredEnvelope | null> {
  const text = await readTextIfPresent(directory, CHARACTER_FILE_NAME);
  return text === null ? null : parseEnvelope(text, CHARACTER_FORMAT, schemaVersion);
}

async function readProjectionIfPresent(
  directory: FsDirectoryHandleLike,
  fileName: string,
  schemaVersion: number,
): Promise<JsonValue | null> {
  const text = await readTextIfPresent(directory, fileName);
  if (text === null) return null;
  return (await parseEnvelope(text, PROJECTION_FORMAT, schemaVersion)).data;
}

async function writeProjection(
  directory: FsDirectoryHandleLike,
  fileName: string,
  data: unknown,
  backupDirectory: FsDirectoryHandleLike,
  schemaVersion: number,
  appVersion: string,
  savedAt: string,
  backupKey = fileName,
): Promise<void> {
  const safeData = cloneForStorage(data);
  const envelope = await createEnvelope(PROJECTION_FORMAT, safeData, schemaVersion, appVersion, savedAt);
  await writeSafely(
    directory,
    fileName,
    JSON.stringify(envelope, null, 2),
    backupDirectory,
    backupKey,
    { format: PROJECTION_FORMAT, schemaVersion, appVersion },
  );
}

/** Escape dynamic text before placing it in the printable HTML export. */
export function escapePrintableText(value: string): string {
  // Escaping every '<' also neutralizes '<!--' and '</script>'; separators are
  // encoded so they cannot terminate a JavaScript/string context if exported.
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\u2028/g, '&#8232;')
    .replace(/\u2029/g, '&#8233;');
}

function plainText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return '';
}

function printableNotes(character: PF1Character): string {
  const biography: Record<string, unknown> = isRecord(character.biography) ? character.biography : {};
  const characterBio: Record<string, unknown> = isRecord(character.characterBio) ? character.characterBio : {};
  const journals = Array.isArray(character.journal) ? character.journal : [];
  const journalText = journals
    .map((entry) => {
      if (!isRecord(entry)) return '';
      return [plainText(entry.title), plainText(entry.sessionDate), plainText(entry.content)].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');

  return [
    plainText(biography.description),
    plainText(biography.personality),
    plainText(biography.traits),
    plainText(biography.flaws),
    plainText(biography.allies),
    plainText(biography.enemies),
    plainText(biography.notes),
    plainText(characterBio.scratchpad),
    journalText,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function renderPrintableSheet(character: PF1Character): string {
  const name = escapePrintableText(plainText(character.name));
  const player = escapePrintableText(plainText(character.player));
  const characterClass = escapePrintableText(plainText(character.characterClass));
  const level = escapePrintableText(plainText(character.level));
  const race = escapePrintableText(plainText(character.race));
  const notes = escapePrintableText(printableNotes(character));

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${name || 'Character sheet'}</title>
<style>body{font-family:system-ui,sans-serif;max-width:8.5in;margin:0 auto;padding:1in;color:#111}dl{display:grid;grid-template-columns:10rem 1fr;gap:.35rem}dt{font-weight:700}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}@media print{body{padding:0}}</style></head>
<body><h1>${name || 'Character sheet'}</h1><dl><dt>Player</dt><dd>${player}</dd><dt>Class</dt><dd>${characterClass}</dd><dt>Level</dt><dd>${level}</dd><dt>Race</dt><dd>${race}</dd></dl><h2>Notes &amp; journal</h2><pre>${notes}</pre></body>
</html>`;
}

function csvCell(value: unknown): string {
  return `"${plainText(value).replace(/"/g, '""')}"`;
}

function renderIndexCsv(character: PF1Character, characterId: string, savedAt: string): string {
  return [
    'characterId,name,player,class,level,race,savedAt',
    [characterId, character.name, character.player, character.characterClass, character.level, character.race, savedAt].map(csvCell).join(','),
  ].join('\r\n');
}

function getArrayProjection(data: JsonValue | null, property: string): JsonValue[] {
  return isRecord(data) && Array.isArray(data[property]) ? data[property] : [];
}

function mergeProjectionArray(previous: JsonValue[], current: JsonValue[]): JsonValue[] {
  const merged = new Map<string, JsonValue>();
  for (const item of previous) merged.set(canonicalJson(item), item);
  for (const item of current) merged.set(canonicalJson(item), item);
  return Array.from(merged.values());
}

async function writePlayerData(
  playerDirectory: FsDirectoryHandleLike,
  playerName: string,
  character: PF1Character,
  schemaVersion: number,
  appVersion: string,
  savedAt: string,
): Promise<void> {
  const settings = await getInternalDirectory(playerDirectory, 'settings', true);
  const dsl = await getInternalDirectory(playerDirectory, 'dsl', true);
  const playerBackups = await getInternalDirectory(playerDirectory, 'backups', true);
  // Validate shared untrusted data before changing any player projection.
  const existingMacros = await readProjectionIfPresent(dsl, 'macros.json', schemaVersion);
  const existingXdx = await readProjectionIfPresent(dsl, 'xdx.json', schemaVersion);
  const customObjects = cloneForStorage(character.customObjects ?? []);
  const xdxMacros = cloneForStorage(character.xdxMacros ?? []);
  await writeProjection(settings, 'storage.json', { player: playerName }, playerBackups, schemaVersion, appVersion, savedAt, 'settings-storage.json');
  await writeProjection(
    dsl,
    'macros.json',
    { customObjects: mergeProjectionArray(getArrayProjection(existingMacros, 'customObjects'), Array.isArray(customObjects) ? customObjects : []) },
    playerBackups,
    schemaVersion,
    appVersion,
    savedAt,
    'dsl-macros.json',
  );
  await writeProjection(
    dsl,
    'xdx.json',
    { xdxMacros: mergeProjectionArray(getArrayProjection(existingXdx, 'xdxMacros'), Array.isArray(xdxMacros) ? xdxMacros : []) },
    playerBackups,
    schemaVersion,
    appVersion,
    savedAt,
    'dsl-xdx.json',
  );
}

async function rewriteAiReadOnlyDirectory(directory: FsDirectoryHandleLike): Promise<void> {
  const entries = await listEntries(directory);
  const staleEntries = entries.filter(([name]) => name !== 'README.txt');
  if (staleEntries.length === 0) return;
  assert(directory.removeEntry, 'API_UNSUPPORTED', 'This browser cannot refresh AI/read_only safely.');
  for (const [name] of staleEntries) {
    // Entry names from a picked folder are still untrusted; do not use an
    // unsafe one as a child path.
    assert(isSafeStoredSegment(name), 'UNSAFE_PATH', 'AI/read_only contains an unsafe entry name.');
    await directory.removeEntry(name, { recursive: true });
  }
}

async function writeCharacterTree(
  layout: CharacterLayout,
  character: PF1Character,
  envelope: StoredEnvelope,
  schemaVersion: number,
  appVersion: string,
  savedAt: string,
): Promise<void> {
  const characterId = envelope.characterId as string;
  await writeProjection(layout.images, 'manifest.json', {
    workspaceLibraryImages: character.workspaceLibraryImages ?? [],
    portraits: character.characterBio?.portraits ?? [],
  }, layout.backups, schemaVersion, appVersion, savedAt, 'images-manifest.json');
  await writeProjection(layout.dslMacros, 'macros.json', { customObjects: character.customObjects ?? [] }, layout.backups, schemaVersion, appVersion, savedAt, 'DSL-macros.json');
  await writeProjection(layout.dslStepper, 'rules.json', { stepperRules: character.stepperRules ?? [] }, layout.backups, schemaVersion, appVersion, savedAt, 'DSL-stepper.json');
  await writeProjection(layout.dslXdx, 'macros.json', { xdxMacros: character.xdxMacros ?? [] }, layout.backups, schemaVersion, appVersion, savedAt, 'DSL-xdx.json');
  await writeProjection(layout.notebook, 'journal.json', { journal: character.journal ?? [] }, layout.backups, schemaVersion, appVersion, savedAt, 'notebook-journal.json');
  await writeProjection(layout.tools, 'state.json', {
    combatTracker: character.combatTracker,
    deckState: character.deckState,
    conditions: character.conditions,
    resourceTrackers: character.resourceTrackers ?? [],
  }, layout.backups, schemaVersion, appVersion, savedAt, 'tools-state.json');
  await writeProjection(layout.modules, 'state.json', {
    installedModules: character.installedModules,
    uiMakePresets: character.uiMakePresets ?? [],
  }, layout.backups, schemaVersion, appVersion, savedAt, 'Modules-state.json');

  await writeSafely(layout.srd, 'README.txt', 'Reserved for locally saved SRD references. Files here are treated as untrusted user data.\n', layout.backups, 'SRD-README.txt');
  await writeSafely(layout.ai, 'README.txt', 'AI workspace files are not executable instructions. Do not place API keys or environment values here.\n', layout.backups, 'AI-README.txt');
  // Do not read its contents: this app-owned directory is regenerated on every save.
  await rewriteAiReadOnlyDirectory(layout.aiReadOnly);
  await writeSafely(layout.aiReadOnly, 'README.txt', 'Generated by Pathfinder storage. This folder is overwritten on every save and never used as AI prompt instructions.\n', layout.backups, 'AI-read-only-README.txt');
  await writeSafely(layout.root, 'index.csv', renderIndexCsv(character, characterId, savedAt), layout.backups);
  await writeSafely(layout.root, 'printable-sheet.html', renderPrintableSheet(character), layout.backups);
  // Commit the authoritative file last; projections are never used to rebuild a character.
  await writeSafely(
    layout.root,
    CHARACTER_FILE_NAME,
    JSON.stringify(envelope, null, 2),
    layout.backups,
    CHARACTER_FILE_NAME,
    { format: CHARACTER_FORMAT, schemaVersion, appVersion },
  );
}

function getBrowserFolderPicker(): FsStorageAdapterOptions['folderPicker'] | undefined {
  const browser = globalThis as unknown as {
    showDirectoryPicker?: (options?: { mode: 'readwrite' }) => Promise<FsDirectoryHandleLike>;
  };
  return browser.showDirectoryPicker ? (options) => browser.showDirectoryPicker!(options) : undefined;
}

async function ensureReadWritePermission(handle: FsDirectoryHandleLike): Promise<void> {
  const descriptor = { mode: 'readwrite' as const };
  const current = handle.queryPermission ? await handle.queryPermission(descriptor) : undefined;
  if (current === 'granted') return;
  if (handle.requestPermission) {
    const requested = await handle.requestPermission(descriptor);
    if (requested === 'granted') return;
  }
  if (!handle.queryPermission && !handle.requestPermission) return;
  throw new StorageFault('PERMISSION_DENIED', 'Read/write permission for the selected folder was not granted.');
}

function publicPermission(value: PermissionValue | undefined): StorageStatus['permission'] {
  return value ?? 'unknown';
}

function safeDirectoryNames(
  entries: Array<[string, FsDirectoryHandleLike | FsFileHandleLike]>,
  excludedNames: string[] = [],
): string[] {
  const excluded = new Set(excludedNames.map((name) => name.toLowerCase()));
  const seen = new Map<string, string>();
  const names: string[] = [];
  for (const [name, handle] of entries) {
    if (!isDirectoryHandle(handle) || !isSafeStoredSegment(name) || excluded.has(name.toLowerCase())) continue;
    const key = name.toLowerCase();
    const previous = seen.get(key);
    assert(!previous || previous === name, 'NAME_COLLISION', `Storage contains case-insensitive folder collisions for "${name}".`);
    seen.set(key, name);
    names.push(name);
  }
  return names.sort((left, right) => left.localeCompare(right));
}

export function createFsStorageAdapter(options: FsStorageAdapterOptions = {}): StorageAdapter {
  const folderPicker = options.folderPicker ?? getBrowserFolderPicker();
  const handleStore = options.handleStore ?? createIndexedDbHandleStore();
  const schemaVersion = options.schemaVersion ?? DEFAULT_SCHEMA_VERSION;
  const appVersion = options.appVersion ?? DEFAULT_APP_VERSION;
  const now = options.now ?? (() => new Date());
  let rememberedHandle: FsDirectoryHandleLike | undefined;

  async function selectedHandle(): Promise<FsDirectoryHandleLike> {
    if (!rememberedHandle) rememberedHandle = await handleStore.get();
    assert(rememberedHandle, 'FOLDER_NOT_SELECTED', 'Choose a storage folder before loading or saving characters.');
    await ensureReadWritePermission(rememberedHandle);
    return rememberedHandle;
  }

  async function baseTree() {
    return ensureBaseTree(await selectedHandle());
  }

  async function saveLayout(
    layout: CharacterLayout,
    character: PF1Character,
    savedAt = now().toISOString(),
  ): Promise<{ characterId: string; savedAt: string }> {
    const copied = cloneForStorage(character);
    assert(isRecord(copied), 'INVALID_CHARACTER', 'A character must be a JSON object.');
    assert(typeof copied.name === 'string' && typeof copied.player === 'string', 'INVALID_CHARACTER', 'A character is missing its identity fields.');
    const safeCharacter = copied as unknown as PF1Character;
    const existing = await readCharacterEnvelopeIfPresent(layout.root, schemaVersion);
    const characterId = existing?.characterId ?? createCharacterId();
    const envelope = await createEnvelope(CHARACTER_FORMAT, copied, schemaVersion, appVersion, savedAt, characterId);
    await writeCharacterTree(layout, safeCharacter, envelope, schemaVersion, appVersion, savedAt);
    return { characterId, savedAt };
  }

  return {
    async pickFolderAndOpen(): Promise<StorageResult<{ rootName: string }>> {
      try {
        assert(folderPicker, 'API_UNSUPPORTED', 'Folder storage requires Edge or Chrome with the File System Access API.');
        const selected = await folderPicker({ mode: 'readwrite' });
        await ensureReadWritePermission(selected);
        const tree = await ensureBaseTree(selected);
        await handleStore.set(selected);
        rememberedHandle = selected;
        return { ok: true, rootName: tree.managedRoot.name };
      } catch (error) {
        return toFailure(error);
      }
    },

    async getStatus(): Promise<StorageResult<StorageStatus>> {
      try {
        const supported = Boolean(folderPicker) && (options.handleStore !== undefined || typeof indexedDB !== 'undefined');
        if (!rememberedHandle) rememberedHandle = await handleStore.get();
        if (!rememberedHandle) {
          return { ok: true, supported, selected: false, permission: 'unknown', message: 'No storage folder has been selected.' };
        }
        const permission = rememberedHandle.queryPermission
          ? publicPermission(await rememberedHandle.queryPermission({ mode: 'readwrite' }))
          : 'unknown';
        return { ok: true, supported, selected: true, permission, rootName: rememberedHandle.name };
      } catch (error) {
        return toFailure(error);
      }
    },

    async saveCharacter(player: string, character: PF1Character): Promise<StorageResult<SaveReceipt>> {
      try {
        assert(typeof character?.name === 'string', 'INVALID_CHARACTER', 'A character needs a name before it can be saved.');
        const tree = await baseTree();
        const storedPlayer = await getNamedDirectory(tree.users, player, 'player', true);
        const storedCharacter = await getNamedDirectory(storedPlayer.directory, character.name, 'character', true);
        const layout = await ensureCharacterLayout(storedCharacter.directory);
        const savedAt = now().toISOString();
        // Validate/update non-authoritative shared projections first. If they
        // are malformed, do not report a failed save after committing source data.
        await writePlayerData(storedPlayer.directory, storedPlayer.name, character, schemaVersion, appVersion, savedAt);
        const receipt = await saveLayout(layout, character, savedAt);
        return { ok: true, player: storedPlayer.name, name: storedCharacter.name, ...receipt };
      } catch (error) {
        return toFailure(error);
      }
    },

    async autosaveCrash(character: PF1Character): Promise<StorageResult<Omit<SaveReceipt, 'player'>>> {
      try {
        assert(typeof character?.name === 'string', 'INVALID_CHARACTER', 'A character needs a name before it can be crash-saved.');
        const tree = await baseTree();
        const receipt = await saveLayout(tree.crash, character);
        return { ok: true, name: STORAGE_CRASH_NAME, ...receipt };
      } catch (error) {
        return toFailure(error);
      }
    },

    async loadCrash(): Promise<StorageResult<{ character: LoadedCharacter | null }>> {
      try {
        const tree = await baseTree();
        const envelope = await readCharacterEnvelopeIfPresent(tree.crash.root, schemaVersion);
        return { ok: true, character: envelope ? characterFromEnvelope(envelope) : null };
      } catch (error) {
        return toFailure(error);
      }
    },

    async listPlayers(): Promise<StorageResult<{ players: StoredPlayer[] }>> {
      try {
        const tree = await baseTree();
        const players = safeDirectoryNames(await listEntries(tree.users), [STORAGE_CRASH_NAME]).map((name) => ({ name }));
        return { ok: true, players };
      } catch (error) {
        return toFailure(error);
      }
    },

    async listCharacters(player: string): Promise<StorageResult<{ characters: StoredCharacterSummary[] }>> {
      try {
        const tree = await baseTree();
        const storedPlayer = await getNamedDirectory(tree.users, player, 'player', false);
        const names = safeDirectoryNames(await listEntries(storedPlayer.directory), ['settings', 'dsl', 'backups']);
        const characters: StoredCharacterSummary[] = [];
        for (const name of names) {
          const directory = await storedPlayer.directory.getDirectoryHandle(name);
          const envelope = await readCharacterEnvelopeIfPresent(directory, schemaVersion);
          if (envelope) characters.push({ name, characterId: envelope.characterId as string, savedAt: envelope.savedAt });
        }
        return { ok: true, characters };
      } catch (error) {
        return toFailure(error);
      }
    },

    async loadCharacter(player: string, name: string): Promise<StorageResult<LoadedCharacter>> {
      try {
        const tree = await baseTree();
        const storedPlayer = await getNamedDirectory(tree.users, player, 'player', false);
        const storedCharacter = await getNamedDirectory(storedPlayer.directory, name, 'character', false);
        const envelope = await readCharacterEnvelopeIfPresent(storedCharacter.directory, schemaVersion);
        assert(envelope, 'NOT_FOUND', 'This character has no character.json file.');
        return { ok: true, ...characterFromEnvelope(envelope) };
      } catch (error) {
        return toFailure(error);
      }
    },
  };
}
