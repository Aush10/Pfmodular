import React, { useState } from 'react';
import {
  Layers,
  RotateCcw,
  Shuffle,
  Play,
  Trash2,
  FileText,
  FolderOpen,
  ArrowRight,
  X,
  HelpCircle,
  Eye,
  Check,
} from 'lucide-react';
import { PF1Character, DeckState } from '../../types/character';

// Standard 52 playing cards preset
const STANDARD_52_CARDS = [
  'Ace Spades', 'King Spades', 'Queen Spades', 'Jack Spades', '10 Spades', '9 Spades', '8 Spades', '7 Spades', '6 Spades', '5 Spades', '4 Spades', '3 Spades', '2 Spades',
  'Ace Hearts', 'King Hearts', 'Queen Hearts', 'Jack Hearts', '10 Hearts', '9 Hearts', '8 Hearts', '7 Hearts', '6 Hearts', '5 Hearts', '4 Hearts', '3 Hearts', '2 Hearts',
  'Ace Diamonds', 'King Diamonds', 'Queen Diamonds', 'Jack Diamonds', '10 Diamonds', '9 Diamonds', '8 Diamonds', '7 Diamonds', '6 Diamonds', '5 Diamonds', '4 Diamonds', '3 Diamonds', '2 Diamonds',
  'Ace Clubs', 'King Clubs', 'Queen Clubs', 'Jack Clubs', '10 Clubs', '9 Clubs', '8 Clubs', '7 Clubs', '6 Clubs', '5 Clubs', '4 Clubs', '3 Clubs', '2 Clubs',
];

const TAROT_CARDS = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World',
  'Ace of Wands', 'King of Wands', 'Queen of Wands', 'Knight of Wands', 'Page of Wands',
  'Ace of Cups', 'King of Cups', 'Queen of Cups', 'Knight of Cups', 'Page of Cups',
  'Ace of Swords', 'King of Swords', 'Queen of Swords', 'Knight of Swords', 'Page of Swords',
  'Ace of Pentacles', 'King of Pentacles', 'Queen of Pentacles', 'Knight of Pentacles', 'Page of Pentacles',
];

const MANYTHINGS_CARDS = [
  'Sun (50k XP & Wondrous Item)', 'Moon (1d4 Wishes)', 'Star (+2 Inherent Ability)', 'Comet (Defeat next hostile single-handed)',
  'Throne (+6 Diplomacy & Keep)', 'Key (Major Magic Weapon)', 'Knight (Fighter 4th servant)', 'Gem (50k gp in gems)',
  'The Void (Body in prison sphere)', 'Flames (Enmity of Powerful Devil)', 'Skull (Dread Wraith fight)', 'Talons (All magic items disintegrate)',
  'Idiot (Lose 1d4+1 INT)', 'Donjon (Imprisoned forever)', 'Ruin (All wealth & property lost)', 'Euryale (-1 to all saving throws)',
  'Rogue (One ally turns hostile)', 'Balance (Alignment inverted)', 'Jester (10k XP or 2 more draws)', 'Vizier (Answer to 1 question)', 'Fool (Lose 10k XP)',
];

const WILDMAGIC_CARDS = [
  'Roll on this table every turn for 1 min', 'Surge of Vitality: Max HP +10 for 1 hr', 'Teleport 60ft to unoccupied space',
  'Levitate 20ft into the air for 1 min', 'Skin turns vibrant cobalt blue', 'Sprout feathers for 1 hour',
  'Cast Fireball centered on self', 'Cast Magic Missile at closest 3 targets', 'Regain lowest expended spell slot',
  'Surrounded by faint illusory music', 'Blind and deaf for 1 round', 'Cast Invisibility on self',
  'Grow a thick beard of pure feathers', 'Shrink one size category for 1 hour', 'Enlarge one size category for 1 hour',
  'Immunity to alcohol for 1 week', 'Cast Mirror Image with 3 duplicates', 'Speak only in rhyming verse for 10 min',
];

const PRESET_FILES: Record<string, string[]> = {
  'standard.txt': STANDARD_52_CARDS,
  'bike.txt': STANDARD_52_CARDS,
  'tarot.txt': TAROT_CARDS,
  'manythings.txt': MANYTHINGS_CARDS,
  'wildmagic.txt': WILDMAGIC_CARDS,
};

interface DeckToolProps {
  isOpen: boolean;
  onClose: () => void;
  character: PF1Character;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  isDocked?: boolean;
}

export const DeckTool: React.FC<DeckToolProps> = ({
  isOpen,
  onClose,
  character,
  onUpdateCharacter,
  isDocked = false,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const [editingFile, setEditingFile] = useState<'active' | 'dead' | null>(null);
  const [fileTextContent, setFileTextContent] = useState<string>('');
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Deck state in character or default
  const deckState: DeckState = character.deckState || {
    currentDeckName: 'standard.txt',
    activeCards: [...STANDARD_52_CARDS],
    handCards: [],
    playedCards: [],
    deadCards: [],
  };

  const updateDeckState = (newState: DeckState) => {
    onUpdateCharacter((prev) => ({
      ...prev,
      deckState: newState,
    }));
  };

  const notify = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // Helper shuffle
  const shuffleArray = (arr: string[]) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // DRAW LOGIC
  // - draw (draws 1 random)
  // - draw 5 (draws 5 random)
  // - draw, 5 (draws card named '5')
  // - draw 5, 5 (draws up to five '5's, fallback to random)
  // - draw club 4 (forces 'club 4')
  const handleDraw = (count: number = 1, forceName?: string) => {
    let { activeCards, handCards, deadCards, playedCards, currentDeckName } = deckState;
    if (activeCards.length === 0) {
      notify('No cards in Active deck! Use Reset or Shuffle to return cards.');
      return;
    }

    const drawn: string[] = [];
    let remainingActive = [...activeCards];

    if (forceName) {
      const cleanForce = forceName.toLowerCase().replace(/\s+/g, '');
      // Look for matches
      let matches = remainingActive.filter((c) => c.toLowerCase().replace(/\s+/g, '').includes(cleanForce));
      
      const takeCount = Math.min(count, matches.length);
      for (let i = 0; i < takeCount; i++) {
        const found = matches[i];
        drawn.push(found);
        const idx = remainingActive.indexOf(found);
        if (idx !== -1) remainingActive.splice(idx, 1);
      }

      // If requested more than forced cards found, draw random
      while (drawn.length < count && remainingActive.length > 0) {
        const randIdx = Math.floor(Math.random() * remainingActive.length);
        drawn.push(remainingActive.splice(randIdx, 1)[0]);
      }
    } else {
      const toDraw = Math.min(count, remainingActive.length);
      for (let i = 0; i < toDraw; i++) {
        const randIdx = Math.floor(Math.random() * remainingActive.length);
        drawn.push(remainingActive.splice(randIdx, 1)[0]);
      }
    }

    const newHand = [...handCards, ...drawn];
    updateDeckState({
      ...deckState,
      activeCards: remainingActive,
      handCards: newHand,
    });

    notify(`Drawn ${drawn.length} card(s): ${drawn.join(', ')}`);
  };

  // PLAY LOGIC
  // - play (removes all cards from hand to played)
  // - play jack hearts, club4 (plays specific cards)
  const handlePlay = (specificCards?: string[]) => {
    let { handCards, playedCards } = deckState;
    if (handCards.length === 0) {
      notify('No cards in hand to play!');
      return;
    }

    if (!specificCards || specificCards.length === 0) {
      // Play entire hand
      updateDeckState({
        ...deckState,
        playedCards: [...handCards],
        handCards: [],
      });
      notify(`Played hand: ${handCards.join(', ')}`);
    } else {
      const toPlay: string[] = [];
      const remainingHand = [...handCards];

      for (const cardQuery of specificCards) {
        const clean = cardQuery.toLowerCase().replace(/\s+/g, '');
        const foundIdx = remainingHand.findIndex((c) => c.toLowerCase().replace(/\s+/g, '').includes(clean));
        if (foundIdx !== -1) {
          toPlay.push(remainingHand.splice(foundIdx, 1)[0]);
        }
      }

      if (toPlay.length === 0) {
        notify(`None of the specified cards were in your hand!`);
        return;
      }

      updateDeckState({
        ...deckState,
        playedCards: toPlay,
        handCards: remainingHand,
      });
      notify(`Played: ${toPlay.join(', ')}`);
    }
  };

  // DISCARD LOGIC (dis)
  // Skips play and removes cards straight to dead pile
  const handleDiscard = (specificCards?: string[]) => {
    let { handCards, deadCards } = deckState;
    if (handCards.length === 0) {
      notify('No cards in hand to discard!');
      return;
    }

    if (!specificCards || specificCards.length === 0) {
      updateDeckState({
        ...deckState,
        deadCards: [...deadCards, ...handCards],
        handCards: [],
      });
      notify(`Discarded ${handCards.length} card(s) to Dead pile.`);
    } else {
      const discarded: string[] = [];
      const remainingHand = [...handCards];

      for (const cardQuery of specificCards) {
        const clean = cardQuery.toLowerCase().replace(/\s+/g, '');
        const foundIdx = remainingHand.findIndex((c) => c.toLowerCase().replace(/\s+/g, '').includes(clean));
        if (foundIdx !== -1) {
          discarded.push(remainingHand.splice(foundIdx, 1)[0]);
        }
      }

      updateDeckState({
        ...deckState,
        deadCards: [...deadCards, ...discarded],
        handCards: remainingHand,
      });
      notify(`Discarded: ${discarded.join(', ')}`);
    }
  };

  // SHUFFLE LOGIC
  // shuffle: adds all cards back to active
  // shuffle jackhearts: returns specific card wherever it is back to active
  const handleShuffle = (specificCard?: string) => {
    let { activeCards, handCards, playedCards, deadCards } = deckState;

    if (!specificCard) {
      const allCards = [...activeCards, ...handCards, ...playedCards, ...deadCards];
      const shuffled = shuffleArray(allCards);
      updateDeckState({
        ...deckState,
        activeCards: shuffled,
        handCards: [],
        playedCards: [],
        deadCards: [],
      });
      notify(`Shuffled all ${shuffled.length} cards back into Active deck!`);
    } else {
      const clean = specificCard.toLowerCase().replace(/\s+/g, '');
      let foundCard: string | null = null;

      // search in hand
      const hIdx = handCards.findIndex((c) => c.toLowerCase().replace(/\s+/g, '').includes(clean));
      if (hIdx !== -1) {
        foundCard = handCards[hIdx];
        handCards = handCards.filter((_, i) => i !== hIdx);
      } else {
        // search in played
        const pIdx = playedCards.findIndex((c) => c.toLowerCase().replace(/\s+/g, '').includes(clean));
        if (pIdx !== -1) {
          foundCard = playedCards[pIdx];
          playedCards = playedCards.filter((_, i) => i !== pIdx);
        } else {
          // search in dead
          const dIdx = deadCards.findIndex((c) => c.toLowerCase().replace(/\s+/g, '').includes(clean));
          if (dIdx !== -1) {
            foundCard = deadCards[dIdx];
            deadCards = deadCards.filter((_, i) => i !== dIdx);
          }
        }
      }

      if (foundCard) {
        const newActive = shuffleArray([...activeCards, foundCard]);
        updateDeckState({
          ...deckState,
          activeCards: newActive,
          handCards,
          playedCards,
          deadCards,
        });
        notify(`Returned "${foundCard}" to Active deck and shuffled!`);
      } else {
        notify(`Card "${specificCard}" is already in active deck or not found.`);
      }
    }
  };

  // RESET TRIGGER: Recombines dead and played into active
  const handleReset = () => {
    const all = [...deckState.activeCards, ...deckState.handCards, ...deckState.playedCards, ...deckState.deadCards];
    updateDeckState({
      ...deckState,
      activeCards: shuffleArray(all),
      handCards: [],
      playedCards: [],
      deadCards: [],
    });
    notify(`Deck reset! Recombined all cards into Active (${all.length} cards).`);
  };

  // CHANGE DECK / MINI FILE BROWSER
  // Rule: "a deck has to be reset before it can be changed"
  const handleChangeDeckPreset = (deckFile: string) => {
    if (deckState.handCards.length > 0 || deckState.playedCards.length > 0 || deckState.deadCards.length > 0) {
      notify('You must Reset the deck first before switching to a new file!');
      return;
    }

    const presetCards = PRESET_FILES[deckFile] || STANDARD_52_CARDS;
    updateDeckState({
      currentDeckName: deckFile,
      activeCards: shuffleArray([...presetCards]).slice(0, 100),
      handCards: [],
      playedCards: [],
      deadCards: [],
    });
    setShowFileBrowser(false);
    notify(`Loaded "${deckFile}" with ${presetCards.length} cards.`);
  };

  // TEXT FILE EDITING (active.txt & dead.txt)
  const openFileEditor = (target: 'active' | 'dead') => {
    setEditingFile(target);
    const list = target === 'active' ? deckState.activeCards : deckState.deadCards;
    setFileTextContent(list.join('\n'));
  };

  const saveFileEditor = () => {
    if (!editingFile) return;
    const lines = fileTextContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .slice(0, 100); // System will only allow up to 100 cards

    if (editingFile === 'active') {
      updateDeckState({
        ...deckState,
        activeCards: lines,
      });
      notify(`Updated Active deck: ${lines.length} cards.`);
    } else {
      updateDeckState({
        ...deckState,
        deadCards: lines,
      });
      notify(`Updated Dead pile: ${lines.length} cards.`);
    }
    setEditingFile(null);
  };

  // COMMAND LINE PARSER
  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();

    // 1. Reset
    if (lower === 'reset') {
      handleReset();
      setCommandInput('');
      return;
    }

    // 2. Shuffle [card]
    if (lower.startsWith('shuffle')) {
      const target = trimmed.substring(7).trim();
      handleShuffle(target || undefined);
      setCommandInput('');
      return;
    }

    // 3. Play [cards]
    if (lower.startsWith('play')) {
      const rest = trimmed.substring(4).trim();
      if (!rest) {
        handlePlay();
      } else {
        const specific = rest.split(',').map((s) => s.trim()).filter(Boolean);
        handlePlay(specific);
      }
      setCommandInput('');
      return;
    }

    // 4. Dis [cards]
    if (lower.startsWith('dis')) {
      const rest = trimmed.substring(3).trim();
      if (!rest) {
        handleDiscard();
      } else {
        const specific = rest.split(',').map((s) => s.trim()).filter(Boolean);
        handleDiscard(specific);
      }
      setCommandInput('');
      return;
    }

    // 5. Draw variants:
    // draw
    // draw 5 or drawx
    // draw, 5
    // draw 5, 5
    // draw club 4
    if (lower.startsWith('draw')) {
      const rest = trimmed.substring(4).trim();

      if (!rest || rest === 'x') {
        handleDraw(rest === 'x' ? 5 : 1);
      } else if (rest.startsWith(',')) {
        // draw, 5 -> specific card named '5'
        const forceCard = rest.substring(1).trim();
        handleDraw(1, forceCard);
      } else if (rest.includes(',')) {
        // draw 5, 5
        const [cStr, fStr] = rest.split(',').map((s) => s.trim());
        const count = parseInt(cStr) || 1;
        handleDraw(count, fStr);
      } else {
        // draw 5 or draw club 4
        const maybeNum = parseInt(rest);
        if (!isNaN(maybeNum) && String(maybeNum) === rest) {
          handleDraw(maybeNum);
        } else {
          // force card name (e.g. "club 4")
          handleDraw(1, rest);
        }
      }
      setCommandInput('');
      return;
    }

    notify(`Unknown command "${trimmed}". Type "help" or see syntax.`);
  };

  if (!isOpen && !isDocked) return null;

  const content = (
    <div className="flex flex-col h-full space-y-3 font-mono text-xs">
      {/* Header & Status */}
      <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="font-bold text-sm tracking-wide uppercase flex items-center gap-2">
              <span>Deck Simulator</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-normal">
                {deckState.currentDeckName}
              </span>
            </div>
            <div className="text-[10px] opacity-70">
              Active: {deckState.activeCards.length}/100 · Hand: {deckState.handCards.length} · Played: {deckState.playedCards.length} · Dead: {deckState.deadCards.length}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Deck Preset Switcher / File Browser */}
          <button
            onClick={() => setShowFileBrowser(!showFileBrowser)}
            className="px-2.5 py-1 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 border border-black/10 dark:border-white/10 flex items-center gap-1 text-[11px]"
            title="Browse / change deck file"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Deck Files</span>
          </button>

          <button
            onClick={handleReset}
            className="px-2.5 py-1 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 border border-black/10 dark:border-white/10 flex items-center gap-1 text-[11px]"
            title="Reset: Recombine dead and played cards into active"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset</span>
          </button>

          {!isDocked && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mini File Browser Dropdown */}
      {showFileBrowser && (
        <div className="p-3 rounded-lg bg-black/20 dark:bg-black/40 border border-cyan-500/30 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-cyan-300 uppercase">Available Deck Files (.txt)</span>
            <span className="text-[10px] opacity-60">Must reset deck before changing</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {Object.keys(PRESET_FILES).map((fname) => (
              <button
                key={fname}
                onClick={() => handleChangeDeckPreset(fname)}
                className={`px-2 py-1.5 rounded text-left border flex items-center justify-between transition-colors ${
                  deckState.currentDeckName === fname
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 font-bold'
                    : 'bg-black/10 dark:bg-white/5 border-black/10 dark:border-white/10 hover:border-cyan-500/50'
                }`}
              >
                <div className="truncate">
                  <div className="text-xs">{fname}</div>
                  <div className="text-[9px] opacity-60">{PRESET_FILES[fname].length} cards</div>
                </div>
                {deckState.currentDeckName === fname && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-black/10 dark:border-white/10 text-[10px]">
            <span className="opacity-70">Custom cards? Open Active.txt below to paste your own.</span>
            <button
              onClick={() => openFileEditor('active')}
              className="text-cyan-400 underline font-bold"
            >
              Edit Active.txt
            </button>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {feedbackMsg && (
        <div className="p-2 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-semibold">
          {feedbackMsg}
        </div>
      )}

      {/* Hand Section (List format per user spec) */}
      <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs uppercase tracking-wider">
              Hand ({deckState.handCards.length})
            </span>
            <span className="text-[10px] opacity-60">Held cards</span>
          </div>

          {deckState.handCards.length > 0 && (
            <div className="flex items-center gap-1 text-[10px]">
              <button
                onClick={() => handlePlay()}
                className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold"
              >
                Play All
              </button>
              <button
                onClick={() => handleDiscard()}
                className="px-2 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700 font-bold"
              >
                Discard All (Dis)
              </button>
            </div>
          )}
        </div>

        {/* Hand Cards List Format */}
        {deckState.handCards.length === 0 ? (
          <div className="p-3 text-center text-[11px] opacity-50 border border-dashed rounded">
            Hand is empty. Type <code>draw 5</code> or click Quick Draw below.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {deckState.handCards.map((card, idx) => (
              <div
                key={idx}
                className="p-1.5 rounded bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10 flex items-center justify-between group"
              >
                <span className="font-bold text-xs capitalize text-amber-500 dark:text-amber-400">
                  {card}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePlay([card])}
                    className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-[9px] font-bold"
                    title="Play this card"
                  >
                    Play
                  </button>
                  <button
                    onClick={() => handleDiscard([card])}
                    className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[9px] font-bold"
                    title="Discard (dis)"
                  >
                    Dis
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last Played Hand & Piles Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Played Pile */}
        <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between text-[11px] mb-1 font-bold uppercase opacity-80">
            <span>Last Played Hand ({deckState.playedCards.length})</span>
            <span className="text-[9px] opacity-60">In Play</span>
          </div>
          {deckState.playedCards.length === 0 ? (
            <div className="text-[10px] opacity-50 italic">None played yet.</div>
          ) : (
            <div className="space-y-0.5 max-h-20 overflow-y-auto text-[11px]">
              {deckState.playedCards.map((c, i) => (
                <div key={i} className="text-emerald-500 dark:text-emerald-400 font-semibold truncate">
                  • {c}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pile Management (Active.txt & Dead.txt) */}
        <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase opacity-80 mb-1">
            <span>Card Piles (Text Files)</span>
          </div>

          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between">
              <span>Active Deck: {deckState.activeCards.length} cards</span>
              <button
                onClick={() => openFileEditor('active')}
                className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 font-bold hover:bg-cyan-900"
              >
                Active.txt
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span>Dead Pile: {deckState.deadCards.length} cards</span>
              <button
                onClick={() => openFileEditor('dead')}
                className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-500/40 font-bold hover:bg-rose-900"
              >
                Dead.txt
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Command Line Input & Quick Actions */}
      <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold uppercase tracking-wider opacity-80">Command Line</span>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-cyan-400 hover:underline flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Command Reference</span>
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeCommand(commandInput)}
            placeholder={`draw 5  |  draw club 4  |  play  |  shuffle  |  dis  |  reset`}
            className="flex-1 px-3 py-1.5 rounded border border-black/20 dark:border-white/20 bg-black/10 dark:bg-white/10 text-xs font-mono"
          />
          <button
            onClick={() => executeCommand(commandInput)}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded flex items-center gap-1 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Execute</span>
          </button>
        </div>

        {/* Quick Click Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
          <span className="opacity-60">Quick:</span>
          <button
            onClick={() => handleDraw(1)}
            className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 hover:bg-cyan-500/20 hover:text-cyan-300 border border-black/10 dark:border-white/10"
          >
            Draw 1
          </button>
          <button
            onClick={() => handleDraw(5)}
            className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 hover:bg-cyan-500/20 hover:text-cyan-300 border border-black/10 dark:border-white/10"
          >
            Draw 5 (drawx)
          </button>
          <button
            onClick={() => handlePlay()}
            className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 hover:bg-amber-500/20 hover:text-amber-300 border border-black/10 dark:border-white/10"
          >
            Play Hand
          </button>
          <button
            onClick={() => handleDiscard()}
            className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 border border-black/10 dark:border-white/10"
          >
            Dis Hand
          </button>
          <button
            onClick={() => handleShuffle()}
            className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 hover:bg-cyan-500/20 hover:text-cyan-300 border border-black/10 dark:border-white/10"
          >
            Shuffle All
          </button>
        </div>

        {/* Command Reference Help */}
        {showHelp && (
          <div className="p-2.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[11px] leading-relaxed space-y-1">
            <p><strong>draw [N]</strong> : Draws N random cards to hand (default 1). <code>draw 5</code> or <code>drawx</code> draws 5.</p>
            <p><strong>draw [card name]</strong> : Forces specific card to hand (e.g. <code>draw club 4</code>).</p>
            <p><strong>draw, 5</strong> : Specifically forces card named &quot;5&quot;.</p>
            <p><strong>draw 5, 5</strong> : Attempts to draw five &quot;5&quot;s; falls back to random.</p>
            <p><strong>play [card]</strong> : Removes cards from hand to played pile.</p>
            <p><strong>dis [card]</strong> : Discards cards from hand directly to Dead pile.</p>
            <p><strong>shuffle [card]</strong> : Adds all cards (or specific card) back to active.</p>
            <p><strong>reset</strong> : Recombines dead and played into active.</p>
          </div>
        )}
      </div>

      {/* Text File Editor Modal (Active.txt / Dead.txt) */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-xl p-4 shadow-2xl space-y-3 text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="font-bold text-sm uppercase text-cyan-300">
                Editing {editingFile === 'active' ? 'Active.txt' : 'Dead.txt'}
              </div>
              <button
                onClick={() => setEditingFile(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] opacity-75">
              One card per line. Max 100 cards. If a card contains commas (e.g. &quot;3,4&quot;), it is still treated as 1 card.
            </p>

            <textarea
              value={fileTextContent}
              onChange={(e) => setFileTextContent(e.target.value)}
              rows={12}
              className="w-full p-2.5 rounded bg-black/40 border border-cyan-500/30 font-mono text-xs text-cyan-100 resize-none"
              placeholder={`Ace Spades\nKing Hearts\nQueen Diamonds\n...`}
            />

            <div className="flex items-center justify-between">
              <span className="text-[10px] opacity-60">
                {fileTextContent.split('\n').filter((l) => l.trim()).length} card lines
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingFile(null)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={saveFileEditor}
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold"
                >
                  Save File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isDocked) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl max-h-[92vh] bg-slate-900 border border-cyan-500/40 rounded-xl shadow-2xl p-4 overflow-y-auto text-slate-100">
        {content}
      </div>
    </div>
  );
};
