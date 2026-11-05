import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Gem,
  Coins,
  Shield,
  Swords,
  Sparkles,
  FlaskConical,
  Wrench,
  CircleDollarSign,
  Dices,
  Edit2,
  Check,
  X,
  ExternalLink,
  Layers,
  Scale,
  FolderPlus,
} from 'lucide-react';
import {
  PF1Character,
  InventoryItem,
  ItemBodySlot,
  QuickInfoDisplayType,
  BuffBonusType,
  BuffStatTarget,
  CustomBuffEffect,
} from '../../types/character';
import { DerivedCombatStats } from '../../engine/pf1eMath';
import { ImageFileBrowserModal } from '../tools/ImageFileBrowserModal';

interface StorageInventoryModuleProps {
  character: PF1Character;
  derived: DerivedCombatStats;
  theme: string;
  fontClass: string;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  onRollFormula?: (formula: string, label?: string) => void;
}

// Category definition with signature color coding (for the rainbow jump bar)
const CATEGORIES: {
  id: string;
  name: string;
  color: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}[] = [
  { id: 'Weapons', name: 'Weapons', color: '#f97316', bgClass: 'bg-orange-500', borderClass: 'border-orange-500', textClass: 'text-orange-400' },
  { id: 'Armor', name: 'Armor & Shields', color: '#06b6d4', bgClass: 'bg-cyan-500', borderClass: 'border-cyan-500', textClass: 'text-cyan-400' },
  { id: 'Magic Items', name: 'Magic & Wondrous', color: '#a855f7', bgClass: 'bg-purple-500', borderClass: 'border-purple-500', textClass: 'text-purple-400' },
  { id: 'Potions/Scrolls', name: 'Potions & Scrolls', color: '#10b981', bgClass: 'bg-emerald-500', borderClass: 'border-emerald-500', textClass: 'text-emerald-400' },
  { id: 'Gear', name: 'Gear & Adventuring', color: '#eab308', bgClass: 'bg-yellow-500', borderClass: 'border-yellow-500', textClass: 'text-yellow-400' },
  { id: 'Valuables', name: 'Treasure & Valuables', color: '#f43f5e', bgClass: 'bg-rose-500', borderClass: 'border-rose-500', textClass: 'text-rose-400' },
];

export const StorageInventoryModule: React.FC<StorageInventoryModuleProps> = ({
  character,
  derived,
  theme,
  fontClass,
  onUpdateCharacter,
  onRollFormula,
}) => {
  // Selected item ID for the bottom inspector (defaults to first item or Ring of lazy draw)
  const [selectedItemId, setSelectedItemId] = useState<string>(() => {
    const lazyRing = (character.inventory || []).find((i) => i.id === 'inv-lazy-ring');
    return lazyRing ? lazyRing.id : (character.inventory?.[0]?.id || '');
  });

  // Active filters - "add all as the default container and bodyslot; multiple bodyslots may be selected at once"
  const [selectedBodySlots, setSelectedBodySlots] = useState<string[]>(['all']);
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedBag, setSelectedBag] = useState<string>('all');

  // Full info edit mode toggle (the red diamond button in wireframe)
  const [isFullInfoMode, setIsFullInfoMode] = useState<boolean>(false);

  // New Bag modal
  const [isAddBagOpen, setIsAddBagOpen] = useState(false);
  const [newBagName, setNewBagName] = useState('');

  // Item Image File Browser
  const [isItemImageBrowserOpen, setIsItemImageBrowserOpen] = useState(false);

  // Styling helpers
  const isParchment = theme === 'parchment';
  const isBlueprint = theme === 'blueprint';
  const isMythWeavers = theme === 'mythweavers';

  // Gender check for body slot silhouette: default male (left image), female if female selected (right image)
  const isFemale = (character.gender || '').toLowerCase().includes('fem');

  const cardBg = isParchment
    ? 'bg-amber-50/80 border-amber-800/30 text-stone-900 shadow-sm'
    : isBlueprint
    ? 'bg-slate-900/95 border-cyan-500/40 text-cyan-50'
    : isMythWeavers
    ? 'bg-[#15171a] border-[#2d3139] text-slate-100'
    : 'bg-white border-black text-black';

  const inputStyle = isParchment
    ? 'bg-white/90 border-amber-900/30 text-stone-900 focus:border-amber-700'
    : isBlueprint
    ? 'bg-slate-950/80 border-cyan-700/60 text-cyan-200 focus:border-cyan-400'
    : isMythWeavers
    ? 'bg-[#0d0e10] border-[#383d47] text-amber-100 focus:border-amber-500'
    : 'bg-white border-neutral-400 text-black';

  const setField = <K extends keyof PF1Character>(key: K, value: PF1Character[K]) => {
    onUpdateCharacter((prev) => ({ ...prev, [key]: value }));
  };

  const inventory = character.inventory || [];
  const droppedBags = character.droppedBags || {};

  // Active selected item
  const selectedItem = useMemo(() => {
    return inventory.find((i) => i.id === selectedItemId) || inventory[0] || null;
  }, [inventory, selectedItemId]);

  // Bags / Containers list
  const availableBags = useMemo(() => {
    const bagSet = new Set<string>();
    bagSet.add('Backpack');
    bagSet.add('Handy Haversack');
    bagSet.add('Belt Pouch');
    bagSet.add('Sheathe');
    inventory.forEach((i) => {
      if (i.location && i.location.trim()) {
        bagSet.add(i.location.trim());
      }
    });
    return Array.from(bagSet);
  }, [inventory]);

  // Body slot multi-select toggler
  const isSlotActive = (slot: string) => {
    if (selectedBodySlots.includes('all')) return slot === 'all';
    return selectedBodySlots.includes(slot);
  };

  const handleToggleBodySlot = (slot: string) => {
    if (slot === 'all') {
      setSelectedBodySlots(['all']);
      return;
    }
    setSelectedBodySlots((prev) => {
      const withoutAll = prev.filter((s) => s !== 'all');
      if (withoutAll.includes(slot)) {
        const next = withoutAll.filter((s) => s !== slot);
        return next.length === 0 ? ['all'] : next;
      } else {
        return [...withoutAll, slot];
      }
    });
  };

  // Inventory filtering by Multiple Body Slots, Category, and Bag
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      // Body slot filter (multiple body slots may be selected at once)
      if (!selectedBodySlots.includes('all')) {
        const itemSlot = item.bodySlot || 'none';
        const matchesAnySlot = selectedBodySlots.some((slot) => {
          if (slot === 'armor') return itemSlot === 'armor' || item.category === 'Armor';
          if (slot === 'shield') return itemSlot === 'shield' || itemSlot === 'weapon2';
          if (slot === 'weapon1') return itemSlot === 'weapon1' || itemSlot === 'weapon2' || item.category === 'Weapons';
          if (slot === 'weapon2') return itemSlot === 'weapon2' || itemSlot === 'shield';
          if (slot === 'ring1' || slot === 'ring2') return itemSlot === 'ring1' || itemSlot === 'ring2';
          if (slot === 'wrists' || slot === 'hands') return itemSlot === 'wrists' || itemSlot === 'hands';
          return itemSlot === slot;
        });
        if (!matchesAnySlot) return false;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        const cat = item.category || 'Gear';
        if (cat.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      // Bag filter
      if (selectedBag !== 'all') {
        const loc = item.location || 'Backpack';
        if (!loc.toLowerCase().includes(selectedBag.toLowerCase())) return false;
      }

      return true;
    });
  }, [inventory, selectedBodySlots, selectedCategory, selectedBag]);

  // Bag dropped toggling: "reducing the characters weight by the sum of items in that container"
  const handleToggleDropBag = (bagName: string, isDropped: boolean) => {
    const key = bagName.trim();
    onUpdateCharacter((prev) => ({
      ...prev,
      droppedBags: {
        ...(prev.droppedBags || {}),
        [key]: isDropped,
      },
    }));
  };

  // Delete bag and contents: "while dropped is checked add a delete option to delete the bag and its contents (warn user before deleting)"
  const handleDeleteBagAndContents = (bagName: string) => {
    const key = bagName.trim();
    const itemsToDelete = inventory.filter(
      (i) => (i.location || '').trim().toLowerCase() === key.toLowerCase()
    );
    const confirmed = window.confirm(
      `Warning: Are you sure you want to permanently delete container "${bagName}" and all ${itemsToDelete.length} item(s) stored inside it? This cannot be undone.`
    );
    if (!confirmed) return;

    onUpdateCharacter((prev) => {
      const nextInv = (prev.inventory || []).filter(
        (i) => (i.location || '').trim().toLowerCase() !== key.toLowerCase()
      );
      const nextDropped = { ...(prev.droppedBags || {}) };
      delete nextDropped[key];
      return {
        ...prev,
        inventory: nextInv,
        droppedBags: nextDropped,
      };
    });
    setSelectedBag('all');
  };

  // Item Buff toggler & bidirectional Buff Box sync
  const handleToggleItemBuff = (item: InventoryItem) => {
    const nextActive = !item.buffActive;
    const bonusType: BuffBonusType = item.buffBonusType || 'Enhancement';
    const targetStat: BuffStatTarget = item.buffTargetStat || 'ac';
    const targetVal = item.buffTargetValue !== undefined ? item.buffTargetValue : (item.buffValues?.[targetStat] ?? 1);

    const fullValues: Record<BuffStatTarget, number> = {
      hp: 0,
      mattack: 0,
      rattack: 0,
      fort: 0,
      ref: 0,
      will: 0,
      ac: 0,
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0,
      str_mod: 0,
      dex_mod: 0,
      con_mod: 0,
      int_mod: 0,
      wis_mod: 0,
      cha_mod: 0,
      ...(item.buffValues || { [targetStat]: targetVal }),
    };

    onUpdateCharacter((prev) => {
      // 1. Update item in inventory
      const nextInventory = (prev.inventory || []).map((i) =>
        i.id === item.id
          ? {
              ...i,
              hasBuff: true,
              buffActive: nextActive,
              buffBonusType: bonusType,
              buffTargetStat: targetStat,
              buffTargetValue: targetVal,
              buffValues: fullValues,
            }
          : i
      );

      // 2. Sync into customBuffs (Buff Box)
      const existingBuffs = prev.customBuffs || [];
      const buffIdx = existingBuffs.findIndex(
        (b) => b.itemId === item.id || b.id === `buff-item-${item.id}`
      );

      let nextBuffs: CustomBuffEffect[];
      if (buffIdx >= 0) {
        nextBuffs = existingBuffs.map((b, idx) =>
          idx === buffIdx
            ? {
                ...b,
                name: `${item.name} (Item)`,
                bonusType,
                isActive: nextActive,
                values: fullValues,
              }
            : b
        );
      } else {
        const newBuff: CustomBuffEffect = {
          id: `buff-item-${item.id}`,
          itemId: item.id,
          name: `${item.name} (Item)`,
          category: 'permanent',
          bonusType,
          isActive: nextActive,
          values: fullValues,
          notes: `Item buff granted by ${item.name}`,
        };
        nextBuffs = [newBuff, ...existingBuffs];
      }

      return {
        ...prev,
        inventory: nextInventory,
        customBuffs: nextBuffs,
      };
    });
  };

  // Item Buff configuration updater
  const handleUpdateItemBuffConfig = (
    itemId: string,
    updates: {
      hasBuff?: boolean;
      buffActive?: boolean;
      buffBonusType?: BuffBonusType;
      buffTargetStat?: BuffStatTarget;
      buffTargetValue?: number;
      buffValues?: Partial<Record<BuffStatTarget, number>>;
    }
  ) => {
    onUpdateCharacter((prev) => {
      let targetItem: InventoryItem | undefined;
      const nextInventory = (prev.inventory || []).map((it) => {
        if (it.id === itemId) {
          targetItem = { ...it, ...updates, hasBuff: true };
          return targetItem;
        }
        return it;
      });

      if (!targetItem) return { ...prev, inventory: nextInventory };

      const item = targetItem;
      const isActive = item.buffActive ?? true;
      const bonusType: BuffBonusType = item.buffBonusType || 'Enhancement';
      const targetStat: BuffStatTarget = item.buffTargetStat || 'ac';
      const targetVal = item.buffTargetValue !== undefined ? item.buffTargetValue : 1;

      const fullValues: Record<BuffStatTarget, number> = {
        hp: 0,
        mattack: 0,
        rattack: 0,
        fort: 0,
        ref: 0,
        will: 0,
        ac: 0,
        str: 0,
        dex: 0,
        con: 0,
        int: 0,
        wis: 0,
        cha: 0,
        str_mod: 0,
        dex_mod: 0,
        con_mod: 0,
        int_mod: 0,
        wis_mod: 0,
        cha_mod: 0,
        ...(item.buffValues || { [targetStat]: targetVal }),
      };

      const existingBuffs = prev.customBuffs || [];
      const buffIdx = existingBuffs.findIndex(
        (b) => b.itemId === item.id || b.id === `buff-item-${item.id}`
      );

      let nextBuffs: CustomBuffEffect[];
      if (buffIdx >= 0) {
        nextBuffs = existingBuffs.map((b, idx) =>
          idx === buffIdx
            ? {
                ...b,
                name: `${item.name} (Item)`,
                bonusType,
                isActive,
                values: fullValues,
              }
            : b
        );
      } else {
        const newBuff: CustomBuffEffect = {
          id: `buff-item-${item.id}`,
          itemId: item.id,
          name: `${item.name} (Item)`,
          category: 'permanent',
          bonusType,
          isActive,
          values: fullValues,
          notes: `Item buff from ${item.name}`,
        };
        nextBuffs = [newBuff, ...existingBuffs];
      }

      return {
        ...prev,
        inventory: nextInventory,
        customBuffs: nextBuffs,
      };
    });
  };

  // Item manipulation helpers
  const handleAddNewItem = () => {
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: 'New Item',
      quantity: 1,
      weight: 1,
      location: selectedBag !== 'all' ? selectedBag : 'Backpack',
      storageType: 'worn',
      category: (selectedCategory !== 'all' ? (selectedCategory as any) : 'Gear'),
      bodySlot: (!selectedBodySlots.includes('all') && selectedBodySlots[0]) ? (selectedBodySlots[0] as ItemBodySlot) : 'none',
      isEquipped: !selectedBodySlots.includes('all'),
      quickInfoMode: 'value',
      valueGp: 10,
      macroBox: '',
      shortDescription: 'Item description and notes...',
    };
    const updated = [...inventory, newItem];
    setField('inventory', updated);
    setSelectedItemId(newItem.id);
  };

  const handleUpdateItem = (id: string, updates: Partial<InventoryItem>) => {
    const updated = inventory.map((i) => (i.id === id ? { ...i, ...updates } : i));
    setField('inventory', updated);
  };

  const handleDeleteItem = (id: string) => {
    const updated = inventory.filter((i) => i.id !== id);
    setField('inventory', updated);
    if (selectedItemId === id && updated.length > 0) {
      setSelectedItemId(updated[0].id);
    }
  };

  // Carrying Capacity and Weight calculations (Official PF1e rules)
  const strScore = derived.strTotal || 10;
  const calculatePf1eLoads = (str: number) => {
    if (str <= 10) {
      const light = Math.round(str * 3.3);
      const med = Math.round(str * 6.6);
      const heavy = str * 10;
      return { light, med, heavy };
    }
    const baseTable: Record<number, [number, number, number]> = {
      11: [38, 76, 115],
      12: [43, 86, 130],
      13: [50, 100, 150],
      14: [58, 116, 175],
      15: [66, 133, 200],
      16: [76, 153, 230],
      17: [86, 173, 260],
      18: [100, 200, 300],
      19: [116, 233, 350],
      20: [133, 266, 400],
      21: [153, 306, 460],
      22: [173, 346, 520],
      23: [200, 400, 600],
      24: [233, 466, 700],
      25: [266, 533, 800],
      26: [306, 613, 920],
      27: [346, 693, 1040],
      28: [400, 800, 1200],
      29: [466, 933, 1400],
    };
    if (baseTable[str]) {
      const [light, med, heavy] = baseTable[str];
      return { light, med, heavy };
    }
    const excess = str - 20;
    const factor = Math.pow(4, Math.floor(excess / 10));
    const remainder = 20 + (excess % 10);
    const [l, m, h] = baseTable[remainder] || [133, 266, 400];
    return { light: l * factor, med: m * factor, heavy: h * factor };
  };

  const loads = useMemo(() => calculatePf1eLoads(strScore), [strScore]);

  // Current Total Load omits items located in containers marked as dropped!
  const currentTotalLoad = useMemo(() => {
    return inventory
      .filter((i) => {
        const bagKey = (i.location || '').trim();
        const isDropped = droppedBags[bagKey] === true;
        return !isDropped && (i.storageType || 'worn') === 'worn';
      })
      .reduce((sum, item) => sum + (item.weight || 0) * (item.quantity || 1), 0);
  }, [inventory, droppedBags]);

  // Selected container specific metrics:
  const selectedBagMetrics = useMemo(() => {
    if (selectedBag === 'all') return { weight: 0, count: 0, isDropped: false };
    const key = selectedBag.trim();
    const itemsInBag = inventory.filter(
      (i) => (i.location || '').trim().toLowerCase() === key.toLowerCase()
    );
    const weight = itemsInBag.reduce(
      (sum, item) => sum + (item.weight || 0) * (item.quantity || 1),
      0
    );
    return {
      weight,
      count: itemsInBag.length,
      isDropped: droppedBags[key] === true,
    };
  }, [inventory, selectedBag, droppedBags]);

  const liftOverHead = loads.heavy; // loh in wireframe = max load
  const pushOrDrag = loads.heavy * 5; // push/drag in wireframe = 5x max load

  // Coinage helpers (4-quadrant: Plat, Gold, Silver, Copper)
  const currency = character.currency || { pp: 0, gp: 0, sp: 0, cp: 0 };
  const updateCurrency = (key: 'pp' | 'gp' | 'sp' | 'cp', val: number) => {
    setField('currency', { ...currency, [key]: Math.max(0, val) });
  };

  const totalValueInGp = useMemo(() => {
    return (
      (currency.pp || 0) * 10 +
      (currency.gp || 0) +
      (currency.sp || 0) * 0.1 +
      (currency.cp || 0) * 0.01
    );
  }, [currency]);

  // Quick info label renderer
  const renderQuickInfoValue = (item: InventoryItem) => {
    const mode = item.quickInfoMode || 'value';
    switch (mode) {
      case 'weight':
        return `${item.weight || 0} lbs`;
      case 'quantity':
        return `x${item.quantity || 1}`;
      case 'level':
        return item.itemLevel ? `CL ${item.itemLevel}` : 'Lvl 1';
      case 'slot':
        return item.bodySlot && item.bodySlot !== 'none' ? item.bodySlot : 'In Bag';
      case 'charges':
        return item.chargesCurrent !== undefined ? `${item.chargesCurrent}/${item.chargesMax || 50}` : 'Full';
      case 'value':
      default:
        return item.valueGp ? `${item.valueGp.toLocaleString()} gp` : '0 gp';
    }
  };

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${cardBg} ${fontClass} space-y-5 shadow-xl`}>
      {/* Module Title & Active Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <Package className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="font-serif font-bold text-base tracking-wide text-amber-300">
              Storage &amp; Equipment Matrix
            </h3>
            <span className="text-xs opacity-70">
              Interactive paper doll slots, color-coded item categories, multi-bag storage &amp; quick info inspector.
            </span>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {(!selectedBodySlots.includes('all') || selectedCategory !== 'all' || selectedBag !== 'all') && (
            <button
              onClick={() => {
                setSelectedBodySlots(['all']);
                setSelectedCategory('all');
                setSelectedBag('all');
              }}
              className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-[10px] flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
          <span className="px-2 py-0.5 rounded bg-black/40 text-amber-300 border border-amber-500/30">
            {filteredInventory.length} / {inventory.length} Items
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOP SECTION: Paper Doll (Left), Color Scrollbar (Mid-Left),               */}
      {/* Bag Switcher & Item List Rows (Right) (Matches Wireframe image_73bd98c0)  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* ========================================================================= */}
        {/* LEFT COMPONENT: Interactive Silhouette Figure + Bag Buttons (md:col-span-4)*/}
        {/* ========================================================================= */}
        <div className="md:col-span-4 flex flex-col items-center p-3 rounded-xl bg-black/10 dark:bg-black/30 border border-black/10 dark:border-white/10 space-y-3">
          <div className="w-full flex items-center justify-between text-[11px] font-mono opacity-80 border-b border-black/10 dark:border-white/10 pb-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-amber-300">Body Slot Selector</span>
              <button
                onClick={() => setField('gender', isFemale ? 'Male' : 'Female')}
                className="text-[9px] px-1.5 py-0.2 rounded bg-black/40 text-cyan-300 hover:text-cyan-200 border border-cyan-700/40"
                title="Toggle Silhouette Gender (Male left, Female right)"
              >
                {isFemale ? '♀ Female' : '♂ Male'}
              </button>
            </div>
            <span className="text-[10px] text-cyan-300">
              {selectedBodySlots.includes('all') ? 'All Slots' : `${selectedBodySlots.length} Selected`}
            </span>
          </div>

          {/* Interactive Silhouette using asset /public/assets/aistudio/image_1f44ffe4.png */}
          {/* Default: Left figure (Male). If female: Right figure (Female) */}
          <div className="relative w-44 h-72 rounded-xl overflow-hidden bg-slate-950/40 border border-black/20 dark:border-white/10 flex items-center justify-center select-none shadow-inner">
            <img
              src="/public/assets/aistudio/image_1f44ffe4.png"
              alt={isFemale ? 'Female Body Silhouette' : 'Male Body Silhouette'}
              className={`absolute h-[112%] max-w-none select-none pointer-events-none transition-all duration-300 ${
                isParchment
                  ? 'mix-blend-multiply opacity-80'
                  : 'invert brightness-90 contrast-200 mix-blend-screen'
              }`}
              style={{
                width: '215%',
                left: isFemale ? '-112%' : '0%',
                top: '-3%',
              }}
            />

            {/* Clickable Interactive Hot-Spot Overlay Zones (Multi-selection enabled) */}
            {/* Head / Hat */}
            <button
              onClick={() => handleToggleBodySlot('head')}
              className={`absolute top-[5%] left-[37%] w-[26%] h-[12%] rounded-full transition-all cursor-pointer ${
                isSlotActive('head')
                  ? 'bg-amber-400/50 border-2 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                  : 'hover:bg-amber-400/25 border border-transparent'
              }`}
              title="Head / Hat / Headband"
            />

            {/* Eyes / Mask */}
            <button
              onClick={() => handleToggleBodySlot('eyes')}
              className={`absolute top-[12%] left-[39%] w-[22%] h-[6%] rounded-sm transition-all cursor-pointer ${
                isSlotActive('eyes')
                  ? 'bg-cyan-400/60 border-2 border-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                  : 'hover:bg-cyan-400/25 border border-transparent'
              }`}
              title="Eyes / Goggles / Mask"
            />

            {/* Neck / Amulet */}
            <button
              onClick={() => handleToggleBodySlot('neck')}
              className={`absolute top-[18%] left-[40%] w-[20%] h-[7%] rounded-sm transition-all cursor-pointer ${
                isSlotActive('neck')
                  ? 'bg-purple-400/60 border-2 border-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
                  : 'hover:bg-purple-400/25 border border-transparent'
              }`}
              title="Neck / Amulet / Periapt"
            />

            {/* Shoulders / Cloak */}
            <button
              onClick={() => handleToggleBodySlot('shoulders')}
              className={`absolute top-[23%] left-[24%] w-[52%] h-[9%] rounded-lg transition-all cursor-pointer ${
                isSlotActive('shoulders')
                  ? 'bg-purple-400/50 border-2 border-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
                  : 'hover:bg-purple-400/20 border border-transparent'
              }`}
              title="Shoulders / Cloak / Pauldrons"
            />

            {/* Armor / Chest / Torso */}
            <button
              onClick={() => handleToggleBodySlot('armor')}
              className={`absolute top-[31%] left-[27%] w-[46%] h-[17%] rounded-lg transition-all cursor-pointer ${
                isSlotActive('armor')
                  ? 'bg-cyan-400/50 border-2 border-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                  : 'hover:bg-cyan-400/20 border border-transparent'
              }`}
              title="Armor / Torso / Body / Robes"
            />

            {/* Belt / Waist */}
            <button
              onClick={() => handleToggleBodySlot('belt')}
              className={`absolute top-[47%] left-[31%] w-[38%] h-[6%] rounded-md transition-all cursor-pointer ${
                isSlotActive('belt')
                  ? 'bg-yellow-400/60 border-2 border-yellow-200 shadow-[0_0_8px_rgba(234,179,8,0.8)]'
                  : 'hover:bg-yellow-400/20 border border-transparent'
              }`}
              title="Belt / Waist"
            />

            {/* Left Wrist / Hand (viewer left) */}
            <button
              onClick={() => handleToggleBodySlot('wrists')}
              className={`absolute top-[51%] left-[13%] w-[16%] h-[18%] rounded-md transition-all cursor-pointer ${
                isSlotActive('wrists') || isSlotActive('hands')
                  ? 'bg-emerald-400/60 border-2 border-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  : 'hover:bg-emerald-400/25 border border-transparent'
              }`}
              title="Wrists / Bracers & Gloves (Left)"
            />

            {/* Right Wrist / Hand / Ring (viewer right) */}
            <button
              onClick={() => handleToggleBodySlot('ring1')}
              className={`absolute top-[51%] left-[71%] w-[16%] h-[18%] rounded-md transition-all cursor-pointer ${
                isSlotActive('ring1') || isSlotActive('ring2')
                  ? 'bg-purple-400/60 border-2 border-white shadow-[0_0_8px_rgba(168,85,247,0.8)]'
                  : 'hover:bg-purple-400/25 border border-transparent'
              }`}
              title="Rings / Gloves / Wrists (Right)"
            />

            {/* Weapon 1 (Held Main Hand) */}
            <button
              onClick={() => handleToggleBodySlot('weapon1')}
              className={`absolute top-[36%] left-[3%] w-[15%] h-[35%] rounded-md transition-all cursor-pointer ${
                isSlotActive('weapon1')
                  ? 'bg-orange-400/60 border-2 border-orange-200 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
                  : 'hover:bg-orange-400/20 border border-transparent'
              }`}
              title="Main Weapon (w1)"
            />

            {/* Shield / Offhand (Held Offhand) */}
            <button
              onClick={() => handleToggleBodySlot('shield')}
              className={`absolute top-[36%] left-[82%] w-[15%] h-[35%] rounded-md transition-all cursor-pointer ${
                isSlotActive('shield')
                  ? 'bg-cyan-400/60 border-2 border-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                  : 'hover:bg-cyan-400/20 border border-transparent'
              }`}
              title="Shield / Offhand Weapon (w2)"
            />

            {/* Feet / Boots */}
            <button
              onClick={() => handleToggleBodySlot('feet')}
              className={`absolute top-[84%] left-[27%] w-[46%] h-[14%] rounded-b-lg transition-all cursor-pointer ${
                isSlotActive('feet')
                  ? 'bg-yellow-400/60 border-2 border-yellow-200 shadow-[0_0_8px_rgba(234,179,8,0.8)]'
                  : 'hover:bg-yellow-400/25 border border-transparent'
              }`}
              title="Feet / Boots of Speed"
            />
          </div>

          {/* Quick Body Slot Toggle Chips (Multi-select) */}
          <div className="w-full flex flex-wrap gap-1 justify-center text-[9px] font-mono">
            <button
              onClick={() => handleToggleBodySlot('all')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                selectedBodySlots.includes('all')
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-black/20 text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            {[
              { id: 'head', label: 'Head' },
              { id: 'eyes', label: 'Eyes' },
              { id: 'neck', label: 'Neck' },
              { id: 'shoulders', label: 'Shoulders' },
              { id: 'armor', label: 'Armor' },
              { id: 'belt', label: 'Belt' },
              { id: 'wrists', label: 'Wrists' },
              { id: 'hands', label: 'Hands' },
              { id: 'ring1', label: 'Rings' },
              { id: 'feet', label: 'Feet' },
              { id: 'weapon1', label: 'w1' },
              { id: 'shield', label: 'w2/Shield' },
            ].map((slot) => {
              const active = isSlotActive(slot.id);
              return (
                <button
                  key={slot.id}
                  onClick={() => handleToggleBodySlot(slot.id)}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    active
                      ? 'bg-amber-400 text-slate-950 font-bold ring-1 ring-amber-300'
                      : 'bg-black/20 text-slate-400 hover:text-white'
                  }`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>

          {/* Bag / Container Switcher Buttons (Matches wireframe [all bags] / [bag 1 v]) */}
          <div className="w-full pt-2 border-t border-black/10 dark:border-white/10 space-y-2 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedBag('all')}
                className={`flex-1 py-1 px-2 rounded text-center transition-colors text-xs ${
                  selectedBag === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-black/20 hover:bg-black/30 text-slate-300'
                }`}
              >
                All Bags
              </button>

              <button
                onClick={() => setIsAddBagOpen(true)}
                className="p-1 rounded bg-black/20 hover:bg-black/30 text-amber-300"
                title="Add new container / bag"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative">
              <select
                value={selectedBag}
                onChange={(e) => setSelectedBag(e.target.value)}
                className={`w-full py-1 px-2 pr-7 rounded border font-mono text-xs appearance-none truncate ${inputStyle}`}
              >
                <option value="all">📁 Container: All Locations</option>
                {availableBags.map((bag) => {
                  const isDropped = droppedBags[bag.trim()] === true;
                  return (
                    <option key={bag} value={bag}>
                      🎒 {bag} {isDropped ? '(Dropped)' : ''}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
            </div>

            {/* DROPPED CONTAINER CONTROLS & DELETE OPTION */}
            {selectedBag !== 'all' && (
              <div className="p-2 rounded-lg bg-black/20 dark:bg-black/40 border border-slate-700/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-amber-300">
                    <input
                      type="checkbox"
                      checked={selectedBagMetrics.isDropped}
                      onChange={(e) => handleToggleDropBag(selectedBag, e.target.checked)}
                      className="rounded text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Dropped (Bag Not Carried)</span>
                  </label>
                  <span className="text-[10px] opacity-75">
                    {selectedBagMetrics.weight} lbs ({selectedBagMetrics.count} items)
                  </span>
                </div>

                {selectedBagMetrics.isDropped ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] text-amber-300/90 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                      ⚠️ Bag dropped: {selectedBagMetrics.weight} lbs subtracted from carried load.
                    </div>
                    <button
                      onClick={() => handleDeleteBagAndContents(selectedBag)}
                      className="w-full py-1 px-2 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/50 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                      title="Permanently delete bag and its contents"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete &quot;{selectedBag}&quot; &amp; All {selectedBagMetrics.count} Items</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-emerald-400/90 flex items-center gap-1">
                    <span>✓ Held by default (included in carried load)</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COMPONENT: Rainbow Category Strip + Item Rows List (md:col-span-8)  */}
        {/* ========================================================================= */}
        <div className="md:col-span-8 flex gap-2.5 items-stretch">
          {/* Rainbow / Color-coded Category Jump Bar (Matches wireframe colored scrollbar) */}
          <div className="w-7 shrink-0 flex flex-col rounded-lg overflow-hidden border border-black/20 dark:border-white/20 select-none shadow-sm">
            {CATEGORIES.map((cat) => {
              const isCatActive = selectedCategory.toLowerCase() === cat.id.toLowerCase();
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(isCatActive ? 'all' : cat.id)}
                  className={`flex-1 w-full transition-transform hover:scale-105 relative group flex items-center justify-center ${cat.bgClass} ${
                    isCatActive ? 'ring-2 ring-white ring-inset' : 'opacity-85 hover:opacity-100'
                  }`}
                  title={`Jump / Filter: ${cat.name}`}
                >
                  <span className="text-[8px] font-black font-mono text-black rotate-90 whitespace-nowrap opacity-75 group-hover:opacity-100">
                    {cat.name.slice(0, 4)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main Item List Card */}
          <div className="flex-1 flex flex-col rounded-xl bg-black/10 dark:bg-black/25 border border-black/10 dark:border-white/10 p-3 space-y-3 min-w-0">
            {/* Top Bar: Items count & "new item" button */}
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-xs uppercase tracking-wider text-amber-300">
                  Inventory Items
                </span>
                {selectedCategory !== 'all' && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-amber-300 border border-amber-500/30">
                    {selectedCategory}
                  </span>
                )}
              </div>

              <button
                onClick={handleAddNewItem}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1 shadow-sm transition-transform active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Item</span>
              </button>
            </div>

            {/* Items Table List */}
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 font-mono text-xs">
              {filteredInventory.map((item) => {
                const isSelected = item.id === selectedItemId;
                // Category color pip
                const catObj = CATEGORIES.find(
                  (c) => c.id.toLowerCase() === (item.category || '').toLowerCase()
                ) || CATEGORIES[4];

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`group p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-amber-500/80 bg-amber-500/15 shadow-sm'
                        : 'border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 hover:border-amber-500/40'
                    }`}
                  >
                    {/* Left: Category color bar + Item Name + Dropdown chevron */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="w-1.5 h-7 rounded-full shrink-0"
                        style={{ backgroundColor: catObj.color }}
                        title={item.category || 'Gear'}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs truncate text-amber-200">
                            {item.name}
                          </span>
                          {item.isEquipped && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/40">
                              Equipped
                            </span>
                          )}
                          {(item.hasBuff || item.buffActive !== undefined || item.category === 'Magic Items') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleItemBuff(item);
                              }}
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold flex items-center gap-1 border transition-all ${
                                item.buffActive
                                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                                  : 'bg-black/30 text-slate-400 border-slate-700 hover:text-white'
                              }`}
                              title="Toggle Item Buff On/Off (syncs with Buff Box)"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{item.buffActive ? 'Buff ON' : 'Buff OFF'}</span>
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] opacity-60 flex items-center gap-1.5 truncate">
                          <span>{item.location || 'Backpack'}</span>
                          {item.bodySlot && item.bodySlot !== 'none' && (
                            <span>• Slot: {item.bodySlot}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Customizable Quick-Info box (Matches wireframe "selected via item dropdown setting quick info") */}
                    <div
                      className="shrink-0 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        value={item.quickInfoMode || 'value'}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            quickInfoMode: e.target.value as QuickInfoDisplayType,
                          })
                        }
                        className={`text-[10px] py-0.5 px-1 rounded border font-mono ${inputStyle}`}
                        title="Change quick-info display metric"
                      >
                        <option value="value">Value</option>
                        <option value="weight">Weight</option>
                        <option value="quantity">Qty</option>
                        <option value="level">Level</option>
                        <option value="slot">Slot</option>
                        <option value="charges">Charges</option>
                      </select>

                      <div className="min-w-[70px] text-right font-bold text-amber-300 text-xs px-1.5 py-0.5 rounded bg-black/30 border border-black/10 dark:border-white/10 truncate">
                        {renderQuickInfoValue(item)}
                      </div>
                    </div>

                    {/* Right: Red X button to delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 p-1 rounded transition-colors shrink-0"
                      title="Delete item (x)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {filteredInventory.length === 0 && (
                <div className="text-center py-10 text-xs opacity-50 font-mono">
                  No items in this view. Click &quot;+ New Item&quot; or select &quot;All Slots&quot; / &quot;All Bags&quot;.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM SECTION: 4-Quadrant Coinage + Load Capacities (Left) AND           */}
      {/* Active Item Inspector & Full Info Editor (Right) (Matches Wireframe)      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-2 border-t border-black/10 dark:border-white/10">
        {/* ========================================================================= */}
        {/* BOTTOM LEFT: 4-Quadrant Coinage + Load/Lift Capacities (md:col-span-5)    */}
        {/* ========================================================================= */}
        <div className="md:col-span-5 space-y-3">
          {/* 4-Quadrant Coinage Box (Plat, Gold, Silver, Copper) */}
          <div className="p-3 rounded-xl bg-black/15 dark:bg-black/35 border border-black/10 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                <span>Coinage &amp; Wealth</span>
              </span>
              <span className="text-[11px] opacity-75">
                Total: <strong className="text-amber-300">{totalValueInGp.toLocaleString()} gp</strong>
              </span>
            </div>

            {/* 4-Quadrant Grid */}
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              {/* Platinum (Top Left) */}
              <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-700/40 flex items-center justify-between">
                <span className="text-indigo-300 font-bold">Plat (pp)</span>
                <input
                  type="number"
                  min="0"
                  value={currency.pp || 0}
                  onChange={(e) => updateCurrency('pp', parseInt(e.target.value, 10) || 0)}
                  className="w-16 text-right px-1.5 py-0.5 rounded bg-black/50 text-indigo-200 border border-indigo-800 font-bold focus:outline-none"
                />
              </div>

              {/* Gold (Top Right) */}
              <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-600/50 flex items-center justify-between">
                <span className="text-amber-300 font-bold">Gold (gp)</span>
                <input
                  type="number"
                  min="0"
                  value={currency.gp || 0}
                  onChange={(e) => updateCurrency('gp', parseInt(e.target.value, 10) || 0)}
                  className="w-20 text-right px-1.5 py-0.5 rounded bg-black/50 text-amber-200 border border-amber-600 font-bold focus:outline-none"
                />
              </div>

              {/* Silver (Bottom Left) */}
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/50 flex items-center justify-between">
                <span className="text-slate-300 font-bold">Silver (sp)</span>
                <input
                  type="number"
                  min="0"
                  value={currency.sp || 0}
                  onChange={(e) => updateCurrency('sp', parseInt(e.target.value, 10) || 0)}
                  className="w-16 text-right px-1.5 py-0.5 rounded bg-black/50 text-slate-200 border border-slate-700 font-bold focus:outline-none"
                />
              </div>

              {/* Copper (Bottom Right) */}
              <div className="p-2 rounded-lg bg-amber-900/30 border border-orange-800/40 flex items-center justify-between">
                <span className="text-orange-300 font-bold">Copper (cp)</span>
                <input
                  type="number"
                  min="0"
                  value={currency.cp || 0}
                  onChange={(e) => updateCurrency('cp', parseInt(e.target.value, 10) || 0)}
                  className="w-16 text-right px-1.5 py-0.5 rounded bg-black/50 text-orange-200 border border-orange-800 font-bold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Carrying Capacity & Load Stats Table (load, min load, max load, loh, push/drag) */}
          <div className="p-3 rounded-xl bg-black/15 dark:bg-black/35 border border-black/10 dark:border-white/10 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                <span>Carrying Capacity (STR {strScore})</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.2 rounded font-bold ${
                  currentTotalLoad <= loads.light
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : currentTotalLoad <= loads.med
                    ? 'bg-amber-950 text-amber-300 border border-amber-700'
                    : 'bg-rose-950 text-rose-300 border border-rose-700'
                }`}
              >
                {currentTotalLoad <= loads.light
                  ? 'Light Load'
                  : currentTotalLoad <= loads.med
                  ? 'Medium Load'
                  : currentTotalLoad <= loads.heavy
                  ? 'Heavy Load'
                  : 'Overburdened'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <div className="flex justify-between border-b border-black/5 dark:border-white/5 py-0.5">
                <span className="opacity-70">load (current):</span>
                <strong className="text-amber-300">{currentTotalLoad} lbs</strong>
              </div>
              <div className="flex justify-between border-b border-black/5 dark:border-white/5 py-0.5">
                <span className="opacity-70">min load (light):</span>
                <span>≤ {loads.light} lbs</span>
              </div>
              <div className="flex justify-between border-b border-black/5 dark:border-white/5 py-0.5">
                <span className="opacity-70">max load (heavy):</span>
                <span>{loads.heavy} lbs</span>
              </div>
              <div className="flex justify-between border-b border-black/5 dark:border-white/5 py-0.5">
                <span className="opacity-70">loh (lift over head):</span>
                <span>{liftOverHead} lbs</span>
              </div>
              <div className="col-span-2 flex justify-between pt-0.5">
                <span className="opacity-70">push / drag (5x max):</span>
                <strong className="text-cyan-300">{pushOrDrag} lbs</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM RIGHT: Active Item Inspector & Full Info Editor (md:col-span-7)     */}
        {/* ========================================================================= */}
        <div className="md:col-span-7 p-3.5 rounded-xl bg-black/15 dark:bg-black/35 border border-black/10 dark:border-white/10 space-y-3">
          {selectedItem ? (
            <div className="space-y-3">
              {/* Header: Title, Category Badge, Picture Frame & Full Info Diamond Toggle */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={selectedItem.name}
                      onChange={(e) => handleUpdateItem(selectedItem.id, { name: e.target.value })}
                      className={`font-serif font-bold text-base text-amber-300 px-2 py-0.5 rounded border ${inputStyle} flex-1`}
                      placeholder="Item name"
                    />
                    {/* Red Diamond Full Info Mode Toggle (Matches Wireframe Red Diamond) */}
                    <button
                      onClick={() => setIsFullInfoMode(!isFullInfoMode)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isFullInfoMode
                          ? 'bg-rose-500 text-white border-rose-300 shadow-sm scale-105'
                          : 'bg-rose-950/60 text-rose-400 border-rose-700/50 hover:bg-rose-900/60'
                      }`}
                      title="Full Info Input Mode: customize weight, hp, hardness, slot, effect"
                    >
                      <Gem className="w-4 h-4 fill-current text-rose-400" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <select
                      value={selectedItem.category || 'Gear'}
                      onChange={(e) =>
                        handleUpdateItem(selectedItem.id, { category: e.target.value as any })
                      }
                      className={`px-2 py-0.5 rounded border text-[11px] ${inputStyle}`}
                    >
                      <option value="Magic Items">Magic Item</option>
                      <option value="Weapons">Weapon</option>
                      <option value="Armor">Armor / Shield</option>
                      <option value="Potions/Scrolls">Potion / Scroll</option>
                      <option value="Gear">Adventuring Gear</option>
                      <option value="Valuables">Valuable / Gem</option>
                    </select>

                    <label className="flex items-center gap-1 cursor-pointer opacity-80 hover:opacity-100">
                      <input
                        type="checkbox"
                        checked={!!selectedItem.isEquipped}
                        onChange={(e) =>
                          handleUpdateItem(selectedItem.id, { isEquipped: e.target.checked })
                        }
                        className="rounded accent-emerald-500 w-3 h-3"
                      />
                      <span>Equipped</span>
                    </label>

                    {selectedItem.bodySlot && selectedItem.bodySlot !== 'none' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {selectedItem.bodySlot}
                      </span>
                    )}
                  </div>
                </div>

                {/* Circular/Square Item Picture Frame (Matches wireframe circle) */}
                <div
                  onClick={() => setIsItemImageBrowserOpen(true)}
                  className="w-16 h-16 rounded-xl border border-black/30 dark:border-white/30 bg-black/40 overflow-hidden flex items-center justify-center shrink-0 relative group cursor-pointer hover:border-amber-400 transition-colors"
                  title="Click to browse local files or pick fantasy item art"
                >
                  {selectedItem.imageUrl ? (
                    <img
                      src={selectedItem.imageUrl}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=200&q=80';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-amber-400/70 p-1 text-center">
                      <Sparkles className="w-5 h-5 mb-0.5" />
                      <span className="text-[8px] font-mono leading-none">Add Pic</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[9px] text-amber-300 font-bold transition-opacity text-center p-1 font-mono">
                    <span>Browse</span>
                    <span>Image</span>
                  </div>
                </div>
              </div>

              {/* Macro Sensitive Box (Matches wireframe: "Ring of lazy draw / makes me lazy / +2>>laziness") */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-amber-400">Macro Sensitive Area / Effect</span>
                  {selectedItem.macroBox && onRollFormula && (
                    <button
                      onClick={() => onRollFormula(selectedItem.macroBox!, selectedItem.name)}
                      className="text-[10px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 font-bold"
                      title="Test roll formula"
                    >
                      <Dices className="w-3 h-3" />
                      <span>Trigger / Roll</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={selectedItem.macroBox || ''}
                  onChange={(e) => handleUpdateItem(selectedItem.id, { macroBox: e.target.value })}
                  placeholder="e.g. makes me lazy\n+2>>laziness or 1d12+STR"
                  className={`w-full p-2 rounded-lg border font-mono text-xs resize-none ${inputStyle}`}
                />
              </div>

              {/* Basic Description */}
              <div>
                <textarea
                  rows={2}
                  value={selectedItem.shortDescription || selectedItem.notes || ''}
                  onChange={(e) =>
                    handleUpdateItem(selectedItem.id, { shortDescription: e.target.value })
                  }
                  placeholder="Short description & notes..."
                  className={`w-full p-2 rounded-lg border font-sans text-xs resize-none ${inputStyle}`}
                />
              </div>

              {/* Item Buff & Status Effect Manager (Synced with Buff Box) */}
              <div className="p-2.5 rounded-lg bg-black/20 dark:bg-black/40 border border-amber-500/30 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-amber-500/20">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Item Buff &amp; Status Effect</span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-amber-300">
                    <input
                      type="checkbox"
                      checked={!!selectedItem.buffActive}
                      onChange={() => handleToggleItemBuff(selectedItem)}
                      className="rounded text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Buff Active ({selectedItem.buffActive ? 'ON' : 'OFF'})</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="opacity-70 block text-[10px]">Bonus Type</span>
                    <select
                      value={selectedItem.buffBonusType || 'Enhancement'}
                      onChange={(e) =>
                        handleUpdateItemBuffConfig(selectedItem.id, {
                          buffBonusType: e.target.value as BuffBonusType,
                        })
                      }
                      className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
                    >
                      {[
                        'Enhancement',
                        'Circumstance',
                        'Competence',
                        'Deflection',
                        'Dodge',
                        'Insight',
                        'Item',
                        'Inherent',
                        'Luck',
                        'Morale',
                        'Pro/Sac',
                        'Race',
                        'NAT armor',
                        'Armor',
                        'Shield',
                        'Untyped',
                        'Size',
                      ].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="opacity-70 block text-[10px]">Target Stat</span>
                    <select
                      value={selectedItem.buffTargetStat || 'ac'}
                      onChange={(e) =>
                        handleUpdateItemBuffConfig(selectedItem.id, {
                          buffTargetStat: e.target.value as BuffStatTarget,
                        })
                      }
                      className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
                    >
                      <option value="ac">Armor Class (AC)</option>
                      <option value="str">Strength (STR)</option>
                      <option value="dex">Dexterity (DEX)</option>
                      <option value="con">Constitution (CON)</option>
                      <option value="int">Intelligence (INT)</option>
                      <option value="wis">Wisdom (WIS)</option>
                      <option value="cha">Charisma (CHA)</option>
                      <option value="mattack">Melee Attack</option>
                      <option value="rattack">Ranged Attack</option>
                      <option value="fort">Fortitude Save</option>
                      <option value="ref">Reflex Save</option>
                      <option value="will">Will Save</option>
                      <option value="hp">Hit Points (HP)</option>
                    </select>
                  </div>

                  <div>
                    <span className="opacity-70 block text-[10px]">Bonus Amount (+/-)</span>
                    <input
                      type="number"
                      value={selectedItem.buffTargetValue ?? 1}
                      onChange={(e) =>
                        handleUpdateItemBuffConfig(selectedItem.id, {
                          buffTargetValue: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className={`w-full px-2 py-0.5 rounded border text-xs font-bold text-amber-300 ${inputStyle}`}
                    />
                  </div>
                </div>

                {/* Quick Preset Buff Buttons */}
                <div className="flex flex-wrap gap-1 pt-1 text-[10px]">
                  <span className="opacity-60 text-[9px] py-0.5">Presets:</span>
                  {[
                    { label: '+2 STR', stat: 'str', val: 2, type: 'Enhancement' },
                    { label: '+2 DEX', stat: 'dex', val: 2, type: 'Enhancement' },
                    { label: '+2 CON', stat: 'con', val: 2, type: 'Enhancement' },
                    { label: '+1 AC (Deflection)', stat: 'ac', val: 1, type: 'Deflection' },
                    { label: '+2 AC (Armor)', stat: 'ac', val: 2, type: 'Armor' },
                    { label: '+1 Saves', stat: 'ref', val: 1, type: 'Untyped' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() =>
                        handleUpdateItemBuffConfig(selectedItem.id, {
                          buffBonusType: preset.type as BuffBonusType,
                          buffTargetStat: preset.stat as BuffStatTarget,
                          buffTargetValue: preset.val,
                          buffActive: true,
                        })
                      }
                      className="px-1.5 py-0.5 rounded bg-black/30 hover:bg-amber-500/20 text-slate-300 hover:text-amber-200 border border-slate-700 hover:border-amber-500/40 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-amber-300/70 pt-0.5">
                  ⚡ Synced with Buff Box: Toggling this item buff turns it on/off in the Buff Box and recalculates all sheet totals.
                </p>
              </div>

              {/* FULL INFO INPUT MODE (Toggled via the Red Diamond gem button in wireframe) */}
              {isFullInfoMode && (
                <div className="p-3 rounded-lg bg-black/25 dark:bg-black/45 border border-rose-500/40 space-y-3 font-mono text-xs animate-fadeIn">
                  <div className="flex items-center justify-between pb-1 border-b border-rose-500/30 text-rose-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Gem className="w-3.5 h-3.5 fill-current" />
                      <span>Full Info Item Customizer</span>
                    </span>
                    <span className="text-[10px] opacity-70">PF1e Mechanics</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="opacity-70 block text-[10px]">Weight (lbs)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedItem.weight || 0}
                        onChange={(e) =>
                          handleUpdateItem(selectedItem.id, {
                            weight: parseFloat(e.target.value) || 0,
                          })
                        }
                        className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <span className="opacity-70 block text-[10px]">Value (gp)</span>
                      <input
                        type="number"
                        value={selectedItem.valueGp || 0}
                        onChange={(e) =>
                          handleUpdateItem(selectedItem.id, {
                            valueGp: parseFloat(e.target.value) || 0,
                          })
                        }
                        className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <span className="opacity-70 block text-[10px]">Quantity</span>
                      <input
                        type="number"
                        min="1"
                        value={selectedItem.quantity || 1}
                        onChange={(e) =>
                          handleUpdateItem(selectedItem.id, {
                            quantity: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="opacity-70 block text-[10px]">Body Slot</span>
                      <select
                        value={selectedItem.bodySlot || 'none'}
                        onChange={(e) =>
                          handleUpdateItem(selectedItem.id, {
                            bodySlot: e.target.value as ItemBodySlot,
                            isEquipped: e.target.value !== 'none',
                          })
                        }
                        className={`w-full px-1.5 py-0.5 rounded border text-[11px] ${inputStyle}`}
                      >
                        <option value="none">None / In Bag</option>
                        <option value="head">Head / Hat</option>
                        <option value="eyes">Eyes / Goggles</option>
                        <option value="neck">Neck / Amulet</option>
                        <option value="shoulders">Shoulders / Cloak</option>
                        <option value="chest">Chest / Shirt</option>
                        <option value="armor">Armor / Body</option>
                        <option value="belt">Belt / Waist</option>
                        <option value="wrists">Wrists / Bracers</option>
                        <option value="hands">Hands / Gloves</option>
                        <option value="ring1">Ring 1</option>
                        <option value="ring2">Ring 2</option>
                        <option value="feet">Feet / Boots</option>
                        <option value="weapon1">Main Weapon (w1)</option>
                        <option value="weapon2">Offhand Weapon (w2)</option>
                        <option value="shield">Shield</option>
                        <option value="slotless">Slotless</option>
                      </select>
                    </div>

                    <div>
                      <span className="opacity-70 block text-[10px]">Bag / Location</span>
                      <input
                        type="text"
                        value={selectedItem.location || ''}
                        onChange={(e) =>
                          handleUpdateItem(selectedItem.id, { location: e.target.value })
                        }
                        placeholder="e.g. Backpack"
                        className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
                      />
                    </div>

                    <div>
                      <span className="opacity-70 block text-[10px]">Charges (Cur/Max)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={selectedItem.chargesCurrent ?? ''}
                          onChange={(e) =>
                            handleUpdateItem(selectedItem.id, {
                              chargesCurrent: parseInt(e.target.value, 10) || undefined,
                            })
                          }
                          placeholder="32"
                          className={`w-1/2 px-1 py-0.5 rounded border text-xs text-center ${inputStyle}`}
                        />
                        <span>/</span>
                        <input
                          type="number"
                          value={selectedItem.chargesMax ?? ''}
                          onChange={(e) =>
                            handleUpdateItem(selectedItem.id, {
                              chargesMax: parseInt(e.target.value, 10) || undefined,
                            })
                          }
                          placeholder="50"
                          className={`w-1/2 px-1 py-0.5 rounded border text-xs text-center ${inputStyle}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="opacity-70 block text-[10px]">HP (Durability)</span>
                      <input
                        type="number"
                        value={selectedItem.hp ?? ''}
                        onChange={(e) =>
                          handleUpdateItem(selectedItem.id, {
                            hp: parseInt(e.target.value, 10) || undefined,
                          })
                        }
                        placeholder="e.g. 40"
                        className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <span className="opacity-70 block text-[10px]">Hardness</span>
                      <input
                        type="number"
                        value={selectedItem.hardness ?? ''}
                        onChange={(e) =>
                          handleUpdateItem(selectedItem.id, {
                            hardness: parseInt(e.target.value, 10) || undefined,
                          })
                        }
                        placeholder="e.g. 10"
                        className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <span className="opacity-70 block text-[10px]">Mechanical Effect</span>
                      <input
                        type="text"
                        value={selectedItem.effect || ''}
                        onChange={(e) =>
                          handleUpdateItem(selectedItem.id, { effect: e.target.value })
                        }
                        placeholder="+2 to initiative"
                        className={`w-full px-2 py-0.5 rounded border text-xs ${inputStyle}`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-xs opacity-50 font-mono">
              Select an item from the list above to inspect details and edit parameters.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Add New Bag / Container                                            */}
      {/* ========================================================================= */}
      {isAddBagOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl ${cardBg}`}>
            <div className="flex items-center justify-between border-b pb-2 border-black/10 dark:border-white/10">
              <h3 className="font-serif font-bold text-sm text-amber-400">Add New Bag / Storage</h3>
              <button
                onClick={() => setIsAddBagOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold opacity-80">Container Name</label>
              <input
                type="text"
                value={newBagName}
                onChange={(e) => setNewBagName(e.target.value)}
                placeholder="e.g. Bag of Holding, Saddlebags, Belt Pouch 2"
                className={`w-full px-3 py-1.5 rounded border ${inputStyle}`}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
              <button
                onClick={() => setIsAddBagOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newBagName.trim()) {
                    setSelectedBag(newBagName.trim());
                    setNewBagName('');
                    setIsAddBagOpen(false);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Add Container
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Image File Browser Modal */}
      {selectedItem && (
        <ImageFileBrowserModal
          isOpen={isItemImageBrowserOpen}
          onClose={() => setIsItemImageBrowserOpen(false)}
          targetType="item"
          itemName={selectedItem.name}
          title={`Choose Image for ${selectedItem.name}`}
          subtitle="Browse local image files from disk, select from fantasy weapons/armor/gear presets, or paste a URL."
          currentImageUrl={selectedItem.imageUrl}
          onSelectImage={(url) => {
            handleUpdateItem(selectedItem.id, { imageUrl: url });
          }}
          characterExistingImages={character.inventory
            ?.map((i) => i.imageUrl || '')
            .filter((url) => Boolean(url))}
        />
      )}
    </div>
  );
};
