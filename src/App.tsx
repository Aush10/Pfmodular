/**
 * Pathfinder 1st Edition Modular Workspace & Character Sheet Application
 * Implements:
 * - Technical Blueprint Workspace Builder
 * - Tabletop Facing Sheet (Parchment Tan & Times New Roman 12 Charcoal Black)
 * - Player-Friendly Custom Formula & Object Engine (DSL)
 * - Automated PF1e Mathematics (Point Buy, AC, Saves, Iterative Attacks, ACP, Encumbrance, Conditions)
 * - Interactive Tools (Dice Tray, Point Buy Allocator, Quick HP Tracker, Condition Debuffs)
 * - Spreadsheet CSV & JSON Persistence
 */

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Dices,
  Calculator,
  Heart,
  Shield,
  FileSpreadsheet,
  Download,
  Upload,
  Printer,
  Sparkles,
  Palette,
  Maximize2,
  Scroll,
  Clock,
  Terminal,
  FilePlus,
  FolderOpen,
  User,
  Image as ImageIcon,
  FileCode,
  BookOpen,
  Cpu,
} from 'lucide-react';

import { PF1Character, WorkspaceLayout, AbilityName } from './types/character';
import { DEFAULT_CHARACTER, createBlankCharacter } from './data/defaultCharacter';
import { computeDerivedCharacterStats } from './engine/pf1eMath';
import { DiceRollOutcome } from './engine/formula';

import { BlueprintSidebar } from './components/workspace/BlueprintSidebar';
import { SheetPage1Core } from './components/sheet/SheetPage1Core';
import { SheetPage2ActionsSkills } from './components/sheet/SheetPage2ActionsSkills';
import { SheetPage3BioStorage } from './components/sheet/SheetPage3BioStorage';
import { SheetPage2SkillsGear } from './components/sheet/SheetPage2SkillsGear';
import { SheetPage3SpellsBio } from './components/sheet/SheetPage3SpellsBio';
import { SheetPage4FormulaStudio } from './components/sheet/SheetPage4FormulaStudio';
import { BuffBoxModule } from './components/sheet/BuffBoxModule';

import { DiceRollerTray } from './components/tools/DiceRollerTray';
import { PointBuyModal } from './components/tools/PointBuyModal';
import { QuickHPBar } from './components/tools/QuickHPBar';
import { StepperTool } from './components/tools/StepperTool';
import { DeckTool } from './components/tools/DeckTool';
import { XDXTool } from './components/tools/XDXTool';
import { LoadoutModal } from './components/tools/LoadoutModal';
import { AddClassModal } from './components/tools/AddClassModal';
import { CMBTool } from './components/tools/CMBTool';
import { NewSheetModal } from './components/tools/NewSheetModal';
import { ImageFileBrowserModal } from './components/tools/ImageFileBrowserModal';
import { JournalModal } from './components/tools/JournalModal';
import { AICompanionModal } from './components/tools/AICompanionModal';
import { FloatingAlertCard } from './components/common/FloatingAlertCard';
import { InteractiveQueryModal } from './components/common/InteractiveQueryModal';
import { FloatingAlertPayload, MacaroniQueryRequest } from './engine/macaroni';

const LOCAL_STORAGE_KEY = 'pf1e_character_data_v1';
const LOCAL_STORAGE_LAYOUT_KEY = 'pf1e_workspace_layout_v1';

export default function App() {
  // Initialize character state from injected window object, localStorage, or default
  const [character, setCharacter] = useState<PF1Character>(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).__INITIAL_CHARACTER__) {
        const injected = (window as any).__INITIAL_CHARACTER__;
        return {
          ...DEFAULT_CHARACTER,
          ...injected,
          gender: injected.gender || DEFAULT_CHARACTER.gender || 'Male',
          abilities: { ...DEFAULT_CHARACTER.abilities, ...(injected.abilities || {}) },
          buffBox: injected.buffBox || DEFAULT_CHARACTER.buffBox,
          currency: { ...DEFAULT_CHARACTER.currency, ...(injected.currency || {}) },
          hpBreakdown: {
            ...DEFAULT_CHARACTER.hpBreakdown,
            calcMethod: injected.hpBreakdown?.calcMethod || 'max',
            ...(injected.hpBreakdown || {}),
          },
          characterBio: { ...DEFAULT_CHARACTER.characterBio, ...(injected.characterBio || {}) },
          conditions: { ...DEFAULT_CHARACTER.conditions, ...(injected.conditions || {}) },
          saves: {
            fortitude: { ...DEFAULT_CHARACTER.saves.fortitude, ...(injected.saves?.fortitude || {}) },
            reflex: { ...DEFAULT_CHARACTER.saves.reflex, ...(injected.saves?.reflex || {}) },
            will: { ...DEFAULT_CHARACTER.saves.will, ...(injected.saves?.will || {}) },
          },
          inventory: Array.isArray(injected.inventory) ? injected.inventory : DEFAULT_CHARACTER.inventory,
          weapons: Array.isArray(injected.weapons) ? injected.weapons : DEFAULT_CHARACTER.weapons,
          armor: Array.isArray(injected.armor) ? injected.armor : DEFAULT_CHARACTER.armor,
          skills: Array.isArray(injected.skills) ? injected.skills : DEFAULT_CHARACTER.skills,
          classes: Array.isArray(injected.classes) ? injected.classes : DEFAULT_CHARACTER.classes,
          uiMakePresets: Array.isArray(injected.uiMakePresets) ? injected.uiMakePresets : DEFAULT_CHARACTER.uiMakePresets,
        };
      }
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_CHARACTER,
            ...parsed,
            gender: parsed.gender || DEFAULT_CHARACTER.gender || 'Male',
            abilities: { ...DEFAULT_CHARACTER.abilities, ...(parsed.abilities || {}) },
            buffBox: parsed.buffBox || DEFAULT_CHARACTER.buffBox,
            currency: { ...DEFAULT_CHARACTER.currency, ...(parsed.currency || {}) },
            hpBreakdown: {
              ...DEFAULT_CHARACTER.hpBreakdown,
              calcMethod: parsed.hpBreakdown?.calcMethod || 'max',
              ...(parsed.hpBreakdown || {}),
            },
            characterBio: { ...DEFAULT_CHARACTER.characterBio, ...(parsed.characterBio || {}) },
            conditions: { ...DEFAULT_CHARACTER.conditions, ...(parsed.conditions || {}) },
            saves: {
              fortitude: { ...DEFAULT_CHARACTER.saves.fortitude, ...(parsed.saves?.fortitude || {}) },
              reflex: { ...DEFAULT_CHARACTER.saves.reflex, ...(parsed.saves?.reflex || {}) },
              will: { ...DEFAULT_CHARACTER.saves.will, ...(parsed.saves?.will || {}) },
            },
            inventory: Array.isArray(parsed.inventory) ? parsed.inventory : DEFAULT_CHARACTER.inventory,
            weapons: Array.isArray(parsed.weapons) ? parsed.weapons : DEFAULT_CHARACTER.weapons,
            armor: Array.isArray(parsed.armor) ? parsed.armor : DEFAULT_CHARACTER.armor,
            skills: Array.isArray(parsed.skills) ? parsed.skills : DEFAULT_CHARACTER.skills,
            classes: Array.isArray(parsed.classes) ? parsed.classes : DEFAULT_CHARACTER.classes,
            uiMakePresets: Array.isArray(parsed.uiMakePresets) ? parsed.uiMakePresets : DEFAULT_CHARACTER.uiMakePresets,
          };
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_CHARACTER;
  });

  // Initialize workspace layout
  const [layout, setLayout] = useState<WorkspaceLayout>(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).__INITIAL_LAYOUT__) {
        return (window as any).__INITIAL_LAYOUT__;
      }
      const saved = localStorage.getItem(LOCAL_STORAGE_LAYOUT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            theme: parsed.theme || 'parchment',
            font: parsed.font || 'times',
            activeSheet: parsed.activeSheet >= 1 && parsed.activeSheet <= 4 ? parsed.activeSheet : 1,
            showAllSheets: Boolean(parsed.showAllSheets),
            visibleModules: {
              abilities: true,
              hpAndVitals: true,
              armorClass: true,
              saves: true,
              attacks: true,
              weapons: true,
              armor: true,
              feats: true,
              skills: true,
              inventory: true,
              currency: true,
              languages: true,
              spellMatrix: true,
              spellbook: true,
              conditions: true,
              biography: true,
              profile: true,
              notes: true,
              formulaStudio: true,
              statblock: true,
              buffBox: true,
              ...(parsed.visibleModules || {}),
            },
          };
        }
      }
    } catch {
      // Fallback
    }
    return {
      theme: 'parchment', // Defaults to Parchment Tan per user instruction
      font: 'times', // Defaults to Times New Roman 12 per user instruction
      activeSheet: 1,
      showAllSheets: false,
      visibleModules: {
        abilities: true,
        hpAndVitals: true,
        armorClass: true,
        saves: true,
        attacks: true,
        weapons: true,
        armor: true,
        feats: true,
        skills: true,
        inventory: true,
        currency: true,
        languages: true,
        spellMatrix: true,
        spellbook: true,
        conditions: true,
        biography: true,
        profile: true,
        notes: true,
        formulaStudio: true,
        statblock: true,
        buffBox: true,
      },
    };
  });

  // Tool Modals State
  const [isDiceOpen, setIsDiceOpen] = useState(false);
  const [dicePresetFormula, setDicePresetFormula] = useState<string>('1d20+7');
  const [isPointBuyOpen, setIsPointBuyOpen] = useState(false);
  const [isQuickHPOpen, setIsQuickHPOpen] = useState(false);
  const [isBuffBoxOpen, setIsBuffBoxOpen] = useState(false);
  const [isConditionsOpen, setIsConditionsOpen] = useState(false);
  const [isStepperOpen, setIsStepperOpen] = useState(false);
  const [isDeckOpen, setIsDeckOpen] = useState(false);
  const [isXDXOpen, setIsXDXOpen] = useState(false);
  const [isLoadoutOpen, setIsLoadoutOpen] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isCMBtOpen, setIsCMBtOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isAIToolOpen, setIsAIToolOpen] = useState(false);
  const [aiToolInitialTab, setAiToolInitialTab] = useState<'macro' | 'journal' | 'sketch' | 'fields' | 'settings'>('macro');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // New Sheet & Image File Browser state
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false);
  const [isImageBrowserOpen, setIsImageBrowserOpen] = useState(false);
  const [imageBrowserConfig, setImageBrowserConfig] = useState<{
    targetType: 'profile' | 'portrait' | 'item';
    title?: string;
    subtitle?: string;
    itemName?: string;
    currentUrl?: string;
    itemId?: string;
  }>({
    targetType: 'profile',
    title: 'Character Profile Picture Browser',
    currentUrl: '',
  });

  // Macaroni Interactive Global Alerts (<TAG"message">) & Decision Queries (<?>)
  const [floatingAlerts, setFloatingAlerts] = useState<FloatingAlertPayload[]>([]);
  const [activeQuery, setActiveQuery] = useState<MacaroniQueryRequest | null>(null);

  useEffect(() => {
    const handleAlert = (e: any) => {
      if (e.detail) {
        setFloatingAlerts((prev) => [...prev, e.detail]);
      }
    };
    const handleQuery = (e: any) => {
      if (e.detail) {
        setActiveQuery(e.detail);
      }
    };

    window.addEventListener('macaroni:alert', handleAlert);
    window.addEventListener('macaroni:query', handleQuery);

    return () => {
      window.removeEventListener('macaroni:alert', handleAlert);
      window.removeEventListener('macaroni:query', handleQuery);
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(character));
    } catch {
      // ignore quota errors
    }
  }, [character]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_LAYOUT_KEY, JSON.stringify(layout));
    } catch {
      // ignore
    }
  }, [layout]);

  // Global Ctrl+X or Escape listener to close all open tools/modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && (e.key === 'x' || e.key === 'X')) || e.key === 'Escape') {
        setIsDiceOpen(false);
        setIsPointBuyOpen(false);
        setIsQuickHPOpen(false);
        setIsBuffBoxOpen(false);
        setIsConditionsOpen(false);
        setIsStepperOpen(false);
        setIsDeckOpen(false);
        setIsXDXOpen(false);
        setIsLoadoutOpen(false);
        setIsAddClassOpen(false);
        setIsCMBtOpen(false);
        setIsNewSheetOpen(false);
        setIsImageBrowserOpen(false);
        setIsJournalOpen(false);
        setIsAIToolOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenJournal = () => setIsJournalOpen(true);
  const handleOpenAITool = (tab: 'macro' | 'journal' | 'sketch' | 'fields' | 'settings' = 'macro') => {
    setAiToolInitialTab(tab);
    setIsAIToolOpen(true);
  };
  const handleInstallAITool = () => {
    setCharacter((prev) => ({
      ...prev,
      installedModules: {
        ...prev.installedModules,
        aiCompanion: true,
      },
    }));
    setAiToolInitialTab('macro');
    setIsAIToolOpen(true);
  };

  // Compute all derived stats automatically
  const derived = computeDerivedCharacterStats(character);

  // Trigger a dice roll with a preset formula
  const handleRollFormula = (formula: string, label?: string) => {
    setDicePresetFormula(formula);
    setIsDiceOpen(true);
  };

  // Open Image File Browser for any target (profile, portrait, or inventory item)
  const handleOpenImageBrowser = (config?: {
    targetType?: 'profile' | 'portrait' | 'item';
    title?: string;
    subtitle?: string;
    itemName?: string;
    currentUrl?: string;
    itemId?: string;
  }) => {
    setImageBrowserConfig({
      targetType: config?.targetType || 'profile',
      title: config?.title || 'Character Profile Picture Browser',
      subtitle: config?.subtitle,
      itemName: config?.itemName,
      currentUrl: config?.currentUrl || '',
      itemId: config?.itemId,
    });
    setIsImageBrowserOpen(true);
  };

  // Callback when an image is chosen in Image File Browser
  const handleSelectImageFromBrowser = (url: string) => {
    if (imageBrowserConfig.targetType === 'profile') {
      setCharacter((prev) => ({
        ...prev,
        profileData: {
          ...(prev.profileData || { customFields: [] }),
          avatarUrl: url,
        },
      }));
    } else if (imageBrowserConfig.targetType === 'portrait') {
      setCharacter((prev) => {
        const currentList = prev.characterBio?.portraits || [];
        const updated = url ? [...currentList.filter((p) => p !== url), url] : currentList;
        return {
          ...prev,
          characterBio: {
            ...(prev.characterBio || { scratchpad: '', bioSections: [] }),
            portraits: updated,
            currentPortraitIndex: Math.max(0, updated.length - 1),
          },
        };
      });
    } else if (imageBrowserConfig.targetType === 'item' && imageBrowserConfig.itemId) {
      setCharacter((prev) => ({
        ...prev,
        inventory: prev.inventory.map((item) =>
          item.id === imageBrowserConfig.itemId ? { ...item, imageUrl: url } : item
        ),
      }));
    }
  };

  // Reset to pristine blank sheet
  const handleConfirmBlankSheet = () => {
    const blank = createBlankCharacter();
    setCharacter(blank);
  };

  // Reset to default iconic Valerius
  const handleConfirmDefaultSheet = () => {
    setCharacter(DEFAULT_CHARACTER);
  };

  // Apply point buy and Level ASI updates
  const handleApplyPointBuy = ({
    bases,
    asi,
    budget,
  }: {
    bases: Record<AbilityName, number>;
    asi: Record<AbilityName, number>;
    budget: number;
  }) => {
    setCharacter((prev) => {
      const updatedAbilities = { ...prev.abilities };
      for (const ab of Object.keys(bases) as AbilityName[]) {
        if (updatedAbilities[ab]) {
          updatedAbilities[ab] = {
            ...updatedAbilities[ab],
            base: bases[ab],
            levelAsiMod: asi[ab] || 0,
          };
        }
      }
      return { ...prev, abilities: updatedAbilities, pointBuyBudget: budget };
    });
  };

  // Export Standalone Single-File HTML bundle
  const [isExportingHTML, setIsExportingHTML] = useState(false);

  const handleExportStandaloneHTML = async () => {
    setIsExportingHTML(true);
    try {
      // Fetch the pre-bundled standalone HTML asset from public directory
      let htmlText = '';
      try {
        const response = await fetch('/pathfinder1e_standalone.html');
        if (response.ok) {
          htmlText = await response.text();
        }
      } catch (e) {
        console.warn('Could not fetch standalone template directly:', e);
      }

      if (!htmlText || !htmlText.includes('<!DOCTYPE html>')) {
        // Fallback: If template not loaded via fetch (e.g. offline file://), create inline bootloader wrapper
        const serializedChar = JSON.stringify(character).replace(/</g, '\\u003c');
        const serializedLayout = JSON.stringify(layout).replace(/</g, '\\u003c');
        htmlText = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${character.name || 'Character'} - Pathfinder 1e Sheet</title>
  <script>
    window.__INITIAL_CHARACTER__ = ${serializedChar};
    window.__INITIAL_LAYOUT__ = ${serializedLayout};
  </script>
</head>
<body>
  ${document.documentElement.outerHTML}
</body>
</html>`;
      } else {
        // Inject the active character and layout into the standalone template
        const injectionScript = `<script>
  window.__INITIAL_CHARACTER__ = ${JSON.stringify(character).replace(/<\/script>/gi, '<\\/script>')};
  window.__INITIAL_LAYOUT__ = ${JSON.stringify(layout).replace(/<\/script>/gi, '<\\/script>')};
</script>`;
        // Insert right after <head>
        if (htmlText.includes('<head>')) {
          htmlText = htmlText.replace('<head>', `<head>\n  ${injectionScript}`);
        } else {
          htmlText = injectionScript + htmlText;
        }
      }

      const blob = new Blob([htmlText], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = `${(character.name || 'Pathfinder1e_Character').replace(/[^a-zA-Z0-9_-]/g, '_')}_pf1e_sheet.html`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export standalone HTML:', err);
      // Direct snapshot fallback
      const serializedChar = JSON.stringify(character).replace(/</g, '\\u003c');
      const fallbackHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${character.name}</title><script>window.__INITIAL_CHARACTER__=${serializedChar};</script></head><body>${document.documentElement.outerHTML}</body></html>`;
      const blob = new Blob([fallbackHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(character.name || 'Character').replace(/\s+/g, '_')}_pf1e_sheet.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingHTML(false);
    }
  };

  // Export JSON file
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(character, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${character.name.replace(/\s+/g, '_')}_pf1e_sheet.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON file
  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.name && parsed.abilities) {
            setCharacter(parsed);
          } else {
            alert('Invalid character sheet format.');
          }
        } catch {
          alert('Could not parse JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Export CSV formatted index matching the uploaded spreadsheet structure
  const handleExportCSV = () => {
    const lines: string[] = [
      `Name:,${character.name},,,,Race:,${character.race},,,,Space:,5 ft.`,
      `Class:,${character.characterClass},,,,Level:,${character.level},,Size:,${character.size},,Reach:,5 ft.`,
      `Abilities,,Total,Base,Race,Enh,Misc,Mod,,,,Current,Max,Temp`,
      `STR,,${derived.strTotal},${character.abilities.STR.base},${character.abilities.STR.raceMod},${character.abilities.STR.enhMod},${character.abilities.STR.miscMod},${derived.strMod},Hit Points:,${character.hpCurrent},${character.hpTotalMax},${character.hpTemp}`,
      `DEX,,${derived.dexTotal},${character.abilities.DEX.base},${character.abilities.DEX.raceMod},${character.abilities.DEX.enhMod},${character.abilities.DEX.miscMod},${derived.dexMod}`,
      `CON,,${derived.conTotal},${character.abilities.CON.base},${character.abilities.CON.raceMod},${character.abilities.CON.enhMod},${character.abilities.CON.miscMod},${derived.conMod}`,
      `INT,,${derived.intTotal},${character.abilities.INT.base},${character.abilities.INT.raceMod},${character.abilities.INT.enhMod},${character.abilities.INT.miscMod},${derived.intMod}`,
      `WIS,,${derived.wisTotal},${character.abilities.WIS.base},${character.abilities.WIS.raceMod},${character.abilities.WIS.enhMod},${character.abilities.WIS.miscMod},${derived.wisMod}`,
      `CHA,,${derived.chaTotal},${character.abilities.CHA.base},${character.abilities.CHA.raceMod},${character.abilities.CHA.enhMod},${character.abilities.CHA.miscMod},${derived.chaMod}`,
      `Defense,Total,Armor,Shield,Natural,Dex,Deflection,Touch,Flat-Footed`,
      `AC,${derived.acTotal},${derived.armorBonusTotal},${derived.shieldBonusTotal},${character.naturalArmorMod},${derived.effectiveDexModForAC},${character.deflectionMod},${derived.touchAC},${derived.flatFootedAC}`,
      `Saves,Total,Base,Ability,Magic,Misc`,
      `Fortitude,${derived.fortitudeTotal},${character.saves.fortitude.base},${derived.conMod},${character.saves.fortitude.magicMod},${character.saves.fortitude.miscMod}`,
      `Reflex,${derived.reflexTotal},${character.saves.reflex.base},${derived.dexMod},${character.saves.reflex.magicMod},${character.saves.reflex.miscMod}`,
      `Will,${derived.willTotal},${character.saves.will.base},${derived.wisMod},${character.saves.will.magicMod},${character.saves.will.miscMod}`,
      `Combat,BAB,${character.baseAttackBonus},CMB,${derived.cmbTotal},CMD,${derived.cmdTotal},Initiative,${derived.initiativeTotal}`,
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(lines.join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', `${character.name.replace(/\s+/g, '_')}_pf1e_sheet.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Determine active font family
  const getFontClass = () => {
    switch (layout.font) {
      case 'times':
        return 'font-serif text-[13px] leading-relaxed'; // Classic Times New Roman 12-13pt feel
      case 'cinzel':
        return 'font-serif tracking-tight';
      case 'mono':
        return 'font-mono text-xs';
      case 'sans':
      default:
        return 'font-sans text-xs';
    }
  };

  // Determine background style of workspace canvas
  const getCanvasBgClass = () => {
    switch (layout.theme) {
      case 'parchment':
        return 'bg-[#f4efe4] text-[#1c1917]'; // Authentic warm parchment tan
      case 'blueprint':
        return 'bg-[#08121f] text-cyan-50 bg-[radial-gradient(#1e3a5f_1px,transparent_1px)] [background-size:24px_24px]'; // Blueprint grid
      case 'mythweavers':
        return 'bg-[#0d0f12] text-slate-100'; // Dark Myth-Weavers
      case 'print':
      default:
        return 'bg-white text-black';
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans ${layout.theme === 'blueprint' || layout.theme === 'mythweavers' ? 'dark' : ''}`}>
      {/* Top Bar Contract (1 row, 3 clean functional zones) */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 text-slate-100 px-4 md:px-6 flex items-center justify-between gap-6 shrink-0 z-20 print:hidden select-none">
        {/* Zone 1: Wordmark & Core Identity */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition-colors"
            title="Toggle Blueprint Sidebar"
          >
            <Layers className="w-4 h-4" />
          </button>
          <span className="font-serif font-black tracking-tight text-amber-300 text-sm md:text-base whitespace-nowrap">
            Pathfinder 1e <span className="font-sans font-light text-slate-400 text-xs hidden sm:inline">| Modular Workspace</span>
          </span>

          {/* Profile Picture thumbnail / button */}
          <button
            onClick={() =>
              handleOpenImageBrowser({
                targetType: 'profile',
                title: 'Character Profile Picture Browser',
                subtitle: 'Choose an avatar from local files, fantasy portraits, or enter an image URL.',
                currentUrl: character.profileData?.avatarUrl || character.characterBio?.portraits?.[0],
              })
            }
            className="flex items-center gap-1.5 p-1 pr-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-300 transition-all group"
            title="Click to browse character profile picture"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden border border-cyan-500/50 bg-black/60 shrink-0 flex items-center justify-center">
              {character.profileData?.avatarUrl || character.characterBio?.portraits?.[0] ? (
                <img
                  src={character.profileData?.avatarUrl || character.characterBio?.portraits?.[0]}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </div>
            <span className="text-xs font-mono hidden md:inline-block group-hover:text-cyan-300 font-semibold truncate max-w-[130px]">
              {character.name || 'Unnamed'} (Lvl {character.level})
            </span>
          </button>

          {/* Clear All / New Sheet Button */}
          <button
            onClick={() => setIsNewSheetOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 hover:border-rose-400 text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Clear all / Start a fresh new character sheet"
          >
            <FilePlus className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">New Sheet</span>
          </button>
        </div>

        {/* Zone 2: Sheet Navigation & Viewport Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 shrink-0">
          {[
            { id: 1, label: 'Page 1: Core Combat' },
            { id: 2, label: 'Page 2: Actions & Skills' },
            { id: 3, label: 'Page 3: Bio & Storage' },
            { id: 4, label: 'Page 4: DSL Studio' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setLayout((prev) => ({ ...prev, activeSheet: tab.id as 1 | 2 | 3 | 4, showAllSheets: false }));
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                layout.activeSheet === tab.id && !layout.showAllSheets
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => setLayout((prev) => ({ ...prev, showAllSheets: !prev.showAllSheets }))}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              layout.showAllSheets
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All 3 Pages
          </button>
        </nav>

        {/* Zone 3: Quick Live Action Bar */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* File Browser for Images & Gear Art */}
          <button
            onClick={() =>
              handleOpenImageBrowser({
                targetType: 'profile',
                title: 'Image & File Browser (Portraits, Items, Gallery)',
                subtitle: 'Browse local files from your computer, choose fantasy items/portraits, or link an image.',
                currentUrl: character.profileData?.avatarUrl || character.characterBio?.portraits?.[0],
              })
            }
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            title="Image File Browser: Character portraits, item icons, and fantasy presets"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">Images</span>
          </button>

          {/* Stepper Tool */}
          <button
            onClick={() => setIsStepperOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            title="Open Turn Stepper"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Stepper</span>
          </button>

          {/* Deck Tool */}
          <button
            onClick={() => setIsDeckOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            title="Open Deck Simulator"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Deck</span>
          </button>

          {/* XDX Tool */}
          <button
            onClick={() => setIsXDXOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            title="Open XDX Macro Center"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">XDX</span>
          </button>

          <button
            onClick={() => setIsDiceOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            title="Open Dice Tray"
          >
            <Dices className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Dice</span>
          </button>

          <button
            onClick={() => setIsQuickHPOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            title="Adjust HP"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>
              {character.hpCurrent}/{character.hpTotalMax}
            </span>
          </button>

          {/* Session Journal & Chronicle Button */}
          <button
            onClick={handleOpenJournal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            title="Open Session Journal, Notes & Field Sketches"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Journal</span>
          </button>

          {/* AI Companion Quick Tool Button (shown if module installed) */}
          {character.installedModules?.aiCompanion && (
            <button
              onClick={() => handleOpenAITool('macro')}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-colors shadow-xs"
              title="Open AI Companion (DSL Macros, Voice Journal & Sketches)"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">AI Tool</span>
            </button>
          )}

          {/* Standalone HTML Export Button */}
          <button
            onClick={handleExportStandaloneHTML}
            disabled={isExportingHTML}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Export complete standalone single-file HTML sheet to share with friends or host anywhere"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">{isExportingHTML ? 'Packaging...' : 'Export HTML'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition-colors"
            title="Print / PDF Export"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Modular Blueprint Sidebar (Matches user's wireframe) */}
        {!isSidebarCollapsed && (
          <BlueprintSidebar
            layout={layout}
            onUpdateLayout={(updates) => setLayout((prev) => ({ ...prev, ...updates }))}
            character={character}
            onOpenPointBuy={() => setIsPointBuyOpen(true)}
            onOpenDiceRoller={() => setIsDiceOpen(true)}
            onOpenQuickHP={() => setIsQuickHPOpen(true)}
            onOpenBuffBox={() => setIsBuffBoxOpen(true)}
            onOpenConditions={() => setIsConditionsOpen(!isConditionsOpen)}
            onOpenStepper={() => setIsStepperOpen(true)}
            onOpenDeck={() => setIsDeckOpen(true)}
            onOpenXDX={() => setIsXDXOpen(true)}
            onOpenLoadout={() => setIsLoadoutOpen(true)}
            onOpenAddClass={() => setIsAddClassOpen(true)}
            onOpenCMBt={() => setIsCMBtOpen(true)}
            onOpenJournal={handleOpenJournal}
            onOpenAITool={() => handleOpenAITool('macro')}
            onInstallAITool={handleInstallAITool}
            onOpenNewSheet={() => setIsNewSheetOpen(true)}
            onOpenImageBrowser={() =>
              handleOpenImageBrowser({
                targetType: 'profile',
                title: 'Image & File Browser (Portraits, Items, Gallery)',
                subtitle: 'Browse local files from your computer, choose fantasy items/portraits, or link an image.',
                currentUrl: character.profileData?.avatarUrl || character.characterBio?.portraits?.[0],
              })
            }
            onExportStandaloneHTML={handleExportStandaloneHTML}
            onExportJSON={handleExportJSON}
            onImportJSON={handleImportJSON}
            onExportCSV={handleExportCSV}
            onPrint={() => window.print()}
          />
        )}

        {/* Center / Main Canvas Viewport */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-8 transition-colors duration-200 ${getCanvasBgClass()}`}>
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Quick condition debuff notification if active */}
            {isConditionsOpen && (
              <div className="mb-4">
                <SheetPage3SpellsBio
                  character={character}
                  derived={derived}
                  theme={layout.theme}
                  fontClass={getFontClass()}
                  onUpdateCharacter={setCharacter}
                  visibleModules={{ conditions: true }}
                />
              </div>
            )}

            {/* Render Active Pages based on Viewport State */}
            {layout.showAllSheets ? (
              // All 3 Standard Pages Layout (Tablet / Tabletop facing mode)
              <div className="space-y-12">
                <section className="border-b border-black/10 dark:border-white/10 pb-8">
                  <div className="mb-3 flex items-center justify-between text-xs font-mono opacity-60 uppercase font-bold">
                    <span>Page 1: Core Combat & Attributes</span>
                    <span>Myth-Weavers Layout Standard</span>
                  </div>
                  <SheetPage1Core
                    character={character}
                    derived={derived}
                    theme={layout.theme}
                    fontClass={getFontClass()}
                    onUpdateCharacter={setCharacter}
                    onRollFormula={handleRollFormula}
                    visibleModules={layout.visibleModules}
                    onOpenCMBt={() => setIsCMBtOpen(true)}
                    onOpenNewSheet={() => setIsNewSheetOpen(true)}
                    onOpenImageBrowser={handleOpenImageBrowser}
                  />
                </section>

                <section className="border-b border-black/10 dark:border-white/10 pb-8">
                  <div className="mb-3 flex items-center justify-between text-xs font-mono opacity-60 uppercase font-bold">
                    <span>Page 2: Actions & Skills</span>
                    <span>Action Command Center, Resource Pools & Skills Matrix</span>
                  </div>
                  <SheetPage2ActionsSkills
                    character={character}
                    derived={derived}
                    theme={layout.theme}
                    fontClass={getFontClass()}
                    onUpdateCharacter={setCharacter}
                    onRollFormula={handleRollFormula}
                    visibleModules={layout.visibleModules}
                  />
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between text-xs font-mono opacity-60 uppercase font-bold">
                    <span>Page 3: Bio, Storage & Downtime</span>
                    <span>Scratchpad, Narrative, Companions & Storage Equipment Matrix</span>
                  </div>
                  <SheetPage3BioStorage
                    character={character}
                    derived={derived}
                    theme={layout.theme}
                    fontClass={getFontClass()}
                    onUpdateCharacter={setCharacter}
                    onRollFormula={handleRollFormula}
                    visibleModules={layout.visibleModules}
                  />
                </section>
              </div>
            ) : (
              // Single Selected Tab View
              <div>
                {layout.activeSheet === 1 && (
                  <SheetPage1Core
                    character={character}
                    derived={derived}
                    theme={layout.theme}
                    fontClass={getFontClass()}
                    onUpdateCharacter={setCharacter}
                    onRollFormula={handleRollFormula}
                    visibleModules={layout.visibleModules}
                    onOpenCMBt={() => setIsCMBtOpen(true)}
                    onOpenNewSheet={() => setIsNewSheetOpen(true)}
                    onOpenImageBrowser={handleOpenImageBrowser}
                  />
                )}

                {layout.activeSheet === 2 && (
                  <SheetPage2ActionsSkills
                    character={character}
                    derived={derived}
                    theme={layout.theme}
                    fontClass={getFontClass()}
                    onUpdateCharacter={setCharacter}
                    onRollFormula={handleRollFormula}
                    visibleModules={layout.visibleModules}
                  />
                )}

                {layout.activeSheet === 3 && (
                  <SheetPage3BioStorage
                    character={character}
                    derived={derived}
                    theme={layout.theme}
                    fontClass={getFontClass()}
                    onUpdateCharacter={setCharacter}
                    onRollFormula={handleRollFormula}
                    visibleModules={layout.visibleModules}
                  />
                )}

                {layout.activeSheet === 4 && (
                  <SheetPage4FormulaStudio
                    character={character}
                    theme={layout.theme}
                    fontClass={getFontClass()}
                    onUpdateCharacter={setCharacter}
                    onRollFormula={handleRollFormula}
                  />
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Tools & Modals */}
      <DiceRollerTray
        isOpen={isDiceOpen}
        onClose={() => setIsDiceOpen(false)}
        presetFormula={dicePresetFormula}
      />

      <PointBuyModal
        isOpen={isPointBuyOpen}
        onClose={() => setIsPointBuyOpen(false)}
        character={character}
        onApplyBaseScores={handleApplyPointBuy}
      />

      {isQuickHPOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm">
            <QuickHPBar
              character={character}
              hpStatus={derived.hpStatus}
              onClose={() => setIsQuickHPOpen(false)}
              onUpdateHP={(updates) => setCharacter((prev) => ({ ...prev, ...updates }))}
            />
          </div>
        </div>
      )}

      {isBuffBoxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto">
            <BuffBoxModule
              buffBox={character.buffBox}
              customBuffs={character.customBuffs}
              onUpdateBuffBox={(newBox) =>
                setCharacter((prev) => ({ ...prev, buffBox: newBox }))
              }
              onUpdateCustomBuffs={(newBuffs) =>
                setCharacter((prev) => {
                  const itemActiveMap = new Map<string, boolean>();
                  newBuffs.forEach((b) => {
                    if (b.itemId) itemActiveMap.set(b.itemId, b.isActive);
                  });
                  const updatedInventory = (prev.inventory || []).map((item) => {
                    if (itemActiveMap.has(item.id)) {
                      return { ...item, buffActive: itemActiveMap.get(item.id), hasBuff: true };
                    }
                    return item;
                  });
                  return { ...prev, customBuffs: newBuffs, inventory: updatedInventory };
                })
              }
              theme={layout.theme}
              fontClass={getFontClass()}
              isToolModal={true}
              onCloseModal={() => setIsBuffBoxOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Stepper Tool Modal */}
      <StepperTool
        isOpen={isStepperOpen}
        onClose={() => setIsStepperOpen(false)}
        character={character}
        derived={derived}
        onUpdateCharacter={setCharacter}
        theme={layout.theme}
      />

      {/* Deck Simulator Tool Modal */}
      <DeckTool
        isOpen={isDeckOpen}
        onClose={() => setIsDeckOpen(false)}
        character={character}
        onUpdateCharacter={setCharacter}
      />

      {/* XDX Compact Macro Center Tool Modal */}
      <XDXTool
        isOpen={isXDXOpen}
        onClose={() => setIsXDXOpen(false)}
        character={character}
        derived={derived}
        onUpdateCharacter={setCharacter}
      />

      {/* Loadout Sectional Save/Load Modal */}
      <LoadoutModal
        isOpen={isLoadoutOpen}
        onClose={() => setIsLoadoutOpen(false)}
        character={character}
        onUpdateCharacter={setCharacter}
        onExportCSV={handleExportCSV}
        onPrint={() => window.print()}
        theme={layout.theme}
      />

      {/* Add Class Progression Grid & Auto Level-Up Modal */}
      <AddClassModal
        isOpen={isAddClassOpen}
        onClose={() => setIsAddClassOpen(false)}
        character={character}
        onUpdateCharacter={setCharacter}
        theme={layout.theme}
      />

      {/* CMBt - Combat Maneuver & Grapple Track Tool */}
      <CMBTool
        isOpen={isCMBtOpen}
        onClose={() => setIsCMBtOpen(false)}
        character={character}
        derived={derived}
        theme={layout.theme}
        onUpdateCharacter={setCharacter}
        onRollFormula={handleRollFormula}
      />

      {/* Start New Sheet / Clear All Confirmation Modal */}
      <NewSheetModal
        isOpen={isNewSheetOpen}
        onClose={() => setIsNewSheetOpen(false)}
        onConfirmBlank={handleConfirmBlankSheet}
        onConfirmDefault={handleConfirmDefaultSheet}
        onExportBackup={handleExportJSON}
        characterName={character.name}
      />

      {/* Universal Image & File Browser Modal (Portraits, Avatars, Gear Art) */}
      <ImageFileBrowserModal
        isOpen={isImageBrowserOpen}
        onClose={() => setIsImageBrowserOpen(false)}
        targetType={imageBrowserConfig.targetType}
        title={imageBrowserConfig.title}
        subtitle={imageBrowserConfig.subtitle}
        itemName={imageBrowserConfig.itemName}
        currentImageUrl={imageBrowserConfig.currentUrl}
        onSelectImage={handleSelectImageFromBrowser}
        characterExistingImages={[
          character.profileData?.avatarUrl || '',
          ...(character.characterBio?.portraits || []),
          ...(character.inventory || []).map((i) => i.imageUrl || ''),
        ].filter(Boolean)}
      />

      {/* Session Journal & Chronicle Modal */}
      <JournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        character={character}
        onUpdateCharacter={(updater) => setCharacter((prev) => updater(prev))}
        onOpenAITool={(tab) => handleOpenAITool(tab || 'journal')}
        theme={layout.theme}
      />

      {/* Standalone AI Companion Module Modal */}
      <AICompanionModal
        isOpen={isAIToolOpen}
        onClose={() => setIsAIToolOpen(false)}
        character={character}
        onUpdateCharacter={(updater) => setCharacter((prev) => updater(prev))}
        onOpenJournal={() => setIsJournalOpen(true)}
        onNavigateToDSLPage={() => {
          setLayout((prev) => ({ ...prev, activeSheet: 4, showAllSheets: false }));
        }}
        initialTab={aiToolInitialTab}
        theme={layout.theme}
      />

      {/* Macaroni Floating Alert Cards (<TAG"message">) */}
      {floatingAlerts.map((alert) => (
        <FloatingAlertCard
          key={alert.id}
          message={alert.message}
          preset={alert.preset}
          tag={alert.tag}
          onDismiss={() => {
            setFloatingAlerts((prev) => prev.filter((a) => a.id !== alert.id));
          }}
        />
      ))}

      {/* Macaroni Interactive Decision Query Modal (<?>) */}
      {activeQuery && (
        <InteractiveQueryModal
          query={{
            ...activeQuery,
            onSelect: (val) => {
              activeQuery.onSelect(val);
              setActiveQuery(null);
            },
            onCancel: () => {
              activeQuery.onCancel?.();
              setActiveQuery(null);
            },
          }}
        />
      )}
    </div>
  );
}

