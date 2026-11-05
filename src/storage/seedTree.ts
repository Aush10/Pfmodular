import { createBlankCharacter } from '../data/defaultCharacter';
import type { StorageAdapter, StorageResult } from './types';

export interface SeedTreeResult {
  player: string;
  character: string;
  crashCharacter: string;
}

/**
 * Seeds the selected folder with deliberately fictional data so the on-disk
 * layout can be inspected. It does not select a folder or touch application UI.
 */
export async function seedStorageTree(adapter: StorageAdapter): Promise<StorageResult<SeedTreeResult>> {
  const player = 'Sample Player';
  const character = createBlankCharacter();
  character.name = 'Sample Character';
  character.player = player;
  character.biography.notes = 'Sample data only. Delete this tree when inspection is complete.';
  character.journal = [
    {
      id: 'seed-journal-1',
      title: 'Storage tree sample',
      sessionDate: 'Not a real session',
      content: 'This is plain-text sample content created by seedStorageTree.',
      recalledNotes: [],
      images: [],
      tags: ['sample'],
      createdAt: 0,
      updatedAt: 0,
    },
  ];

  const saved = await adapter.saveCharacter(player, character);
  if (!saved.ok) return saved;

  const crash = createBlankCharacter();
  crash.name = 'Crash Recovery Sample';
  crash.player = player;
  crash.biography.notes = 'Sample crash-recovery entry.';
  const crashSaved = await adapter.autosaveCrash(crash);
  if (!crashSaved.ok) return crashSaved;

  return { ok: true, player: saved.player, character: saved.name, crashCharacter: crashSaved.name };
}

/** Convenience helper for a button click: pick the folder, then seed it. */
export async function pickAndSeedStorageTree(adapter: StorageAdapter): Promise<StorageResult<SeedTreeResult>> {
  const opened = await adapter.pickFolderAndOpen();
  if (!opened.ok) return opened;
  return seedStorageTree(adapter);
}
