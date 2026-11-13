import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Terminal,
  Play,
  Copy,
  Send,
  BookOpen,
  Edit3,
  Image as ImageIcon,
  Check,
  Sliders,
  Settings,
  HelpCircle,
  X,
  AlertCircle,
  RefreshCw,
  Trash2,
  Lock,
  Unlock,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  PF1Character,
  AIModuleSettings,
  SketchDetailQuality,
  CustomFormulaObject,
  JournalEntry,
  ThemeMode,
} from '../../types/character';
import {
  getSessionApiKey,
  setSessionApiKey,
  clearSessionApiKey,
  generateMacroFromEnglish,
  GeneratedMacroResult,
  generateBuffFromEnglish,
  GeneratedBuffResult,
  generateJournalEntryInVoice,
  GeneratedJournalResult,
  generatePencilSketch,
  GeneratedSketchResult,
  DEFAULT_AI_MODULE_SETTINGS,
} from '../../engine/aiService';
import { CompanionTurnResult, runCompanionTurn } from '../../engine/companionSheet';
import { evaluateFormula, buildFormulaContext } from '../../engine/formula';
import { executeMacaroni } from '../../engine/macaroni';
import { generateProceduralPencilSketch } from '../../engine/sketchRenderer';

interface AICompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: PF1Character;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  onOpenJournal?: () => void;
  onNavigateToDSLPage?: () => void;
  initialTab?: 'macro' | 'buff_maker' | 'journal' | 'sketch' | 'fields' | 'settings';
  theme?: ThemeMode;
}

export const AICompanionModal: React.FC<AICompanionModalProps> = ({
  isOpen,
  onClose,
  character,
  onUpdateCharacter,
  onOpenJournal,
  onNavigateToDSLPage,
  initialTab = 'macro',
  theme = 'parchment',
}) => {
  if (!isOpen) return null;

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    'macro' | 'buff_maker' | 'journal' | 'sketch' | 'fields' | 'settings'
  >(initialTab);

  // Session API Key state (only stored for the duration of the session)
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getSessionApiKey());
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySavedNotice, setApiKeySavedNotice] = useState(false);

  // Module settings
  const settings: AIModuleSettings =
    character.installedModules?.aiSettings || DEFAULT_AI_MODULE_SETTINGS;

  // Tab 1: Macro Studio state
  const [macroPrompt, setMacroPrompt] = useState('');
  const [macroResult, setMacroResult] = useState<GeneratedMacroResult | null>(null);
  const [macroTestOutput, setMacroTestOutput] = useState<string | null>(null);
  const [isGeneratingMacro, setIsGeneratingMacro] = useState(false);
  const [macroCopied, setMacroCopied] = useState(false);
  const [macroSentNotice, setMacroSentNotice] = useState(false);

  // Tab 1B: AI Buff Maker (<^...>) state
  const [buffPrompt, setBuffPrompt] = useState('');
  const [buffResult, setBuffResult] = useState<GeneratedBuffResult | null>(null);
  const [isGeneratingBuff, setIsGeneratingBuff] = useState(false);
  const [buffAppliedNotice, setBuffAppliedNotice] = useState(false);
  const [buffMacroCopied, setBuffMacroCopied] = useState(false);

  // Tab 2: Journal Voice state
  const [journalPrompt, setJournalPrompt] = useState('');
  const [voiceSetting, setVoiceSetting] = useState(
    settings.preferredVoice || 'Terse, serious, no-nonsense, short sentences, gruff veteran'
  );
  const [journalResult, setJournalResult] = useState<GeneratedJournalResult | null>(null);
  const [isGeneratingJournal, setIsGeneratingJournal] = useState(false);
  const [journalInsertedNotice, setJournalInsertedNotice] = useState(false);

  // Tab 3: Sketch & Image Studio state
  const [sketchMode, setSketchMode] = useState<'journal_pencil' | 'workspace_image'>('journal_pencil');
  const [sketchPrompt, setSketchPrompt] = useState('');
  const [sketchQuality, setSketchQuality] = useState<SketchDetailQuality>('tasteful');
  const [artStylePrompt, setArtStylePrompt] = useState('Graphite cross-hatch on parchment');
  const [sketchResult, setSketchResult] = useState<GeneratedSketchResult | null>(null);
  const [isGeneratingSketch, setIsGeneratingSketch] = useState(false);
  const [sketchSavedNotice, setSketchSavedNotice] = useState(false);

  // Tab 4: Field Inspector & Modifier state
  const [fieldInstruction, setFieldInstruction] = useState('');
  const [companionTurn, setCompanionTurn] = useState<CompanionTurnResult | null>(null);
  const [actionAppliedNotice, setActionAppliedNotice] = useState(false);

  // Sync API key to session storage
  const handleSaveApiKey = () => {
    setSessionApiKey(apiKeyInput);
    setApiKeySavedNotice(true);
    setTimeout(() => setApiKeySavedNotice(false), 2500);
  };

  const handleClearApiKey = () => {
    clearSessionApiKey();
    setApiKeyInput('');
  };

  // Update Module Settings
  const handleUpdateSettings = (updates: Partial<AIModuleSettings>) => {
    onUpdateCharacter((prev) => ({
      ...prev,
      installedModules: {
        ...prev.installedModules,
        aiCompanion: true,
        aiSettings: {
          ...settings,
          ...updates,
        },
      },
    }));
  };

  // 1. Generate Macro from English
  const handleGenerateMacro = async () => {
    if (!macroPrompt.trim()) return;
    setIsGeneratingMacro(true);
    setMacroTestOutput(null);
    try {
      const res = await generateMacroFromEnglish(macroPrompt, character, apiKeyInput);
      setMacroResult(res);
    } finally {
      setIsGeneratingMacro(false);
    }
  };

  // Test Macro using current character context
  const handleTestMacro = () => {
    if (!macroResult) return;
    const context = buildFormulaContext(
      character,
      { strPenalty: 0, dexPenalty: 0, attackPenalty: 0 }
    );
    const evalRes = evaluateFormula(macroResult.formula, context);
    if (evalRes.isError) {
      setMacroTestOutput(`Error: ${evalRes.errorMessage}`);
    } else {
      setMacroTestOutput(evalRes.evaluated);
    }
  };

  // Copy Macro to clipboard
  const handleCopyMacro = () => {
    if (!macroResult) return;
    navigator.clipboard.writeText(macroResult.formula);
    setMacroCopied(true);
    setTimeout(() => setMacroCopied(false), 2000);
  };

  // Send to DSL Studio / Formula Objects
  const handleSendToDSL = () => {
    if (!macroResult) return;
    const newFormulaObj: CustomFormulaObject = {
      id: `macro-${Date.now()}`,
      name: macroResult.name,
      description: macroResult.description,
      formula: macroResult.formula,
      category: macroResult.category,
    };

    onUpdateCharacter((prev) => ({
      ...prev,
      customObjects: [...(prev.customObjects || []), newFormulaObj],
    }));

    setMacroSentNotice(true);
    setTimeout(() => setMacroSentNotice(false), 3000);
  };

  // 1B. Generate Buff (<^...>) from English
  const handleGenerateBuff = async () => {
    if (!buffPrompt.trim()) return;
    setIsGeneratingBuff(true);
    try {
      const res = await generateBuffFromEnglish(buffPrompt, character, apiKeyInput);
      setBuffResult(res);
    } finally {
      setIsGeneratingBuff(false);
    }
  };

  const handleApplyBuffToBox = () => {
    if (!buffResult) return;
    onUpdateCharacter((prev) => {
      const currentBuffs = [...(prev.customBuffs || [])];
      const existingIdx = currentBuffs.findIndex(
        (b) => b.name.toLowerCase() === buffResult.name.toLowerCase()
      );
      if (existingIdx >= 0) {
        currentBuffs[existingIdx] = {
          ...currentBuffs[existingIdx],
          isActive: true,
          category: buffResult.category,
          bonusType: buffResult.bonusType,
          values: { ...buffResult.values },
        };
      } else {
        currentBuffs.unshift({
          id: `ai-buff-${Date.now()}`,
          name: buffResult.name,
          category: buffResult.category,
          bonusType: buffResult.bonusType,
          isActive: true,
          values: { ...buffResult.values },
          notes: `AI Buff Maker: ${buffResult.macaroniSyntax}`,
        });
      }
      return {
        ...prev,
        customBuffs: currentBuffs,
      };
    });
    setBuffAppliedNotice(true);
    setTimeout(() => setBuffAppliedNotice(false), 3000);
  };

  const handleCopyBuffSyntax = (syntax: string) => {
    navigator.clipboard.writeText(syntax);
    setBuffMacroCopied(true);
    setTimeout(() => setBuffMacroCopied(false), 2000);
  };

  // 2. Generate Journal Entry in Character Voice
  const handleGenerateJournal = async () => {
    if (!journalPrompt.trim()) return;
    setIsGeneratingJournal(true);
    try {
      const res = await generateJournalEntryInVoice(
        journalPrompt,
        voiceSetting,
        character,
        apiKeyInput
      );
      setJournalResult(res);
    } finally {
      setIsGeneratingJournal(false);
    }
  };

  // Insert generated entry into character's journal
  const handleInsertIntoJournal = () => {
    if (!journalResult) return;
    const newEntry: JournalEntry = {
      id: `entry-${Date.now()}`,
      title: journalResult.title,
      sessionDate: journalResult.sessionDate,
      realDate: new Date().toISOString().split('T')[0],
      location: character.campaign ? `${character.campaign} Camp` : 'Field Camp',
      content: journalResult.content,
      characterVoiceUsed: voiceSetting,
      recalledNotes: journalResult.recalledNotes,
      images: [],
      tags: journalResult.tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onUpdateCharacter((prev) => ({
      ...prev,
      journal: [newEntry, ...(prev.journal || [])],
    }));

    setJournalInsertedNotice(true);
    setTimeout(() => setJournalInsertedNotice(false), 3000);
  };

  // 3. Generate Pencil Sketch or Workspace Image
  const handleGenerateSketch = async () => {
    if (!sketchPrompt.trim()) return;
    setIsGeneratingSketch(true);
    try {
      if (sketchMode === 'journal_pencil') {
        const res = await generatePencilSketch(sketchPrompt, sketchQuality, apiKeyInput);
        setSketchResult(res);
      } else {
        // Workspace library small image
        const dataUrl = generateProceduralPencilSketch({
          subject: `${sketchPrompt} [${artStylePrompt}]`,
          quality: 'astounding',
          width: 400,
          height: 400,
          tint: 'sepia',
        });
        setSketchResult({
          imageUrl: dataUrl,
          quality: 'astounding',
          caption: `${sketchPrompt} (${artStylePrompt})`,
          prompt: sketchPrompt,
        });
      }
    } finally {
      setIsGeneratingSketch(false);
    }
  };

  // Save sketch to latest journal entry or workspace library
  const handleSaveSketch = () => {
    if (!sketchResult) return;

    if (sketchMode === 'journal_pencil') {
      onUpdateCharacter((prev) => {
        const entries = prev.journal || [];
        if (entries.length === 0) {
          // create a starter entry
          const newEntry: JournalEntry = {
            id: `entry-${Date.now()}`,
            title: `Field Sketch Log: ${sketchResult.prompt}`,
            sessionDate: `Session 1 - 4714 AR`,
            realDate: new Date().toISOString().split('T')[0],
            content: `Pencil study preserved during the expedition.`,
            recalledNotes: [],
            images: [
              {
                id: `sketch-${Date.now()}`,
                url: sketchResult.imageUrl,
                caption: sketchResult.caption,
                style: 'sketch',
                quality: sketchResult.quality,
                prompt: sketchResult.prompt,
                createdAt: Date.now(),
              },
            ],
            tags: ['Sketch', 'Art'],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          return { ...prev, journal: [newEntry] };
        } else {
          // Add to most recent entry
          const first = entries[0];
          const updatedImages = [
            ...(first.images || []),
            {
              id: `sketch-${Date.now()}`,
              url: sketchResult.imageUrl,
              caption: sketchResult.caption,
              style: 'sketch' as const,
              quality: sketchResult.quality,
              prompt: sketchResult.prompt,
              createdAt: Date.now(),
            },
          ];
          const updatedEntries = entries.map((e, idx) =>
            idx === 0 ? { ...e, images: updatedImages } : e
          );
          return { ...prev, journal: updatedEntries };
        }
      });
    } else {
      // Save to workspace library
      onUpdateCharacter((prev) => ({
        ...prev,
        workspaceLibraryImages: [
          ...(prev.workspaceLibraryImages || []),
          {
            id: `lib-img-${Date.now()}`,
            name: sketchResult.prompt,
            url: sketchResult.imageUrl,
            category: 'general',
            createdAt: Date.now(),
          },
        ],
      }));
    }

    setSketchSavedNotice(true);
    setTimeout(() => setSketchSavedNotice(false), 3000);
  };

  // 4. Parse Field Instruction
  const handleParseFieldInstruction = () => {
    if (!fieldInstruction.trim()) return;
    const turn = runCompanionTurn(fieldInstruction, character, {
      permissions: settings.allowedFields,
    });
    setCompanionTurn(turn);
    setActionAppliedNotice(false);
  };

  const handleApplyCompanionTurn = () => {
    if (!companionTurn || companionTurn.changes.length === 0) return;
    onUpdateCharacter(() => companionTurn.character);
    setActionAppliedNotice(true);
    setTimeout(() => setActionAppliedNotice(false), 2500);
  };

  const isDark = theme === 'blueprint' || theme === 'mythweavers';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-6 overflow-hidden">
      <div
        className={`w-full max-w-5xl h-[92vh] rounded-xl flex flex-col shadow-2xl border overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-cyan-500/40 text-slate-100'
            : 'bg-[#faf6ee] border-amber-900/30 text-stone-900'
        }`}
      >
        {/* Header Bar */}
        <div
          className={`p-4 border-b flex items-center justify-between shrink-0 select-none ${
            isDark ? 'bg-slate-950/90 border-cyan-500/30' : 'bg-[#f4ebe1] border-amber-800/20'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center border shadow-xs ${
                isDark ? 'bg-cyan-950 border-cyan-400 text-cyan-300' : 'bg-amber-100 border-amber-700 text-amber-900'
              }`}
            >
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono font-bold text-base tracking-wide flex items-center gap-1.5">
                  <span>AI Companion & Standalone Module</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    Active Extension
                  </span>
                </h2>
              </div>
              <p className="text-xs opacity-75 font-serif">
                DSL macro builder, character-voice journal writer, pencil sketches, and bounded sheet actions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 opacity-70" />
            </button>
          </div>
        </div>

        {/* Session API Key Bar (Stored ONLY in session memory, forgotten when app/tab is closed) */}
        <div
          className={`px-4 py-2.5 border-b text-xs flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'bg-slate-950/60 border-cyan-500/20' : 'bg-amber-100/50 border-amber-900/15'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-mono font-bold text-[11px] shrink-0">Session API Key:</span>
            <div className="relative flex items-center">
              <input
                type={showApiKey ? 'text' : 'password'}
                placeholder="Paste Gemini API Key (Optional)..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className={`w-64 md:w-80 px-2.5 py-1 rounded text-xs border font-mono pr-8 outline-hidden ${
                  isDark ? 'bg-slate-900 border-slate-700 text-cyan-200' : 'bg-white border-amber-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={handleSaveApiKey}
              className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
            >
              Set Key
            </button>

            {apiKeyInput && (
              <button
                onClick={handleClearApiKey}
                className="p-1 text-rose-500 hover:opacity-100 opacity-60"
                title="Clear key from session memory"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {apiKeySavedNotice && (
              <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> Key active for session
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono opacity-70">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Forgotten on close (Never saved to sheet JSON or disk)</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className={`px-4 border-b flex items-center gap-2 shrink-0 overflow-x-auto ${
            isDark ? 'bg-slate-950/40 border-cyan-500/20' : 'bg-[#f7f2e7] border-amber-900/15'
          }`}
        >
          {[
            { id: 'macro', label: 'Plain English to Macro (DSL)', icon: Terminal },
            { id: 'buff_maker', label: 'AI Buff Maker (<^>)', icon: Sparkles },
            { id: 'journal', label: 'Character Voice Journaler', icon: BookOpen },
            { id: 'sketch', label: 'Pencil Sketches & Imagery', icon: Edit3 },
            { id: 'fields', label: 'Sheet Field Actions', icon: Sliders },
            { id: 'settings', label: 'Module Permissions', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 px-3 border-b-2 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  isActive
                    ? isDark
                      ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                      : 'border-amber-800 text-amber-900 bg-amber-200/40'
                    : 'border-transparent opacity-65 hover:opacity-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* TAB 1: PLAIN ENGLISH TO MACRO */}
          {activeTab === 'macro' && (
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                  <span>Rule Instruction to Pathfinder 1e Macro Generator</span>
                </h3>
                <p className="text-xs opacity-75 font-serif leading-relaxed">
                  Enter any Pathfinder 1e attack, damage, power attack, sneak attack, or spell
                  instruction in plain English. The AI formulates it using the sheet’s DSL variables
                  (<code>bab</code>, <code>str_mod</code>, <code>level</code>, etc.).
                </p>
              </div>

              {/* Input Box */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold opacity-80 block">
                  Plain English Rule Instruction:
                </label>
                <div className="flex gap-2">
                  <textarea
                    rows={3}
                    placeholder="e.g. Power Attack with my longsword using BAB +4 and 1d8+STR with two-handed damage, plus 1d6 fire if smiting..."
                    value={macroPrompt}
                    onChange={(e) => setMacroPrompt(e.target.value)}
                    className={`flex-1 p-3 rounded-lg text-xs font-mono border outline-hidden shadow-inner resize-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-amber-300 text-stone-900'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                    <span className="opacity-60 text-[10px]">Try:</span>
                    {[
                      'Power Attack with Greatsword',
                      'Flanking Rogue Sneak Attack',
                      'Smite Evil Attack & Damage',
                      'Fireball Damage scaling with Level',
                      'Cure Light Wounds with CL cap',
                    ].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setMacroPrompt(example)}
                        className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[10px] transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleGenerateMacro}
                    disabled={isGeneratingMacro || !macroPrompt.trim()}
                    className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {isGeneratingMacro ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Formulating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Build Macro</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Generated Result Card */}
              {macroResult && (
                <div
                  className={`p-4 rounded-xl border space-y-4 shadow-sm ${
                    isDark ? 'bg-slate-950 border-cyan-500/40' : 'bg-white border-amber-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-500 uppercase tracking-wider">
                        Generated DSL Formula:
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                        {macroResult.category}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono opacity-70">#{macroResult.name}</span>
                  </div>

                  {/* Formula Display Box */}
                  <div
                    className={`p-3 rounded-lg font-mono text-sm font-bold border break-all select-all ${
                      isDark ? 'bg-slate-900 border-slate-700 text-cyan-200' : 'bg-stone-50 border-stone-300 text-stone-900'
                    }`}
                  >
                    {macroResult.formula}
                  </div>

                  <div className="text-xs opacity-80 font-serif leading-relaxed">
                    <span className="font-bold">PF1e Mechanics: </span>
                    {macroResult.explanation}
                  </div>

                  {/* Test Output if evaluated */}
                  {macroTestOutput && (
                    <div
                      className={`p-3 rounded-lg border font-mono text-xs flex items-center justify-between ${
                        isDark ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200' : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Play className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Live Character Test:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {macroTestOutput}
                        </span>
                      </div>
                      <span className="text-[10px] opacity-70">
                        (Using {character.name}&apos;s current stats)
                      </span>
                    </div>
                  )}

                  {/* Action Buttons: Test, Copy, Send to DSL Page */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-inherit">
                    <button
                      onClick={handleTestMacro}
                      className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Test Macro Live</span>
                    </button>

                    <button
                      onClick={handleCopyMacro}
                      className="px-3 py-1.5 rounded text-xs font-mono font-semibold border border-inherit hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
                    >
                      {macroCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{macroCopied ? 'Copied!' : 'Copy Formula'}</span>
                    </button>

                    <button
                      onClick={handleSendToDSL}
                      className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-cyan-700 hover:bg-cyan-600 text-white transition-colors flex items-center gap-1.5"
                      title="Store permanently in Page 4 Formula Objects"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to DSL Studio Page</span>
                    </button>

                    {macroSentNotice && (
                      <span className="text-xs font-mono text-emerald-500 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Added to Character Formula Objects!
                      </span>
                    )}

                    {onNavigateToDSLPage && (
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToDSLPage();
                        }}
                        className="ml-auto text-xs font-mono text-cyan-400 hover:underline"
                      >
                        View Page 4 Formula Studio &rarr;
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1B: AI BUFF MAKER (<^...>) */}
          {activeTab === 'buff_maker' && (
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>AI Buff Maker: Plain English to Buff Box &amp; &lt;^...&gt; Macaroni</span>
                </h3>
                <p className="text-xs opacity-75 font-serif leading-relaxed">
                  Describe any Pathfinder 1e spell, class buff, feat, or condition. Generates both a
                  1-click active Buff Box effect and all 3 Macaroni <code>&lt;^...&gt;</code> syntax
                  formats (<code>Stat.Type</code>, <code>&#123;col:row&#125;</code> matrix coordinates,
                  and <code>ALLCAPS</code>).
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono font-bold opacity-80 block">
                  Describe Buff, Spell, Feat, or Condition:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Mage Armor +4 enhancement bonus to AC locked once, or Sustained +10 untyped AC, or Barbarian Rage..."
                  value={buffPrompt}
                  onChange={(e) => setBuffPrompt(e.target.value)}
                  className={`w-full p-3 rounded-lg text-xs font-mono border outline-hidden shadow-inner resize-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-white border-amber-300 text-stone-900'
                  }`}
                />

                <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                    <span className="opacity-60 text-[10px]">Standard Buffs:</span>
                    {[
                      'Mage Armor (+4 Enhancement AC)',
                      'Sustained +10 Untyped AC',
                      'Bardic Inspiration +2',
                      'Barbarian Rage',
                      'Dodge Feat (Permanent +2 Dodge AC)',
                      'Grappled Condition',
                      'Sickened Condition',
                      'Shaken Condition',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBuffPrompt(preset)}
                        className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 hover:bg-amber-500/20 text-[10px] transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleGenerateBuff}
                    disabled={isGeneratingBuff || !buffPrompt.trim()}
                    className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {isGeneratingBuff ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Forging Buff...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Make Buff &lt;^&gt;</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {buffResult && (
                <div
                  className={`p-4 rounded-xl border space-y-4 shadow-sm ${
                    isDark ? 'bg-slate-950 border-cyan-500/40' : 'bg-white border-amber-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-amber-400">
                        {buffResult.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                        {buffResult.category}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                        {buffResult.bonusType}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(buffResult.values).map(([k, v]) => (
                        <span
                          key={k}
                          className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            (v || 0) >= 0
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {k.toUpperCase()}: {(v || 0) >= 0 ? `+${v}` : v}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Three Supported <^...> Macaroni Syntaxes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-cyan-400">
                        <span>1. Matrix &#123;col:row&#125; Syntax</span>
                        <button
                          onClick={() => handleCopyBuffSyntax(buffResult.coordinateSyntax)}
                          className="underline hover:text-white"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="text-amber-300 font-bold break-all select-all">
                        {buffResult.coordinateSyntax}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-cyan-400">
                        <span>2. Stat.BonusType Shorthand</span>
                        <button
                          onClick={() => handleCopyBuffSyntax(buffResult.macaroniSyntax)}
                          className="underline hover:text-white"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="text-emerald-300 font-bold break-all select-all">
                        {buffResult.macaroniSyntax}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-cyan-400">
                        <span>3. Natural ALLCAPS Phrase</span>
                        <button
                          onClick={() => handleCopyBuffSyntax(buffResult.allCapsSyntax)}
                          className="underline hover:text-white"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="text-purple-300 font-bold break-all select-all">
                        {buffResult.allCapsSyntax}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs opacity-85 font-serif leading-relaxed space-y-1">
                    <div>
                      <span className="font-bold">Matrix Mapping: </span>
                      {buffResult.explanation}
                    </div>
                    <div className="text-amber-400 italic font-mono text-[11px]">
                      🧀 &ldquo;{buffResult.quirkyQuote}&rdquo;
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-inherit">
                    <button
                      onClick={handleApplyBuffToBox}
                      className="px-4 py-1.5 rounded text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-slate-950 transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply Directly to Buff Box</span>
                    </button>

                    <button
                      onClick={() => handleCopyBuffSyntax(buffResult.coordinateSyntax)}
                      className="px-3 py-1.5 rounded text-xs font-mono font-semibold border border-inherit hover:bg-white/5 transition-colors flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{buffMacroCopied ? 'Copied <^> Macro!' : 'Copy <^> Macro'}</span>
                    </button>

                    {buffAppliedNotice && (
                      <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Active in {character.name}&apos;s Buff Box!
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHARACTER VOICE JOURNALER */}
          {activeTab === 'journal' && (
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  <span>In-Character Voice Journal Assistant</span>
                </h3>
                <p className="text-xs opacity-75 font-serif leading-relaxed">
                  Provide what occurred in the session and specify your character&apos;s personal voice or
                  writing sample. The AI authors a first-person entry strictly from your character&apos;s
                  perspective and extracts key notes to recall.
                </p>
              </div>

              {/* Voice and Prompt Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Voice Setting Box */}
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold opacity-80 block">
                    Voice Persona / Sample Style:
                  </label>
                  <textarea
                    rows={4}
                    placeholder="e.g. Terse, serious, no-nonsense, short sentences, gruff veteran, or paste a sample paragraph..."
                    value={voiceSetting}
                    onChange={(e) => setVoiceSetting(e.target.value)}
                    className={`w-full p-2.5 rounded-lg text-xs font-serif border outline-hidden resize-none ${
                      isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-amber-300'
                    }`}
                  />
                  <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                    <span className="opacity-60">Presets:</span>
                    {[
                      'Terse, serious, gruff',
                      'Arrogant elven noble',
                      'Pious cleric of Sarenrae',
                      'Sarcastic street rogue',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setVoiceSetting(preset)}
                        className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 hover:opacity-100 opacity-75"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Session Prompt Box */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-mono font-bold opacity-80 block">
                    Session Events & Details to Chronicle:
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe what your character did, fought, or discovered in today's game..."
                    value={journalPrompt}
                    onChange={(e) => setJournalPrompt(e.target.value)}
                    className={`w-full p-2.5 rounded-lg text-xs font-serif border outline-hidden resize-none ${
                      isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-amber-300'
                    }`}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleGenerateJournal}
                      disabled={isGeneratingJournal || !journalPrompt.trim()}
                      className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      {isGeneratingJournal ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Writing in Voice...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Write In Character</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Generated Journal Output Card */}
              {journalResult && (
                <div
                  className={`p-5 rounded-xl border space-y-4 shadow-sm ${
                    isDark ? 'bg-slate-950 border-cyan-500/40' : 'bg-white border-amber-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-2 border-inherit">
                    <div>
                      <h4 className="text-lg font-serif font-bold">{journalResult.title}</h4>
                      <span className="text-xs font-mono opacity-70">
                        {journalResult.sessionDate} • In the voice of {character.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleInsertIntoJournal}
                        className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-amber-700 hover:bg-amber-600 text-white transition-colors flex items-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Insert Directly into Journal</span>
                      </button>

                      {onOpenJournal && (
                        <button
                          onClick={() => {
                            handleInsertIntoJournal();
                            onClose();
                            onOpenJournal();
                          }}
                          className="px-3 py-1.5 rounded text-xs font-mono font-semibold border border-inherit hover:opacity-100 transition-opacity"
                        >
                          Save & Open Journal Tool
                        </button>
                      )}
                    </div>
                  </div>

                  {/* In-Character Text */}
                  <div className="font-serif text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-lg bg-black/5 dark:bg-white/5">
                    {journalResult.content}
                  </div>

                  {/* Recalled Notes List */}
                  {journalResult.recalledNotes && journalResult.recalledNotes.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Extracted Campaign Recall Notes:
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {journalResult.recalledNotes.map((note, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded border text-xs font-serif flex items-center gap-2 bg-black/5 dark:bg-white/5 border-inherit"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                            <span>{note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {journalInsertedNotice && (
                    <div className="p-2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs font-mono flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>Successfully added to {character.name}’s Session Journal!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PENCIL SKETCHES & WORKSPACE IMAGERY */}
          {activeTab === 'sketch' && (
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-amber-600" />
                  <span>Pencil Sketch & Workspace Imagery Studio</span>
                </h3>
                <p className="text-xs opacity-75 font-serif leading-relaxed">
                  Generate authentic pencil illustrations for the journal or small visual assets for the
                  workspace image library. For journal illustrations, it strictly generates pencil sketches
                  at your chosen detail level.
                </p>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-3 border-b pb-3 border-inherit">
                <button
                  type="button"
                  onClick={() => setSketchMode('journal_pencil')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors flex items-center gap-2 ${
                    sketchMode === 'journal_pencil'
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'bg-black/5 dark:bg-white/5 border-inherit opacity-75'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Journal Pencil Sketch (Strict Graphite Rules)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSketchMode('workspace_image')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors flex items-center gap-2 ${
                    sketchMode === 'workspace_image'
                      ? 'bg-cyan-700 text-white border-cyan-700'
                      : 'bg-black/5 dark:bg-white/5 border-inherit opacity-75'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Workspace Library Image Asset</span>
                </button>
              </div>

              {/* Sketch Options Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-mono font-bold opacity-80 block">
                    {sketchMode === 'journal_pencil' ? 'Pencil Sketch Subject:' : 'Image Prompt & Subject:'}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      sketchMode === 'journal_pencil'
                        ? 'e.g. Kenabres garrison gate, Dragon skull, Holy symbol of Sarenrae, Basilisk eye...'
                        : 'e.g. Ornate flaming longsword icon, Ancient dungeon map fragment, Mithral shield...'
                    }
                    value={sketchPrompt}
                    onChange={(e) => setSketchPrompt(e.target.value)}
                    className={`w-full px-3 py-2 rounded text-xs border outline-hidden ${
                      isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-amber-300'
                    }`}
                  />

                  {sketchMode === 'workspace_image' && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[11px] font-mono font-bold opacity-75 block">
                        Art Style Prompt:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. High fantasy oil illustration, Sepia parchment relic, Mythic crest..."
                        value={artStylePrompt}
                        onChange={(e) => setArtStylePrompt(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded text-xs border outline-hidden ${
                          isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-amber-300'
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Quality Selector (crude, passible, tasteful, astounding) */}
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold opacity-80 block">
                    Detail Quality (Strict PF1e Journal Rule):
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                    {(['crude', 'passible', 'tasteful', 'astounding'] as SketchDetailQuality[]).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setSketchQuality(q)}
                        className={`px-2 py-2 rounded-lg capitalize border transition-all text-center ${
                          sketchQuality === q
                            ? 'bg-amber-700 text-white border-amber-700 font-bold shadow-xs'
                            : 'bg-black/5 dark:bg-white/5 border-inherit opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="font-bold">{q}</div>
                        <div className="text-[9px] opacity-75">
                          {q === 'crude' ? 'Rough Gestures' : q === 'passible' ? 'Field Contours' : q === 'tasteful' ? 'Refined Shading' : 'Masterwork'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateSketch}
                  disabled={isGeneratingSketch || !sketchPrompt.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isGeneratingSketch ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Rendering Sketch...</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Draw Sketch</span>
                    </>
                  )}
                </button>
              </div>

              {/* Rendered Sketch Result Box */}
              {sketchResult && (
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isDark ? 'bg-slate-950 border-cyan-500/40' : 'bg-white border-amber-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-sm">{sketchResult.caption}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 uppercase font-bold">
                        {sketchResult.quality} detail quality
                      </span>
                    </div>

                    <button
                      onClick={handleSaveSketch}
                      className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-amber-700 hover:bg-amber-600 text-white transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {sketchMode === 'journal_pencil'
                          ? 'Add to Latest Journal Entry'
                          : 'Save to Workspace Library'}
                      </span>
                    </button>
                  </div>

                  {/* Image Viewport */}
                  <div className="flex justify-center p-2 rounded-lg bg-black/10 overflow-hidden">
                    <img
                      src={sketchResult.imageUrl}
                      alt={sketchResult.prompt}
                      className="max-h-72 object-contain rounded-md shadow-md"
                    />
                  </div>

                  {sketchSavedNotice && (
                    <div className="p-2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs font-mono flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>
                        {sketchMode === 'journal_pencil'
                          ? 'Successfully preserved in Journal!'
                          : 'Saved to Character Workspace Library!'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SHEET FIELD INSPECTOR & MODIFIER */}
          {activeTab === 'fields' && (
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-cyan-400" />
                  <span>Bounded Sheet Field Inspector & Modifier</span>
                </h3>
                <p className="text-xs opacity-75 font-serif leading-relaxed">
                  This turn uses the sheet tools directly and does not call a live model. It can update
                  level, class, hit die, catalog archetypes, point buy, Macaroni, and the permitted
                  fields below. Unknown archetypes and missing point-buy budgets stay as questions.
                  Nothing is written until you approve.
                </p>
              </div>

              {/* Input for sheet command */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold opacity-80 block">
                  Natural Language Command:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Suffer 18 points of damage, Become fatigued, Found 85 gp, Add 2 healing potions to backpack..."
                    value={fieldInstruction}
                    onChange={(e) => setFieldInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleParseFieldInstruction();
                    }}
                    className={`flex-1 px-3 py-2 rounded text-xs border outline-hidden ${
                      isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-amber-300'
                    }`}
                  />
                  <button
                    onClick={handleParseFieldInstruction}
                    disabled={!fieldInstruction.trim()}
                    className="px-4 py-2 rounded text-xs font-mono font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition-colors"
                  >
                    Inspect & Propose
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px] font-mono pt-1">
                  <span className="opacity-60 text-[10px]">Quick Commands:</span>
                  {[
                    'Take 12 damage',
                    'Heal 15 hp',
                    'Become fatigued',
                    'Clear fatigued',
                    'Found 120 gp',
                    'Spent 45 gp',
                  ].map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => setFieldInstruction(cmd)}
                      className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 hover:opacity-100 opacity-75 text-[10px]"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>

              {/* Proposed Actions */}
              {companionTurn && (
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    companionTurn.errors.length
                      ? 'border-rose-500/40 bg-rose-950/20'
                      : isDark
                        ? 'bg-slate-950 border-cyan-500/30'
                        : 'bg-white border-amber-800/20'
                  }`}
                >
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                    Companion reply {companionTurn.usedLiveModel ? '' : '(no live model)'}
                  </div>
                  <p className="text-sm font-serif leading-relaxed">{companionTurn.reply}</p>
                  {companionTurn.changes.length > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-mono opacity-75">
                        {companionTurn.changes.length} change(s) ready for the sheet and Add Class.
                      </span>
                      <button
                        onClick={handleApplyCompanionTurn}
                        className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Apply</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {actionAppliedNotice && (
                <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Changes successfully recorded onto {character.name}&apos;s character sheet!</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MODULE PERMISSIONS & SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-600" />
                  <span>AI Module Parameters & Permission Boundaries</span>
                </h3>
                <p className="text-xs opacity-75 font-serif leading-relaxed">
                  Control which areas of the character sheet the AI tool is allowed to read and propose
                  modifications for. Fields with unchecked permissions cannot be altered by the module.
                </p>
              </div>

              {/* Permission Matrix */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-amber-800/20'
                }`}
              >
                <span className="text-xs font-mono font-bold uppercase tracking-wider block">
                  Permitted Sheet Fields:
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-serif">
                  {[
                    { key: 'hp', label: 'Hit Points & Nonlethal (Damage / Healing)', desc: 'Current HP, Temp HP, damage calculations' },
                    { key: 'conditions', label: 'Combat Conditions & Debuffs', desc: 'Fatigued, shaken, entangled, prone toggles' },
                    { key: 'currency', label: 'Currency & Wealth Transactions', desc: 'Adding and deducting GP, SP, CP' },
                    { key: 'inventory', label: 'Inventory & Item Stash', desc: 'Adding looted items or potions to backpack' },
                    { key: 'notes', label: 'Notes & Scratchpad Logs', desc: 'Appending session clues to scratchpad' },
                    { key: 'journal', label: 'Session Journal Entries', desc: 'Drafting and inserting session chronicles' },
                    { key: 'customFormulas', label: 'Custom Formula DSL Studio', desc: 'Saving generated macros into Page 4' },
                  ].map((field) => {
                    const isAllowed = settings.allowedFields[field.key as keyof AIModuleSettings['allowedFields']];
                    return (
                      <div
                        key={field.key}
                        onClick={() =>
                          handleUpdateSettings({
                            allowedFields: {
                              ...settings.allowedFields,
                              [field.key]: !isAllowed,
                            },
                          })
                        }
                        className={`p-2.5 rounded-lg border cursor-pointer select-none transition-colors flex items-start gap-2.5 ${
                          isAllowed
                            ? isDark
                              ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-100'
                              : 'bg-amber-100/60 border-amber-700/40 text-stone-900'
                            : 'bg-black/5 dark:bg-white/5 border-inherit opacity-60'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 mt-0.5 ${
                            isAllowed
                              ? 'bg-cyan-600 border-cyan-500 text-white'
                              : 'border-slate-500'
                          }`}
                        >
                          {isAllowed && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="font-bold leading-tight">{field.label}</div>
                          <div className="text-[11px] opacity-75">{field.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Module Uninstall / Hide Toggle */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-amber-800/20'
                }`}
              >
                <div>
                  <div className="text-xs font-mono font-bold">Module Installation Status</div>
                  <div className="text-xs font-serif opacity-75">
                    Currently installed and pinned to the left workspace toolbar.
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm('Uninstall AI Companion module? You can reinstall it anytime from Settings.')) {
                      onUpdateCharacter((prev) => ({
                        ...prev,
                        installedModules: {
                          ...prev.installedModules,
                          aiCompanion: false,
                        },
                      }));
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 transition-colors"
                >
                  Uninstall Module
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
