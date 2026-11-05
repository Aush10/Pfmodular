import type { PF1Character } from '../types/character';

/**
 * The storage boundary deliberately has a small, UI-agnostic contract. A
 * caller must explicitly select a folder before attempting a save.
 */
export interface StorageError {
  code: string;
  message: string;
}

export type StorageSuccess<T extends object = Record<string, never>> = {
  ok: true;
} & T;

export interface StorageFailure {
  ok: false;
  error: StorageError;
}

export type StorageResult<T extends object = Record<string, never>> = StorageSuccess<T> | StorageFailure;

export interface StoredPlayer {
  /** Folder-safe display name. */
  name: string;
}

export interface StoredCharacterSummary {
  /** Folder-safe character name. */
  name: string;
  /** Stable ID kept in the character.json envelope, not in the character schema. */
  characterId: string;
  savedAt: string;
}

export interface StorageStatus {
  supported: boolean;
  selected: boolean;
  permission: 'granted' | 'prompt' | 'denied' | 'unknown';
  rootName?: string;
  message?: string;
}

export interface SaveReceipt {
  player: string;
  name: string;
  characterId: string;
  savedAt: string;
}

export interface LoadedCharacter {
  character: PF1Character;
  characterId: string;
  savedAt: string;
}

export interface StorageAdapter {
  saveCharacter(player: string, character: PF1Character): Promise<StorageResult<SaveReceipt>>;
  autosaveCrash(character: PF1Character): Promise<StorageResult<Omit<SaveReceipt, 'player'>>>;
  loadCrash(): Promise<StorageResult<{ character: LoadedCharacter | null }>>;
  listPlayers(): Promise<StorageResult<{ players: StoredPlayer[] }>>;
  listCharacters(player: string): Promise<StorageResult<{ characters: StoredCharacterSummary[] }>>;
  loadCharacter(player: string, name: string): Promise<StorageResult<LoadedCharacter>>;
  pickFolderAndOpen(): Promise<StorageResult<{ rootName: string }>>;
  getStatus(): Promise<StorageResult<StorageStatus>>;
}
