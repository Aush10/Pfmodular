import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Package,
  Coins,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Users,
  Shield,
  Briefcase,
  Layers,
  Sparkles,
  Info,
  Clock,
  Building,
  Hammer,
  Crown,
  Scale,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import {
  PF1Character,
  InventoryItem,
  CompanionNPC,
  MagicItemSlots,
  DowntimeCapital,
  CharacterBioData,
} from '../../types/character';
import { DerivedCombatStats } from '../../engine/pf1eMath';
import { StorageInventoryModule } from './StorageInventoryModule';
import { ImageFileBrowserModal } from '../tools/ImageFileBrowserModal';

interface SheetPage3BioStorageProps {
  character: PF1Character;
  derived: DerivedCombatStats;
  theme: string;
  fontClass: string;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  onRollFormula?: (formula: string, label?: string) => void;
  visibleModules?: Record<string, boolean>;
}

export const SheetPage3BioStorage: React.FC<SheetPage3BioStorageProps> = ({
  character,
  derived,
  theme,
  fontClass,
  onUpdateCharacter,
  onRollFormula,
}) => {
  // Companion Modal state
  const [isAddCompanionOpen, setIsAddCompanionOpen] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompType, setNewCompType] = useState<
    'Familiar' | 'Animal Companion' | "Nature's Bond" | 'NPC' | 'Summon' | 'Mount' | 'Eidolon' | 'Other'
  >('Animal Companion');
  const [newCompRelation, setNewCompRelation] = useState('');
  const [newCompNotes, setNewCompNotes] = useState('');

  // Bio Section Modal state
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionContent, setNewSectionContent] = useState('');

  // Image URL state
  const [isImageUrlOpen, setIsImageUrlOpen] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isPortraitBrowserOpen, setIsPortraitBrowserOpen] = useState(false);

  // Future systems showcase toggle
  const [showFutureRoadmap, setShowFutureRoadmap] = useState(true);

  // Theme styling helpers
  const isParchment = theme === 'parchment';
  const isBlueprint = theme === 'blueprint';
  const isMythWeavers = theme === 'mythweavers';

  const cardBg = isParchment
    ? 'bg-amber-50/70 border-amber-800/20 text-stone-900 shadow-sm'
    : isBlueprint
    ? 'bg-slate-900/90 border-cyan-500/40 text-cyan-50'
    : isMythWeavers
    ? 'bg-[#15171a] border-[#2d3139] text-slate-100'
    : 'bg-white border-black text-black';

  const inputStyle = isParchment
    ? 'bg-white/80 border-amber-900/30 text-stone-900 focus:border-amber-700 focus:bg-white'
    : isBlueprint
    ? 'bg-slate-950/80 border-cyan-700/60 text-cyan-200 focus:border-cyan-400'
    : isMythWeavers
    ? 'bg-[#0d0e10] border-[#383d47] text-amber-100 focus:border-amber-500'
    : 'bg-white border-neutral-400 text-black';

  const goldBoxStyle = 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30 text-amber-200';

  const setField = <K extends keyof PF1Character>(key: K, value: PF1Character[K]) => {
    onUpdateCharacter((prev) => ({ ...prev, [key]: value }));
  };

  // Bio Data helper
  const bioData: CharacterBioData = character.characterBio || {
    scratchpad: '',
    portraits: [
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
    ],
    currentPortraitIndex: 0,
    bioSections: [
      { id: 'bio-bg', title: 'Background', content: 'Heroic background narrative...' },
      { id: 'bio-app', title: 'Appearance', content: 'Physical description...' },
      { id: 'bio-goals', title: 'Goals', content: 'Primary motivations...' },
      { id: 'bio-pers', title: 'Personality', content: 'Traits and quirks...' },
    ],
    skin: 'Fair',
  };

  const updateBio = (updates: Partial<CharacterBioData>) => {
    setField('characterBio', { ...bioData, ...updates });
  };

  // Portrait navigation
  const portraits = bioData.portraits || [];
  const currentPortraitIndex = Math.min(
    Math.max(0, bioData.currentPortraitIndex || 0),
    Math.max(0, portraits.length - 1)
  );
  const currentPortrait = portraits[currentPortraitIndex] || '';

  const handlePrevPortrait = () => {
    if (portraits.length <= 1) return;
    const nextIdx = (currentPortraitIndex - 1 + portraits.length) % portraits.length;
    updateBio({ currentPortraitIndex: nextIdx });
  };

  const handleNextPortrait = () => {
    if (portraits.length <= 1) return;
    const nextIdx = (currentPortraitIndex + 1) % portraits.length;
    updateBio({ currentPortraitIndex: nextIdx });
  };

  const handleAddPortrait = () => {
    if (!newImageUrl.trim()) return;
    const nextList = [...portraits, newImageUrl.trim()];
    updateBio({ portraits: nextList, currentPortraitIndex: nextList.length - 1 });
    setNewImageUrl('');
    setIsImageUrlOpen(false);
  };

  // Downtime Capital helper
  const downtime: DowntimeCapital = character.downtimeCapital || {
    currentGp: 849.2,
    bankGp: 790.51,
    level: character.level || 2,
    totalDp: 2,
    goods: -98,
    influence: 28,
    labor: -6,
    magic: 8,
    kbp: 0,
  };

  const updateDowntime = (updates: Partial<DowntimeCapital>) => {
    setField('downtimeCapital', { ...downtime, ...updates });
  };

  // Companions helper
  const companions: CompanionNPC[] = character.companions || [];

  const handleAddCompanion = () => {
    if (!newCompName.trim()) return;
    const newComp: CompanionNPC = {
      id: `comp-${Date.now()}`,
      name: newCompName.trim(),
      type: newCompType,
      relation: newCompRelation.trim() || 'Companion',
      notes: newCompNotes.trim(),
    };
    setField('companions', [...companions, newComp]);
    setNewCompName('');
    setNewCompRelation('');
    setNewCompNotes('');
    setIsAddCompanionOpen(false);
  };

  const deleteCompanion = (id: string) => {
    setField('companions', companions.filter((c) => c.id !== id));
  };

  // Bio sections helper
  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    const newSec = {
      id: `sec-${Date.now()}`,
      title: newSectionTitle.trim(),
      content: newSectionContent.trim() || 'Details...',
    };
    updateBio({ bioSections: [...(bioData.bioSections || []), newSec] });
    setNewSectionTitle('');
    setNewSectionContent('');
    setIsAddSectionOpen(false);
  };

  const updateSection = (id: string, updates: { title?: string; content?: string }) => {
    const updated = (bioData.bioSections || []).map((sec) =>
      sec.id === id ? { ...sec, ...updates } : sec
    );
    updateBio({ bioSections: updated });
  };

  const deleteSection = (id: string) => {
    const updated = (bioData.bioSections || []).map((sec) => sec).filter((s) => s.id !== id);
    updateBio({ bioSections: updated });
  };

  return (
    <div className={`space-y-6 ${fontClass}`}>
      {/* ========================================================================= */}
      {/* TOP ROW: Scratchpad, Bio Sections, Core Descriptors & Portrait (Image 2) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        {/* BOX 1 (md:col-span-3): Scratchpad with Pen/Notebook Icon */}
        <div className={`md:col-span-3 rounded-xl border p-3 flex flex-col ${cardBg}`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <span className="font-serif font-bold text-xs uppercase tracking-wider text-amber-300">
                Scratchpad
              </span>
            </div>
            <span className="text-[10px] font-mono opacity-50">Auto-saved</span>
          </div>
          <textarea
            value={bioData.scratchpad || ''}
            onChange={(e) => updateBio({ scratchpad: e.target.value })}
            placeholder="Quick notes, watch order, temporary loot, GM clues, initiative scratch..."
            className={`w-full flex-1 min-h-[140px] p-2 rounded-lg border font-mono text-xs resize-none leading-relaxed ${inputStyle}`}
          />
        </div>

        {/* BOX 2 (md:col-span-4): Bio Info, Background, Appearance, Goals (+Add Section) */}
        <div className={`md:col-span-4 rounded-xl border p-3 flex flex-col ${cardBg}`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/10 dark:border-white/10">
            <span className="font-serif font-bold text-xs uppercase tracking-wider text-amber-300">
              Biography &amp; Narrative
            </span>
            <button
              onClick={() => setIsAddSectionOpen(true)}
              className="px-2 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-black font-bold text-[10px] flex items-center gap-1 transition-colors"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>+ Add Section</span>
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-[160px] pr-1">
            {(bioData.bioSections || []).map((sec) => (
              <div key={sec.id} className="p-2 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs">
                <div className="flex items-center justify-between font-bold text-amber-400 pb-1">
                  <span>{sec.title}</span>
                  <button
                    onClick={() => deleteSection(sec.id)}
                    className="text-slate-500 hover:text-rose-400 p-0.5"
                    title="Delete section"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
                <p className="text-[11px] opacity-80 font-sans line-clamp-3 whitespace-pre-wrap">
                  {sec.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* BOX 3 (md:col-span-3): Physical Descriptors (Name, Race, Age, Height, Weight, Hair, Eyes, Skin) */}
        <div className={`md:col-span-3 rounded-xl border p-3 flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/10 dark:border-white/10">
            <span className="font-serif font-bold text-xs uppercase tracking-wider text-amber-300">
              Physical Descriptors
            </span>
            <span className="text-[10px] font-mono opacity-50">Lvl {character.level}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="opacity-60 block text-[10px]">Name</span>
              <input
                type="text"
                value={character.name}
                onChange={(e) => setField('name', e.target.value)}
                className={`w-full px-2 py-0.5 rounded border text-xs font-bold ${inputStyle}`}
              />
            </div>
            <div>
              <span className="opacity-60 block text-[10px]">Race</span>
              <input
                type="text"
                value={character.race}
                onChange={(e) => setField('race', e.target.value)}
                className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
              />
            </div>
            <div>
              <span className="opacity-60 block text-[10px] text-amber-300 font-bold">Gender</span>
              <select
                value={character.gender || 'Male'}
                onChange={(e) => setField('gender', e.target.value)}
                className={`w-full px-2 py-0.5 rounded border text-xs font-semibold ${inputStyle}`}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <span className="opacity-60 block text-[10px]">Age</span>
              <input
                type="number"
                value={character.age}
                onChange={(e) => setField('age', parseInt(e.target.value, 10) || 0)}
                className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
              />
            </div>
            <div>
              <span className="opacity-60 block text-[10px]">Height</span>
              <input
                type="text"
                value={character.height}
                onChange={(e) => setField('height', e.target.value)}
                className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
              />
            </div>
            <div>
              <span className="opacity-60 block text-[10px]">Weight</span>
              <input
                type="text"
                value={character.weight}
                onChange={(e) => setField('weight', e.target.value)}
                className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
              />
            </div>
            <div>
              <span className="opacity-60 block text-[10px]">Hair</span>
              <input
                type="text"
                value={character.hair}
                onChange={(e) => setField('hair', e.target.value)}
                className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
              />
            </div>
            <div>
              <span className="opacity-60 block text-[10px]">Eyes</span>
              <input
                type="text"
                value={character.eyes}
                onChange={(e) => setField('eyes', e.target.value)}
                className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
              />
            </div>
            <div>
              <span className="opacity-60 block text-[10px]">Skin</span>
              <input
                type="text"
                value={bioData.skin || 'Sun-bronzed'}
                onChange={(e) => updateBio({ skin: e.target.value })}
                className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
              />
            </div>
          </div>
        </div>

        {/* BOX 4 (md:col-span-2): Portrait Gallery with Prev / Next Navigation */}
        <div className={`md:col-span-2 rounded-xl border p-3 flex flex-col items-center justify-between ${cardBg}`}>
          <div className="w-full flex items-center justify-between pb-1 text-[10px] font-mono opacity-70">
            <span>Portrait</span>
            <span>
              {portraits.length > 0 ? `${currentPortraitIndex + 1}/${portraits.length}` : '0/0'}
            </span>
          </div>

          <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-black/20 dark:border-white/20 bg-black/40 flex items-center justify-center my-1 group">
            {currentPortrait ? (
              <img
                src={currentPortrait}
                alt={character.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80';
                }}
              />
            ) : (
              <ImageIcon className="w-10 h-10 opacity-30 text-slate-400" />
            )}

            {/* Quick Link Overlay button */}
            <button
              onClick={() => setIsPortraitBrowserOpen(true)}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-amber-300 text-[10px] font-bold transition-opacity"
            >
              <Edit2 className="w-4 h-4 mb-0.5" />
              <span>Browse Image</span>
            </button>
          </div>

          <div className="w-full flex items-center justify-between gap-1 pt-1 font-mono text-[10px]">
            <button
              onClick={handlePrevPortrait}
              disabled={portraits.length <= 1}
              className="p-1 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 disabled:opacity-30"
              title="Previous image"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPortraitBrowserOpen(true)}
              className="text-[10px] text-amber-400 hover:underline truncate"
            >
              + File Browser
            </button>
            <button
              onClick={handleNextPortrait}
              disabled={portraits.length <= 1}
              className="p-1 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 disabled:opacity-30"
              title="Next image"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM SECTION: Downtime Capital & Magic Item Slots (Left),               */}
      {/* Companions & NPCs (Mid-Left), Storage Switcher & Gear (Mid-Right),         */}
      {/* and Future Ultimate Campaign Systems (Far Right) (Matches Wireframe 2)    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN (lg:col-span-4): Downtime Capital, Companions & Future Road   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Downtime Capital & Wealth Tracker */}
          <div className="rounded-xl border border-amber-600/40 bg-[#1e1b12] dark:bg-[#18150d] p-3 shadow-md space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-amber-600/30">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs font-mono">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Current Gp:</span>
                <input
                  type="number"
                  step="0.1"
                  value={downtime.currentGp}
                  onChange={(e) => updateDowntime({ currentGp: parseFloat(e.target.value) || 0 })}
                  className="w-20 px-1 py-0.5 rounded bg-black/40 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold"
                />
              </div>

              <div className="text-[10px] font-mono text-amber-300/80">
                <span>Lvl {downtime.level} | </span>
                <span>DP: </span>
                <input
                  type="number"
                  value={downtime.totalDp}
                  onChange={(e) => updateDowntime({ totalDp: parseInt(e.target.value, 10) || 0 })}
                  className="w-8 px-1 py-0.5 rounded bg-black/40 border border-amber-500/40 text-amber-300 font-mono text-[10px] text-center"
                />
              </div>
            </div>

            {/* Downtime Capital Matrix (Goods, Influence, Labor, Magic, KBP) */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
              <div className="flex items-center justify-between bg-black/30 px-2 py-1 rounded border border-amber-900/30">
                <span className="text-amber-200/70">Goods:</span>
                <input
                  type="number"
                  value={downtime.goods}
                  onChange={(e) => updateDowntime({ goods: parseInt(e.target.value, 10) || 0 })}
                  className="w-12 text-right bg-transparent text-amber-300 font-bold focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between bg-black/30 px-2 py-1 rounded border border-amber-900/30">
                <span className="text-amber-200/70">Influence:</span>
                <input
                  type="number"
                  value={downtime.influence}
                  onChange={(e) => updateDowntime({ influence: parseInt(e.target.value, 10) || 0 })}
                  className="w-12 text-right bg-transparent text-amber-300 font-bold focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between bg-black/30 px-2 py-1 rounded border border-amber-900/30">
                <span className="text-amber-200/70">Labor:</span>
                <input
                  type="number"
                  value={downtime.labor}
                  onChange={(e) => updateDowntime({ labor: parseInt(e.target.value, 10) || 0 })}
                  className="w-12 text-right bg-transparent text-amber-300 font-bold focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between bg-black/30 px-2 py-1 rounded border border-amber-900/30">
                <span className="text-amber-200/70">Magic:</span>
                <input
                  type="number"
                  value={downtime.magic}
                  onChange={(e) => updateDowntime({ magic: parseInt(e.target.value, 10) || 0 })}
                  className="w-12 text-right bg-transparent text-amber-300 font-bold focus:outline-none"
                />
              </div>
              <div className="col-span-2 flex items-center justify-between bg-black/30 px-2 py-1 rounded border border-amber-900/30">
                <span className="text-amber-200/70">KBP (Kingdom Points):</span>
                <input
                  type="number"
                  value={downtime.kbp}
                  onChange={(e) => updateDowntime({ kbp: parseInt(e.target.value, 10) || 0 })}
                  className="w-12 text-right bg-transparent text-amber-300 font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-amber-400/80 border-t border-amber-600/20">
              <span>Bank Savings:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={downtime.bankGp}
                  onChange={(e) => updateDowntime({ bankGp: parseFloat(e.target.value) || 0 })}
                  className="w-16 text-right px-1 py-0.5 rounded bg-black/40 border border-amber-500/40 text-amber-300 font-mono text-[10px]"
                />
                <span>gp</span>
              </div>
            </div>
          </div>

          {/* Companions & NPCs (Image 2 Middle-Left) */}
          <div className={`rounded-xl border p-4 ${cardBg} space-y-3`}>
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="font-serif font-bold text-xs uppercase tracking-wider text-cyan-300">
                  Companions &amp; NPCs
                </span>
              </div>
              <button
                onClick={() => setIsAddCompanionOpen(true)}
                className="px-2 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white font-bold text-[10px] flex items-center gap-1 transition-colors"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>+ Add</span>
              </button>
            </div>

            <p className="text-[11px] opacity-70 font-sans">
              Familiar, animal companion, nature&apos;s bond, cohort, summons, mounts &amp; key NPCs.
            </p>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {companions.map((comp) => (
                <div
                  key={comp.id}
                  className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">{comp.name}</span>
                    <button
                      onClick={() => deleteCompanion(comp.id)}
                      className="text-slate-500 hover:text-rose-400 p-0.5"
                      title="Remove companion"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                      {comp.type}
                    </span>
                    <span className="opacity-70 truncate">• {comp.relation}</span>
                  </div>

                  {comp.notes && (
                    <p className="text-[11px] opacity-75 font-sans leading-snug pt-0.5">
                      {comp.notes}
                    </p>
                  )}
                </div>
              ))}

              {companions.length === 0 && (
                <div className="text-center py-6 text-xs opacity-50 font-mono">
                  No companions or NPCs listed yet. Click &quot;+ Add&quot; to link your mount, familiar, or patron.
                </div>
              )}
            </div>
          </div>

          {/* Future Systems Roadmap (Ultimate Campaign) */}
          <div className={`rounded-xl border p-3 ${cardBg} space-y-2.5`}>
            <div className="flex items-center justify-between pb-1.5 border-b border-black/10 dark:border-white/10">
              <span className="font-serif font-bold text-xs uppercase tracking-wider text-amber-400">
                Future Systems
              </span>
              <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Reserved
              </span>
            </div>

            <p className="text-[10px] opacity-70 font-sans leading-tight">
              Reserved space for upcoming Ultimate Campaign modules.
            </p>

            <div className="space-y-2">
              <div className="p-2 rounded-lg bg-black/10 dark:bg-white/5 border border-dashed border-black/20 dark:border-white/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Downtime Activities</span>
                </div>
                <p className="text-[9px] opacity-60">
                  Ultimate Campaign retraining, earning capital &amp; downtime days.
                </p>
              </div>

              <div className="p-2 rounded-lg bg-black/10 dark:bg-white/5 border border-dashed border-black/20 dark:border-white/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <Building className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Business &amp; Properties</span>
                </div>
                <p className="text-[9px] opacity-60">
                  Rooms, teams, tavern/guildhall assets, and daily capital generation.
                </p>
              </div>

              <div className="p-2 rounded-lg bg-black/10 dark:bg-white/5 border border-dashed border-black/20 dark:border-white/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <Crown className="w-3.5 h-3.5 text-purple-400" />
                  <span>Kingdom &amp; Crafting</span>
                </div>
                <p className="text-[9px] opacity-60">
                  Kingdom Building (KB) hexes, unrest, settlement stats &amp; item craft bench.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN (lg:col-span-8): Unified Storage & Inventory Module          */}
        {/* (Paper Doll, Categories, Bags, Items, 4-Quadrant Coinage, Load Breakdown) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8">
          <StorageInventoryModule
            character={character}
            derived={derived}
            theme={theme}
            fontClass={fontClass}
            onUpdateCharacter={onUpdateCharacter}
            onRollFormula={onRollFormula}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Add Companion / NPC Dialog                                       */}
      {/* ========================================================================= */}
      {isAddCompanionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${cardBg}`}>
            <div className="flex items-center justify-between border-b pb-3 border-black/10 dark:border-white/10">
              <h3 className="font-serif font-bold text-base text-cyan-400">Add Companion or NPC</h3>
              <button
                onClick={() => setIsAddCompanionOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold opacity-75 mb-1">Companion / NPC Name</label>
                <input
                  type="text"
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  placeholder="e.g. Ignis, Familiar Raven, High Priestess Althea"
                  className={`w-full px-3 py-1.5 rounded border ${inputStyle}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold opacity-75 mb-1">Companion Type</label>
                  <select
                    value={newCompType}
                    onChange={(e) => setNewCompType(e.target.value as any)}
                    className={`w-full px-3 py-1.5 rounded border font-mono ${inputStyle}`}
                  >
                    <option value="Animal Companion">Animal Companion</option>
                    <option value="Familiar">Familiar</option>
                    <option value="Nature's Bond">Nature&apos;s Bond</option>
                    <option value="Mount">Mount</option>
                    <option value="Summon">Summon</option>
                    <option value="Eidolon">Eidolon</option>
                    <option value="NPC">NPC / Contact</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold opacity-75 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={newCompRelation}
                    onChange={(e) => setNewCompRelation(e.target.value)}
                    placeholder="e.g. Loyal Mount, Patron, Mentor"
                    className={`w-full px-3 py-1.5 rounded border ${inputStyle}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold opacity-75 mb-1">Stats &amp; Notes</label>
                <textarea
                  rows={3}
                  value={newCompNotes}
                  onChange={(e) => setNewCompNotes(e.target.value)}
                  placeholder="Attacks, AC, HP, special abilities, equipment carried..."
                  className={`w-full px-3 py-2 rounded border font-sans text-xs ${inputStyle}`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
              <button
                onClick={() => setIsAddCompanionOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCompanion}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
              >
                Save Companion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Add Narrative Section Dialog                                    */}
      {/* ========================================================================= */}
      {isAddSectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${cardBg}`}>
            <div className="flex items-center justify-between border-b pb-3 border-black/10 dark:border-white/10">
              <h3 className="font-serif font-bold text-base text-amber-400">Add Bio Section</h3>
              <button
                onClick={() => setIsAddSectionOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold opacity-75 mb-1">Section Title</label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g. Backstory, Personal Code, Nemesis, Secrets"
                  className={`w-full px-3 py-1.5 rounded border ${inputStyle}`}
                />
              </div>

              <div>
                <label className="block font-bold opacity-75 mb-1">Content</label>
                <textarea
                  rows={4}
                  value={newSectionContent}
                  onChange={(e) => setNewSectionContent(e.target.value)}
                  placeholder="Enter narrative details..."
                  className={`w-full px-3 py-2 rounded border font-sans text-xs ${inputStyle}`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
              <button
                onClick={() => setIsAddSectionOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSection}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Add Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Add / Link Portrait Image Dialog                                */}
      {/* ========================================================================= */}
      {isImageUrlOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${cardBg}`}>
            <div className="flex items-center justify-between border-b pb-3 border-black/10 dark:border-white/10">
              <h3 className="font-serif font-bold text-base text-amber-400">Link Portrait Image</h3>
              <button
                onClick={() => setIsImageUrlOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold opacity-75 mb-1">Image URL</label>
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://... image link"
                  className={`w-full px-3 py-1.5 rounded border font-mono ${inputStyle}`}
                />
              </div>
              <p className="text-[11px] opacity-60">
                Paste any web image URL. You can store multiple portraits and cycle through them with the &lt; &gt; buttons.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
              <button
                onClick={() => setIsImageUrlOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPortrait}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Save Portrait
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Character Portrait File Browser Modal */}
      <ImageFileBrowserModal
        isOpen={isPortraitBrowserOpen}
        onClose={() => setIsPortraitBrowserOpen(false)}
        targetType="portrait"
        title="Character Portrait File Browser"
        subtitle="Upload portrait files from your computer, choose from fantasy adventurer art, or paste a web URL."
        currentImageUrl={currentPortrait}
        onSelectImage={(url) => {
          if (!url) return;
          const currentList = bioData.portraits || [];
          const updatedPortraits = [...currentList.filter((p) => p !== url), url];
          updateBio({
            portraits: updatedPortraits,
            currentPortraitIndex: updatedPortraits.length - 1,
          });
        }}
        characterExistingImages={bioData.portraits || []}
      />
    </div>
  );
};
