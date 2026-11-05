/**
 * Macaroni Macro Language Types & Definitions
 * Verb-centric, unambiguous symbolic grammar for Pathfinder 1e
 */

import {
  PF1Character,
  UiMakePreset,
  MacaroniCategory,
  BuffBonusType,
  BuffStatTarget,
} from '../../types/character';

export type MacaroniTokenType =
  | 'hash_call'        // #HP, #STR, #BAB
  | 'eval_bracket'     // [1d4 + #STR]
  | 'pull_listen'      // <<firebreath
  | 'name_def'         // name:
  | 'math_call'        // {firebreath}
  | 'text_literal'     // "to hit", "fire"
  | 'delta_mutator'    // ^-d6, ^+10, rounds^-1
  | 'send_push'        // >>HP-5, >>target
  | 'ui_make'          // <11"message">, <^>, <?>
  | 'buff_make'        // <^{7:2}+4>, <^AC+10>, <^ENHANCEMENTBONUSTOAC+4>
  | 'query_prompt'     // <? "Question" | opt1 / opt2 / [] >
  | 'external_scope'   // ~target, ~companion, ~wp-1
  | 'slot_separator'   // & (multi-slot results: .1, .2)
  | 'pipe_branch'      // | or || (if-then conditions)
  | 'terminal_finish'  // $ (absolute / finished / sub-macro run)
  | 'step_trigger'     // ! (advance self-altering stepper)
  | 'keyword_this'     // this
  | 'keyword_me'       // @me
  | 'number'           // 10, 4.5
  | 'dice'             // 1d20, 2d6, 4d6k3
  | 'operator'         // +, -, *, /, %
  | 'punctuation'      // (, ), ,, .
  | 'inert_text';      // uncontextualized words (ignored)

export interface MacaroniToken {
  type: MacaroniTokenType;
  value: string;
  raw: string;
}

export interface MacaroniSlotResult {
  slot: number; // 1-indexed (.1, .2, ...)
  label?: string;
  raw: string;
  evaluated: string;
  isNumericOnly: boolean;
  diceOutcome?: any;
}

export interface MacaroniBuffMakeSpec {
  raw: string;
  name?: string; // If labeled e.g. MageArmor: ...
  isDirectMatrix: boolean; // True if unnamed -> writes directly to 19x19 buffBox matrix
  isLockedOnce: boolean; // True if terminated with $ -> locks active / permanent
  category: 'activatable' | 'permanent' | 'debuff';
  bonusType: BuffBonusType;
  values: Partial<Record<BuffStatTarget, number>>;
  matrixEntries: Array<{
    col?: number;
    row?: number;
    stat: BuffStatTarget;
    bonusType: BuffBonusType;
    value: number;
  }>;
  summaryText: string;
}

export interface MacaroniExecutionResult {
  raw: string;
  fullOutput: string;
  slots: MacaroniSlotResult[];
  isError: boolean;
  errorMessage?: string;
  tokens: MacaroniToken[];
  rollable: boolean;
  alertEvents?: Array<{ tag?: number; message: string; preset?: UiMakePreset }>;
  buffMakeEvents?: MacaroniBuffMakeSpec[];
  queryEvent?: MacaroniQueryRequest;
  appliedPushes?: string[];
  stateMutations?: Array<{ field: string; delta: number; description: string }>;
  isFinished?: boolean; // triggered by $
  quirkyMessage?: string; // Playful Pathfinder 1e cheese/tabletop feedback
}

export interface MacaroniQueryOption {
  label: string;
  value: string;
  isStat?: boolean;
  isCustomInput?: boolean;
}

export interface MacaroniQueryRequest {
  id: string;
  prompt: string;
  options: MacaroniQueryOption[];
  onSelect: (chosenValue: string) => void;
  onCancel?: () => void;
}

export interface FloatingAlertPayload {
  id: string;
  message: string;
  tag?: number;
  preset?: UiMakePreset;
  timestamp: number;
}
