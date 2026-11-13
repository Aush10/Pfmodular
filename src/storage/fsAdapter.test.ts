/// <reference types="node" />

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { createBlankCharacter } from '../data/defaultCharacter';
import {
  createFsStorageAdapter,
  type DirectoryHandleStore,
  type FsDirectoryHandleLike,
  type FsFileHandleLike,
  type FsFileLike,
  type FsWritableFileLike,
} from './fsAdapter';

function notFound(): Error {
  const error = new Error('Not found') as Error & { name: string; code?: string };
  error.name = 'NotFoundError';
  error.code = 'ENOENT';
  return error;
}

class MemoryFileHandle implements FsFileHandleLike {
  readonly kind = 'file' as const;
  content = '';

  constructor(readonly name: string) {}

  async getFile(): Promise<FsFileLike> {
    const text = this.content;
    return { size: new TextEncoder().encode(text).byteLength, text: async () => text };
  }

  async createWritable(): Promise<FsWritableFileLike> {
    let next = '';
    return {
      write: async (data: string) => {
        next = data;
      },
      close: async () => {
        this.content = next;
      },
    };
  }
}

class MemoryDirectoryHandle implements FsDirectoryHandleLike {
  readonly kind = 'directory' as const;
  readonly children = new Map<string, MemoryDirectoryHandle | MemoryFileHandle>();
  permissionRequests = 0;

  constructor(readonly name: string) {}

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<MemoryDirectoryHandle> {
    const child = this.children.get(name);
    if (child instanceof MemoryDirectoryHandle) return child;
    if (child) throw new Error(`${name} is a file`);
    if (!options?.create) throw notFound();
    const directory = new MemoryDirectoryHandle(name);
    this.children.set(name, directory);
    return directory;
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<MemoryFileHandle> {
    const child = this.children.get(name);
    if (child instanceof MemoryFileHandle) return child;
    if (child) throw new Error(`${name} is a directory`);
    if (!options?.create) throw notFound();
    const file = new MemoryFileHandle(name);
    this.children.set(name, file);
    return file;
  }

  async *entries(): AsyncIterableIterator<[string, MemoryDirectoryHandle | MemoryFileHandle]> {
    for (const entry of [...this.children.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      yield entry;
    }
  }

  async removeEntry(name: string): Promise<void> {
    if (!this.children.delete(name)) throw notFound();
  }

  async queryPermission(): Promise<'granted'> {
    return 'granted';
  }

  async requestPermission(): Promise<'granted'> {
    this.permissionRequests += 1;
    return 'granted';
  }
}

class MemoryHandleStore implements DirectoryHandleStore {
  constructor(private handle?: FsDirectoryHandleLike) {}

  async get(): Promise<FsDirectoryHandleLike | undefined> {
    return this.handle;
  }

  async set(handle: FsDirectoryHandleLike): Promise<void> {
    this.handle = handle;
  }
}

async function memoryDirectory(root: MemoryDirectoryHandle, ...names: string[]): Promise<MemoryDirectoryHandle> {
  let current = root;
  for (const name of names) current = await current.getDirectoryHandle(name);
  return current;
}

async function memoryFile(root: MemoryDirectoryHandle, ...names: string[]): Promise<MemoryFileHandle> {
  const fileName = names.pop();
  assert.ok(fileName);
  return (await memoryDirectory(root, ...names)).getFileHandle(fileName);
}

function sampleCharacter(name: string, player: string) {
  const character = createBlankCharacter();
  character.name = name;
  character.player = player;
  return character;
}

function assertChildSegment(name: string): void {
  if (!name || name.includes('/') || name.includes('\\') || name === '.' || name === '..') {
    throw new Error(`Unsafe child path requested by adapter: ${name}`);
  }
}

class NodeFileHandle implements FsFileHandleLike {
  readonly kind = 'file' as const;

  constructor(
    readonly path: string,
    readonly name: string,
  ) {}

  async getFile(): Promise<FsFileLike> {
    const contents = await readFile(this.path);
    return { size: contents.byteLength, text: async () => contents.toString('utf8') };
  }

  async createWritable(): Promise<FsWritableFileLike> {
    let contents = '';
    return {
      write: async (data: string) => {
        contents = data;
      },
      close: async () => {
        await writeFile(this.path, contents, 'utf8');
      },
    };
  }
}

class NodeDirectoryHandle implements FsDirectoryHandleLike {
  readonly kind = 'directory' as const;

  constructor(
    readonly path: string,
    readonly name = basename(path),
  ) {}

  private childPath(name: string): string {
    assertChildSegment(name);
    const parent = resolve(this.path);
    const child = resolve(parent, name);
    if (relative(parent, child).startsWith('..') || !child.startsWith(`${parent}${sep}`)) {
      throw new Error(`Adapter attempted to leave the selected directory: ${name}`);
    }
    return child;
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<NodeDirectoryHandle> {
    const child = this.childPath(name);
    try {
      const info = await stat(child);
      if (!info.isDirectory()) throw new Error(`${name} is not a directory`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      if (!options?.create) throw notFound();
      await mkdir(child);
    }
    return new NodeDirectoryHandle(child, name);
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<NodeFileHandle> {
    const child = this.childPath(name);
    try {
      const info = await stat(child);
      if (info.isDirectory()) throw new Error(`${name} is not a file`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      if (!options?.create) throw notFound();
      await writeFile(child, '', { flag: 'wx' });
    }
    return new NodeFileHandle(child, name);
  }

  async *entries(): AsyncIterableIterator<[string, NodeDirectoryHandle | NodeFileHandle]> {
    const entries = await readdir(this.path, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const child = this.childPath(entry.name);
      yield entry.isDirectory() ? [entry.name, new NodeDirectoryHandle(child, entry.name)] : [entry.name, new NodeFileHandle(child, entry.name)];
    }
  }

  async removeEntry(name: string, options?: { recursive?: boolean }): Promise<void> {
    const child = this.childPath(name);
    await rm(child, { recursive: options?.recursive ?? false, force: false });
  }

  async queryPermission(): Promise<'granted'> {
    return 'granted';
  }

  async requestPermission(): Promise<'granted'> {
    return 'granted';
  }
}

test('creates the requested fake-handle tree, sanitizes names, round-trips data, and rejects corruption', async () => {
  const root = new MemoryDirectoryHandle('Chosen Storage');
  const adapter = createFsStorageAdapter({
    folderPicker: async () => root,
    handleStore: new MemoryHandleStore(),
    now: () => new Date('2026-11-05T12:00:00.000Z'),
  });

  const opened = await adapter.pickFolderAndOpen();
  assert.equal(opened.ok, true);
  const character = sampleCharacter('H<e>r:o?', 'Al/ice');
  character.biography.notes = '</script><!-- note\u2028with a separator';
  (character as unknown as Record<string, unknown>).openAiApiKey = 'super-secret';
  (character as unknown as Record<string, unknown>).openAiKey = 'openai-key-secret';
  (character as unknown as Record<string, unknown>).aiKey = 'ai-key-secret';
  (character as unknown as Record<string, unknown>).geminiKey = 'gemini-key-secret';
  (character as unknown as Record<string, unknown>).apiToken = 'api-token-secret';
  (character as unknown as Record<string, unknown>).sessionStorage = { token: 'also-secret' };
  const saved = await adapter.saveCharacter('Al/ice', character);
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.player, 'Alice');
  assert.equal(saved.name, 'Hero');

  for (const path of [
    ['AIgamesheet', 'pfmusers', 'Crash'],
    ['AIgamesheet', 'pfmusers', 'Alice', 'settings'],
    ['AIgamesheet', 'pfmusers', 'Alice', 'dsl'],
    ['AIgamesheet', 'pfmusers', 'Alice', 'Hero', 'images'],
    ['AIgamesheet', 'pfmusers', 'Alice', 'Hero', 'DSL', 'macros'],
    ['AIgamesheet', 'pfmusers', 'Alice', 'Hero', 'DSL', 'stepper'],
    ['AIgamesheet', 'pfmusers', 'Alice', 'Hero', 'DSL', 'xdx'],
    ['AIgamesheet', 'pfmusers', 'Alice', 'Hero', 'SRD'],
    ['AIgamesheet', 'pfmusers', 'Alice', 'Hero', 'AI', 'read_only'],
    ['AIgamesheet', 'pfmusers', 'Alice', 'Hero', 'notebook'],
    ['AIgamesheet', 'pfmusers', 'Alice', 'Hero', 'tools'],
    ['AIgamesheet', 'pfmusers', 'Alice', 'Hero', 'Modules'],
  ]) {
    await memoryDirectory(root, ...path);
  }

  const characterFile = await memoryFile(root, 'AIgamesheet', 'pfmusers', 'Alice', 'Hero', 'character.json');
  assert.doesNotMatch(characterFile.content, /super-secret|openai-key-secret|ai-key-secret|gemini-key-secret|api-token-secret|also-secret/);
  const printable = await memoryFile(root, 'AIgamesheet', 'pfmusers', 'Alice', 'Hero', 'printable-sheet.html');
  assert.doesNotMatch(printable.content, /<\/script>|<!--|\u2028/);
  assert.match(printable.content, /&lt;\/script&gt;/);

  const loaded = await adapter.loadCharacter('Alice', 'Hero');
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  assert.equal(loaded.character.name, 'H<e>r:o?');
  assert.equal(loaded.character.biography.notes, character.biography.notes);
  assert.equal(loaded.characterId, saved.characterId);

  const readOnly = await memoryDirectory(root, 'AIgamesheet', 'pfmusers', 'Alice', 'Hero', 'AI', 'read_only');
  await readOnly.getFileHandle('stale.txt', { create: true });
  (await readOnly.getFileHandle('README.txt')).content = 'openAiKey=manual-read-only-secret';
  const playerMacros = await memoryFile(root, 'AIgamesheet', 'pfmusers', 'Alice', 'dsl', 'macros.json');
  const manuallyExtendedProjection = JSON.parse(playerMacros.content) as Record<string, unknown>;
  manuallyExtendedProjection.openAiKey = 'manual-projection-secret';
  manuallyExtendedProjection.appVersion = 'manual-metadata-secret';
  playerMacros.content = JSON.stringify(manuallyExtendedProjection);
  character.biography.notes = 'Second save proves that the storage character ID is stable.';
  const resaved = await adapter.saveCharacter('Al/ice', character);
  assert.equal(resaved.ok, true);
  if (!resaved.ok) return;
  assert.equal(resaved.characterId, saved.characterId);
  assert.equal(readOnly.children.has('stale.txt'), false, 'AI/read_only is rewritten rather than treated as loadable prompt content');
  const backups = await memoryDirectory(root, 'AIgamesheet', 'pfmusers', 'Alice', 'Hero', 'backups');
  assert.ok([...backups.children.keys()].some((name) => name.startsWith('character.json.') && name.endsWith('.bak')));
  assert.ok(
    [...backups.children.values()].every(
      (entry) => !(entry instanceof MemoryFileHandle) || !entry.content.includes('manual-read-only-secret'),
    ),
  );
  const playerBackups = await memoryDirectory(root, 'AIgamesheet', 'pfmusers', 'Alice', 'backups');
  const playerBackup = [...playerBackups.children.values()].find(
    (entry) => entry instanceof MemoryFileHandle && entry.name.startsWith('dsl-macros.json.'),
  );
  assert.ok(playerBackup instanceof MemoryFileHandle);
  assert.doesNotMatch(playerBackup.content, /manual-projection-secret|manual-metadata-secret/);

  const characterBeforeDslFailure = characterFile.content;
  playerMacros.content = '{ broken player DSL';
  const failedBeforeCommit = await adapter.saveCharacter('Al/ice', character);
  assert.equal(failedBeforeCommit.ok, false);
  if (!failedBeforeCommit.ok) assert.equal(failedBeforeCommit.error.code, 'INVALID_JSON');
  assert.equal(characterFile.content, characterBeforeDslFailure, 'invalid player DSL must fail before character.json is committed');

  const collision = await adapter.saveCharacter('Alice', sampleCharacter('hero', 'Alice'));
  assert.equal(collision.ok, false);
  if (!collision.ok) assert.equal(collision.error.code, 'NAME_COLLISION');
  const playerCollision = await adapter.saveCharacter('alice', sampleCharacter('Another Hero', 'alice'));
  assert.equal(playerCollision.ok, false);
  if (!playerCollision.ok) assert.equal(playerCollision.error.code, 'NAME_COLLISION');

  const crashSaved = await adapter.autosaveCrash(sampleCharacter('Crash recovery', 'Alice'));
  assert.equal(crashSaved.ok, true);
  const crash = await adapter.loadCrash();
  assert.equal(crash.ok, true);
  if (crash.ok) assert.equal(crash.character?.character.name, 'Crash recovery');

  characterFile.content = '{ definitely not JSON';
  const corrupted = await adapter.loadCharacter('Alice', 'Hero');
  assert.equal(corrupted.ok, false);
  if (!corrupted.ok) assert.equal(corrupted.error.code, 'INVALID_JSON');

  characterFile.content = '{"__proto__":{"polluted":true}}';
  const poisoned = await adapter.loadCharacter('Alice', 'Hero');
  assert.equal(poisoned.ok, false);
  if (!poisoned.ok) assert.equal(poisoned.error.code, 'UNSAFE_DATA');
});

test('rejects unsafe selected roots before writing', async () => {
  const driveRoot = new MemoryDirectoryHandle('C:');
  const driveAdapter = createFsStorageAdapter({ folderPicker: async () => driveRoot, handleStore: new MemoryHandleStore() });
  const driveResult = await driveAdapter.pickFolderAndOpen();
  assert.equal(driveResult.ok, false);
  if (!driveResult.ok) assert.equal(driveResult.error.code, 'UNSAFE_ROOT');

  const nonEmpty = new MemoryDirectoryHandle('Documents');
  await nonEmpty.getFileHandle('unrelated.txt', { create: true });
  const nonEmptyAdapter = createFsStorageAdapter({ folderPicker: async () => nonEmpty, handleStore: new MemoryHandleStore() });
  const nonEmptyResult = await nonEmptyAdapter.pickFolderAndOpen();
  assert.equal(nonEmptyResult.ok, false);
  if (!nonEmptyResult.ok) assert.equal(nonEmptyResult.error.code, 'UNSAFE_ROOT');

  const systemFolder = new MemoryDirectoryHandle('Windows');
  const systemAdapter = createFsStorageAdapter({ folderPicker: async () => systemFolder, handleStore: new MemoryHandleStore() });
  const systemResult = await systemAdapter.pickFolderAndOpen();
  assert.equal(systemResult.ok, false);
  if (!systemResult.ok) assert.equal(systemResult.error.code, 'UNSAFE_ROOT');

  const existingAppRoot = new MemoryDirectoryHandle('AIgamesheet');
  await existingAppRoot.getFileHandle('keep-me.txt', { create: true });
  const existingAppAdapter = createFsStorageAdapter({ folderPicker: async () => existingAppRoot, handleStore: new MemoryHandleStore() });
  const existingAppResult = await existingAppAdapter.pickFolderAndOpen();
  assert.equal(existingAppResult.ok, true);
});

test('uses a real Windows temp folder without reserved-name, trailing-dot, long-path, or case-collision escapes', { skip: process.platform !== 'win32' }, async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'pf1e-storage-'));
  try {
    const root = new NodeDirectoryHandle(temporaryRoot);
    const adapter = createFsStorageAdapter({ folderPicker: async () => root, handleStore: new MemoryHandleStore() });
    const opened = await adapter.pickFolderAndOpen();
    assert.equal(opened.ok, true);

    for (const reserved of ['CON', 'CON.txt', 'PRN', 'AUX', 'NUL', 'COM1', 'COM1 .txt', 'COM9', 'LPT1', 'LPT9']) {
      const rejected = await adapter.saveCharacter(reserved, sampleCharacter('Legal Hero', reserved));
      assert.equal(rejected.ok, false, `${reserved} must be rejected before node:fs sees it`);
      if (!rejected.ok) assert.equal(rejected.error.code, 'INVALID_NAME');
    }

    const trimmed = await adapter.saveCharacter('Alice. ', sampleCharacter('Hero. ', 'Alice. '));
    assert.equal(trimmed.ok, true);
    if (!trimmed.ok) return;
    assert.equal(trimmed.player, 'Alice');
    assert.equal(trimmed.name, 'Hero');
    const firstCharacterPath = join(temporaryRoot, 'AIgamesheet', 'pfmusers', 'Alice', 'Hero', 'character.json');
    assert.equal((await stat(firstCharacterPath)).isFile(), true);

    const characterName = 'L'.repeat(320);
    const playerName = 'P'.repeat(320);
    const longSaved = await adapter.saveCharacter(playerName, sampleCharacter(characterName, playerName));
    assert.equal(longSaved.ok, true);
    if (!longSaved.ok) return;
    assert.equal(longSaved.player.length, 60);
    assert.equal(longSaved.name.length, 60);
    const boundedPath = join(temporaryRoot, 'AIgamesheet', 'pfmusers', longSaved.player, longSaved.name, 'character.json');
    assert.ok(boundedPath.length < 260, `sanitized path should stay under legacy MAX_PATH: ${boundedPath.length}`);
    assert.equal((await stat(boundedPath)).isFile(), true);

    const hero = await adapter.saveCharacter('Case Player', sampleCharacter('Hero', 'Case Player'));
    assert.equal(hero.ok, true);
    const heroFile = join(temporaryRoot, 'AIgamesheet', 'pfmusers', 'Case Player', 'Hero', 'character.json');
    const beforeCollision = await readFile(heroFile, 'utf8');
    const collision = await adapter.saveCharacter('Case Player', sampleCharacter('hero', 'Case Player'));
    assert.equal(collision.ok, false);
    if (!collision.ok) assert.equal(collision.error.code, 'NAME_COLLISION');
    assert.equal(await readFile(heroFile, 'utf8'), beforeCollision, 'a collision must not overwrite the first character');

    const players = await adapter.listPlayers();
    assert.equal(players.ok, true);
    assert.ok(players.ok && players.players.some((player) => player.name === 'Alice'));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
