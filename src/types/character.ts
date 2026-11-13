/**
 * Core type definitions for Pathfinder 1st Edition Character Sheet & Modular Workspace
 */

export type AbilityName = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export interface AbilityScore {
  name: AbilityName;
  base: number; // 6 to 18 (point buy base)
  raceMod: number; // e.g. +2, +4
  levelAsiMod: number; // +1 every 4 levels (levels 4, 8, 12, 16, 20)
  enhMod: number;
  miscMod: number;
  tempMod: number;
  directMod?: number; // Direct modifier bonus not calculated with total score
}

export type BuffBonusType =
  | 'Enhancement'
  | 'Circumstance'
  | 'Competence'
  | 'Deflection'
  | 'Dodge'
  | 'Insight'
  | 'Item'
  | 'Inherent'
  | 'Luck'
  | 'Morale'
  | 'Pro/Sac'
  | 'Race'
  | 'NAT armor'
  | 'Armor'
  | 'Level advance'
  | 'Shield'
  | 'Untyped'
  | 'Size'
  | 'Alt size';

export type BuffStatTarget =
  | 'hp'
  | 'mattack'
  | 'rattack'
  | 'fort'
  | 'ref'
  | 'will'
  | 'ac'
  | 'str'
  | 'dex'
  | 'con'
  | 'int'
  | 'wis'
  | 'cha'
  | 'str_mod'
  | 'dex_mod'
  | 'con_mod'
  | 'int_mod'
  | 'wis_mod'
  | 'cha_mod';

export type BuffBoxData = Record<BuffBonusType, Partial<Record<BuffStatTarget, number>>>;

export interface CustomBuffEffect {
  id: string;
  name: string;
  category: 'activatable' | 'permanent' | 'debuff';
  bonusType: BuffBonusType;
  isActive: boolean;
  values: Partial<Record<BuffStatTarget, number>>;
  duration?: string;
  notes?: string;
  itemId?: string; // Optional link to inventory item
}

export interface AdditionalHpBonus {
  id: string;
  amount: number;
  source: string; // e.g. "Toughness", "Favored Class"
}

export interface HpBreakdown {
  hitDiceCount: number; // e.g. 12
  hitDiceSize: number; // e.g. 10 for d10
  hitDiceRolledBase: number; // base HP from HD
  additionalBonuses: AdditionalHpBonus[];
}

export interface SavingThrow {
  name: 'Fortitude' | 'Reflex' | 'Will';
  base: number;
  magicMod: number;
  miscMod: number;
  tempMod: number;
}

export interface WeaponAttack {
  id: string;
  name: string;
  category: 'Melee' | 'Ranged';
  attackModOverride?: number; // optional manual override
  damageFormula: string; // e.g. "1d8+4" or custom formula reference "{firebreath}"
  critical: string; // e.g. "19-20/x2"
  range: string; // e.g. "50 ft" or "Melee"
  damageType: string; // e.g. "Slashing", "Fire"
  ammunition?: string;
  weight: number;
  specialProperties?: string;
  isEquipped: boolean;
  imageUrl?: string;
}

export interface ArmorItem {
  id: string;
  name: string;
  type: 'Light' | 'Medium' | 'Heavy' | 'Shield' | 'Other';
  acBonus: number;
  maxDex: number;
  checkPenalty: number;
  spellFailure: number;
  speed30: number;
  weight: number;
  isEquipped: boolean;
  notes?: string;
  imageUrl?: string;
}

export interface SkillItem {
  id: string;
  name: string;
  keyAbility: AbilityName;
  isClassSkill: boolean;
  ranks: number;
  miscMod: number;
  hasArmorCheckPenalty: boolean;
  isTrainedOnly: boolean;
  notes?: string;
}

export type ItemBodySlot =
  | 'head'
  | 'eyes'
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'body'
  | 'armor'
  | 'belt'
  | 'wrists'
  | 'hands'
  | 'ring1'
  | 'ring2'
  | 'feet'
  | 'weapon1'
  | 'weapon2'
  | 'shield'
  | 'slotless'
  | 'none';

export type QuickInfoDisplayType =
  | 'weight'
  | 'quantity'
  | 'value'
  | 'level'
  | 'slot'
  | 'charges';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  weight: number;
  location: string;
  storageType?: 'worn' | 'stored' | 'companion';
  category?: 'Weapons' | 'Armor' | 'Magic Items' | 'Potions/Scrolls' | 'Gear' | 'Valuables' | 'Bag/Sheathe' | 'Garment' | 'Consumable' | 'General';
  valueGp?: number;
  notes?: string;
  // Interactive Inventory features from wireframe:
  bodySlot?: ItemBodySlot;
  isEquipped?: boolean;
  quickInfoMode?: QuickInfoDisplayType;
  macroBox?: string; // e.g. "+2>>laziness", "1d8+STR"
  imageUrl?: string;
  shortDescription?: string;
  itemLevel?: number;
  chargesCurrent?: number;
  chargesMax?: number;
  hp?: number;
  hardness?: number;
  effect?: string;
  // Item Buff fields (synced with Buff Box)
  hasBuff?: boolean;
  buffActive?: boolean;
  buffBonusType?: BuffBonusType;
  buffTargetStat?: BuffStatTarget;
  buffTargetValue?: number;
  buffValues?: Partial<Record<BuffStatTarget, number>>;
}

export interface ResourceTracker {
  id: string;
  name: string;
  current: number;
  max: number;
  macroKey?: string; // e.g. "SMITE", "RAGE", "KI"
  category?: 'Class Resource' | 'Spell Slot' | 'Resource Pool' | 'Special';
  notes?: string;
}

export interface CharacterActionItem {
  id: string;
  name: string;
  category: 'Spells' | 'SLA' | 'Class Ability' | 'Feats' | 'Racial' | 'Combat' | 'Other';
  actionType?: 'Standard' | 'Move' | 'Swift' | 'Immediate' | 'Free' | 'Full-Round' | '1 Round';
  macroFormula?: string; // e.g. "2d6+CHA"
  macroKey?: string;
  icon?: string;
  description: string;
  shortSummary?: string;
  usesPerDay?: string;
  saveDC?: string;
  range?: string;
  target?: string;
  duration?: string;
}

export interface FeatItem {
  id: string;
  name: string;
  type?: string; // General, Combat, Metamagic, Racial, Item Creation
  prerequisites?: string;
  summary: string;
  description?: string;
}

export interface DowntimeCapital {
  currentGp: number;
  bankGp: number;
  level: number;
  totalDp: number;
  goods: number;
  influence: number;
  labor: number;
  magic: number;
  kbp: number; // Kingdom Building Points
}

export interface MagicItemSlots {
  armor?: string;
  weapon1?: string;
  weapon2?: string;
  shield?: string;
  head?: string;
  headband?: string;
  eyes?: string;
  neck?: string;
  shoulders?: string;
  chest?: string;
  belt?: string;
  body?: string;
  gloves?: string;
  wrist?: string;
  ring1?: string;
  ring2?: string;
  slotless?: string;
  backpack?: string;
}

export interface CompanionNPC {
  id: string;
  name: string;
  type: 'Familiar' | 'Animal Companion' | "Nature's Bond" | 'NPC' | 'Summon' | 'Mount' | 'Eidolon' | 'Other';
  relation: string;
  notes?: string;
  hp?: string;
  ac?: string;
}

export interface CharacterBioData {
  scratchpad: string;
  portraits: string[];
  currentPortraitIndex: number;
  bioSections: { id: string; title: string; content: string }[];
  skin?: string;
}


export interface SpellSlotLevel {
  level: number;
  saveDC: number;
  spellsPerDay: number;
  bonusSpells: number;
  spellsKnown: number;
  usedSlots: number;
}

export interface SpellItem {
  id: string;
  level: number;
  name: string;
  school: string;
  castTime: string;
  range: string;
  duration: string;
  save: string;
  spellResistance: string;
  preparedCount: number;
  isCast: boolean;
  description: string;
}

export type MacaroniCategory = 'logic' | 'placeholder' | 'action' | 'step';

export interface UiMakePreset {
  tag: number; // e.g. 11, 42, 101
  name: string; // e.g. "Dragonfire Critical"
  layout: 'floating_card' | 'banner' | 'modal' | 'toast';
  font: 'serif' | 'sans' | 'mono' | 'gothic';
  theme: 'crimson_gold' | 'celestial_cyan' | 'toxic_emerald' | 'necrotic_slate' | 'default_amber';
  imageUrl?: string;
  hyperlinkUrl?: string;
  hyperlinkLabel?: string;
  soundCue?: 'fanfare' | 'critical' | 'whisper' | 'bell';
}

export interface CustomFormulaObject {
  id: string;
  name: string; // identifier e.g. "firebreath"
  description: string;
  formula: string; // e.g. '2d6 + (5 * floor(level / 2)) + " fire"'
  category: MacaroniCategory | 'Attack' | 'Buff' | 'Damage' | 'Utility';
  stepCount?: number;
}

export interface ConditionState {
  blinded: boolean;
  cowering: boolean;
  dazzled: boolean;
  deafened: boolean;
  entangled: boolean;
  exhausted: boolean;
  fatigued: boolean;
  frightened: boolean;
  grappled: boolean;
  panicked: boolean;
  pinned: boolean;
  prone: boolean;
  shaken: boolean;
  sickened: boolean;
  stunned: boolean;
  haste: boolean;
  prayer: boolean;
  enlarge: boolean;
  reduce: boolean;
  heroism: boolean;
}

export type ThemeMode = 'parchment' | 'blueprint' | 'mythweavers' | 'print';
export type SheetFont = 'times' | 'cinzel' | 'sans' | 'mono';

export interface WorkspaceLayout {
  theme: ThemeMode;
  font: SheetFont;
  activeSheet: 1 | 2 | 3 | 4;
  showAllSheets: boolean;
  visibleModules: {
    abilities: boolean;
    hpAndVitals: boolean;
    armorClass: boolean;
    saves: boolean;
    attacks: boolean;
    weapons: boolean;
    armor: boolean;
    feats: boolean;
    skills: boolean;
    inventory: boolean;
    currency: boolean;
    languages: boolean;
    spellMatrix: boolean;
    spellbook: boolean;
    conditions: boolean;
    biography: boolean;
    buffBox: boolean;
    addClass: boolean;
    levelStepper: boolean;
    turnStepper: boolean;
    quickMacros: boolean;
    formulaStudio: boolean;
    statblock: boolean;
    profile: boolean;
    notes: boolean;
  };
}

export interface ClassGridRow {
  level: number;
  bab: number;
  babString?: string;
  fort: number;
  ref: number;
  will: number;
  special: string;
}

export interface CustomClassGrid {
  id: string; // 'class1', 'class2', etc.
  className: string;
  level: number;
  hitDie: number; // 6, 8, 10, 12
  skillPointsPerLevel: number; // 2, 4, 6, 8
  proficiencies: string;
  starterKitName?: string;
  rawText: string;
  rows: ClassGridRow[];
  classSkillsText?: string; // Copy-pasted class skills for Add Kit
  archetypeId?: string; // Active archetype
}

export interface ArchetypeSwap {
  id: string;
  level: number;
  replacedFeature: string;
  newFeature: string;
  description?: string;
}

export interface ArchetypeConfig {
  id: string;
  name: string;
  targetClassId?: string; // e.g. 'class1'
  targetClassName?: string; // e.g. 'Cavalier'
  lostFeatures?: string[]; // Array of feature names/strings lost in this archetype
  levelAbilities?: Record<number, string>; // Archetype abilities input at levels 1-20
  isActive?: boolean;
  swaps?: ArchetypeSwap[];
}

export interface SkillPointsConfig {
  manualOverride?: number;
  isManualOverride?: boolean;
  extraPerLevel?: number;
  bonusFlat?: number;
  intOverride?: number;
  classSpOverrides?: Record<string, number>;
}

export interface CareerLevelEntry {
  level: number; // 1 to 20
  primaryClassId: string;
  primaryClassLevel: number;
  isGestalt: boolean;
  gestaltClassId?: string;
  gestaltClassLevel?: number;
  favoredClassBonus: 'hp' | 'skill' | 'none';
  customHpRoll?: number;
  notes?: string;
}

export interface CareerProgressionData {
  mode: 'standard' | 'multiclass' | 'gestalt';
  useFractionalBab: boolean;
  useFractionalSaves: boolean;
  levels: CareerLevelEntry[];
  archetypes: ArchetypeConfig[];
  variantMulticlassing?: {
    enabled: boolean;
    secondaryClass: string;
  };
  thirdPartySupport?: {
    pathOfWarEnabled: boolean;
    spheresEnabled: boolean;
    disciplines?: string[];
    maneuversKnown?: number;
    maneuversReadied?: number;
    spheresTalents?: number;
    spellPoints?: number;
  };
}

export type LoadoutSectionKey =
  | 'abilities'
  | 'combatStats'
  | 'weapons'
  | 'armor'
  | 'inventory'
  | 'featsAndAbilities'
  | 'skills'
  | 'magic'
  | 'formulasAndMacros'
  | 'buffBox'
  | 'profileAndBio'
  | 'rollupNotes'
  | 'customClasses';

export interface ProfileCustomField {
  id: string;
  title: string;
  content: string;
}

export interface CharacterProfileData {
  avatarUrl?: string;
  customFields: ProfileCustomField[];
}

export interface RollupNotesData {
  content: string;
  isRolledUp: boolean;
}

export interface CharacterClassEntry {
  id: string;
  name: string;
  level: number;
  hitDie: number; // 6, 8, 10, 12
  skillPointsPerLevel: number; // 2, 4, 6, 8
  babProgression: 'full' | 'threeQuarter' | 'half';
  isFavoredClass: boolean;
}

export interface PF1Character {
  // Identity & Header
  name: string;
  player: string;
  alignment: string;
  characterClass: string;
  level: number;
  /** Set only after the player names a point-buy budget. Never assumed. */
  pointBuyBudget?: number;
  race: string;
  deity: string;
  size: 'Fine' | 'Diminutive' | 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan' | 'Colossal';
  gender: string;
  age: number;
  height: string;
  weight: string;
  eyes: string;
  hair: string;
  campaign: string;
  currentXP: number;
  nextLevelXP: number;
  heroPoints: number;

  // Multi-Class Table (Add a Class support)
  classes: CharacterClassEntry[];

  // Abilities
  abilities: Record<AbilityName, AbilityScore>;

  // Hit Points & Vitals
  hpTotalMax: number;
  hpCurrent: number;
  hpNonlethal: number;
  hpTemp: number; // THP
  hitDice: string;
  hpBreakdown: HpBreakdown & {
    calcMethod: 'average' | 'max' | 'rolled';
  };
  deathSaves: [boolean, boolean, boolean]; // 3 check boxes near HP
  damageReduction: string;
  fastHealing: string;
  spellResistance: number;
  resistances: string;
  immunities: string;

  // Turn Stepper & Combat tracker
  combatTracker: {
    round: number;
    turn: number;
    isInCombat: boolean;
  };

  // Buff Box (Typed bonus matrix & Custom Status Effects)
  buffBox: BuffBoxData;
  customBuffs?: CustomBuffEffect[];

  // Skills config
  classSkillPointsPerLevel: number;

  // Initiative & Speed
  initMiscMod: number;
  speedBase: number;
  speedClimb: number;
  speedSwim: number;
  speedFly: number;
  flyManeuverability: string;

  // Combat stats
  baseAttackBonus: number;
  naturalArmorMod: number;
  deflectionMod: number;
  dodgeMod: number;
  acMiscMod: number;
  cmbMiscMod?: number;
  cmdMiscMod?: number;
  cmdAbilityChoice?: 'STR' | 'DEX' | 'BOTH';

  // Saves
  saves: {
    fortitude: SavingThrow;
    reflex: SavingThrow;
    will: SavingThrow;
  };

  // Attacks & Equipment
  weapons: WeaponAttack[];
  armor: ArmorItem[];
  featsAndAbilities: string[];

  // Skills
  skills: SkillItem[];
  favoredClassSkillRanks: number;

  // Gear & Wealth
  inventory: InventoryItem[];
  droppedBags?: Record<string, boolean>; // Bag/container dropped status (held by default, dropped subtracts load)
  currency: {
    cp: number;
    sp: number;
    gp: number;
    pp: number;
  };
  includeCoinWeight?: boolean;
  coinWeightRate?: number;
  languages: string[];

  // Magic
  casterLevel: number;
  spellKeyAbility: AbilityName;
  spellSlots: SpellSlotLevel[];
  spells: SpellItem[];

  // Conditions & Buffs
  conditions: ConditionState;

  // Custom Player Formula Objects
  customObjects: CustomFormulaObject[];

  // Bio & Notes
  biography: {
    description: string;
    personality: string;
    traits: string;
    flaws: string;
    allies: string;
    enemies: string;
    notes: string;
  };

  // Modular Tabletop Tools State (Stepper, Deck, XDX)
  stepperRules?: StepperRule[];
  deckState?: DeckState;
  xdxMacros?: XdxMacroEntry[];

  // Profile Module & Roll-up Notes
  profileData?: CharacterProfileData;
  rollupNotes?: RollupNotesData;

  // Custom Class Progression Grids (Add Class Tool)
  customClassGrids?: Record<string, CustomClassGrid>;

  // Career Progression, Multiclassing & Gestalt
  careerData?: CareerProgressionData;

  // Skill Points Custom Breakdown & Override
  skillPointsConfig?: SkillPointsConfig;

  // Resource Trackers, Actions & Abilities (Image 1)
  resourceTrackers?: ResourceTracker[];
  characterActions?: CharacterActionItem[];
  characterFeats?: FeatItem[];

  // Bio, Storage, Downtime Capital & Companions (Image 2)
  downtimeCapital?: DowntimeCapital;
  magicItemSlots?: MagicItemSlots;
  companions?: CompanionNPC[];
  characterBio?: CharacterBioData;
  activeStorageTab?: 'worn' | 'stored' | 'companion';

  // Session Journal Tool
  journal?: JournalEntry[];

  // Installed Standalone Modules (e.g. AI Companion)
  installedModules?: {
    aiCompanion?: boolean;
    aiSettings?: AIModuleSettings;
  };

  // Workspace Image Library
  workspaceLibraryImages?: Array<{
    id: string;
    name: string;
    url: string;
    category: 'portrait' | 'item' | 'sketch' | 'location' | 'general';
    createdAt: number;
  }>;

  // Macaroni UI Make Presets (<11"message">)
  uiMakePresets?: UiMakePreset[];
}

export type SketchDetailQuality = 'crude' | 'passible' | 'tasteful' | 'astounding';

export interface JournalImage {
  id: string;
  url: string;
  caption?: string;
  style?: 'sketch' | 'standard';
  quality?: SketchDetailQuality;
  prompt?: string;
  createdAt?: number;
}

export interface JournalEntry {
  id: string;
  title: string;
  sessionDate: string;
  realDate?: string;
  location?: string;
  content: string;
  characterVoiceUsed?: string;
  recalledNotes: string[];
  images: JournalImage[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AIModuleSettings {
  isInstalled: boolean;
  allowedFields: {
    hp: boolean;
    conditions: boolean;
    currency: boolean;
    inventory: boolean;
    notes: boolean;
    journal: boolean;
    customFormulas: boolean;
  };
  preferredVoice?: string;
}

export interface StepperRule {
  id: string;
  rawText: string;
  type: 'track' | 'apply'; // 'track' is <<, 'apply' is >>
  label: string; // e.g. "Rage", "Bleed", "Bomb"
  currentValue?: number; // for tracking counters
  stepAmount: number; // e.g. -1, +2
  triggerValue?: number; // e.g. 0
  triggerAlert?: string; // e.g. "KABOOM"
  targetStat?: string; // e.g. "damage", "hp"
  isCompleted?: boolean;
  isActive: boolean;
  playerNote?: string; // from // comment
}

export interface DeckState {
  currentDeckName: string; // e.g. 'standard.txt', 'bike.txt', 'tarot.txt', 'manythings.txt', 'wildmagic.txt', 'custom.txt'
  activeCards: string[]; // up to 100 cards
  handCards: string[];
  playedCards: string[]; // last played hand
  deadCards: string[]; // discard pile
}

export interface XdxMacroEntry {
  id: string;
  name: string;
  formula: string;
  description?: string;
}

