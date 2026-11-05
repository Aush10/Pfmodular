import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  FolderOpen,
  Sparkles,
  Link as LinkIcon,
  X,
  Check,
  Trash2,
  Package,
  User,
  Search,
  Crop,
  ZoomIn,
  RotateCw,
  FlipHorizontal,
  RotateCcw,
  Move,
} from 'lucide-react';

export interface ImageFileBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  targetType: 'profile' | 'portrait' | 'item';
  itemName?: string;
  currentImageUrl?: string;
  onSelectImage: (imageUrl: string) => void;
  characterExistingImages?: string[];
}

const STORAGE_LIBRARY_KEY = 'pf1e_image_library_v1';

type AspectPreset = '1:1' | '3:4' | '4:3' | 'circle';
type FrameStyle = 'none' | 'gold_ring' | 'dark_iron' | 'parchment_vignette';

// Curated fantasy portraits & items for Pathfinder 1e
const FANTASY_PRESETS = {
  portraits: [
    {
      id: 'p-1',
      name: 'Valerius (Dragon Crusader)',
      category: 'Warrior',
      url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'p-2',
      name: 'Dragonfire Pyromancer',
      category: 'Mage',
      url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'p-3',
      name: 'Elven Silver Ranger',
      category: 'Ranger',
      url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'p-4',
      name: 'Dwarven Iron Defender',
      category: 'Warrior',
      url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'p-5',
      name: 'Shadow Scout Rogue',
      category: 'Rogue',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'p-6',
      name: 'Cleric of the Dawn Sun',
      category: 'Cleric',
      url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'p-7',
      name: 'Tiefling Blood Sorcerer',
      category: 'Mage',
      url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'p-8',
      name: 'Druid of the Deep Wild',
      category: 'Druid',
      url: 'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'p-9',
      name: 'Armored Knight Marshal',
      category: 'Paladin',
      url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'p-10',
      name: 'Arcane Astrologer',
      category: 'Wizard',
      url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
    },
  ],
  weapons: [
    {
      id: 'w-1',
      name: '+1 Flaming Greataxe',
      category: 'Axe',
      url: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'w-2',
      name: 'Masterwork Steel Longsword',
      category: 'Sword',
      url: 'https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'w-3',
      name: 'Composite Longbow',
      category: 'Bow',
      url: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'w-4',
      name: 'Vorpal Greatsword',
      category: 'Sword',
      url: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'w-5',
      name: 'Rune Dagger',
      category: 'Dagger',
      url: 'https://images.unsplash.com/photo-1615671524827-c1fe3973b648?auto=format&fit=crop&w=400&q=80',
    },
  ],
  armor: [
    {
      id: 'a-1',
      name: 'Mithral Heavy Shield / Bullet',
      category: 'Shield',
      url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'a-2',
      name: 'Plasteel / Mithral Full Plate',
      category: 'Armor',
      url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'a-3',
      name: 'Engraved Tower Shield',
      category: 'Shield',
      url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'a-4',
      name: 'Hardened Dragonhide Armor',
      category: 'Armor',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
    },
  ],
  magicItems: [
    {
      id: 'm-1',
      name: 'Ring of Protection / Lazy Draw',
      category: 'Ring',
      url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'm-2',
      name: 'Headband of Alluring Charisma',
      category: 'Headband',
      url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'm-3',
      name: 'Cloak of Resistance +2',
      category: 'Cloak',
      url: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'm-4',
      name: 'Belt of Giant Strength +2',
      category: 'Belt',
      url: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'm-5',
      name: 'Boots of Speed',
      category: 'Boots',
      url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'm-6',
      name: 'Handy Haversack Backpack',
      category: 'Bag',
      url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'm-7',
      name: 'Amulet of Natural Armor',
      category: 'Amulet',
      url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'm-8',
      name: 'Ioun Stone (Dusty Rose Prism)',
      category: 'Ioun',
      url: 'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?auto=format&fit=crop&w=400&q=80',
    },
  ],
  potionsAndGear: [
    {
      id: 'g-1',
      name: 'Potion of Cure Serious Wounds',
      category: 'Potion',
      url: 'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'g-2',
      name: 'Elixir of Dragon Breath',
      category: 'Potion',
      url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'g-3',
      name: 'Enchanted Arcane Scroll',
      category: 'Scroll',
      url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'g-4',
      name: 'Cut Fire Ruby (500 gp)',
      category: 'Gem',
      url: 'https://images.unsplash.com/photo-1600003014755-ba31aa59c4b6?auto=format&fit=crop&w=400&q=80',
    },
  ],
};

export const ImageFileBrowserModal: React.FC<ImageFileBrowserProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  targetType,
  itemName,
  currentImageUrl = '',
  onSelectImage,
  characterExistingImages = [],
}) => {
  // Navigation tabs: 'upload' | 'presets' | 'library' | 'url' | 'crop'
  const [activeTab, setActiveTab] = useState<'upload' | 'presets' | 'library' | 'url' | 'crop'>(
    'upload'
  );

  // Selected image candidate
  const [selectedUrl, setSelectedUrl] = useState<string>(currentImageUrl);
  const [urlInput, setUrlInput] = useState<string>(currentImageUrl);

  // Local preset subcategory filter
  const [presetCategory, setPresetCategory] = useState<
    'all' | 'portraits' | 'weapons' | 'armor' | 'magic' | 'gear'
  >(targetType === 'item' ? 'all' : 'portraits');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File metadata for uploaded preview
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{
    name: string;
    sizeKb: number;
    dimensions?: string;
  } | null>(null);

  // Micro Image Cropper & Staging Studio state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>(
    targetType === 'profile' ? 'circle' : targetType === 'portrait' ? '3:4' : '1:1'
  );
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('none');
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  const [flipX, setFlipX] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; origX: number; origY: number }>({
    x: 0,
    y: 0,
    origX: 0,
    origY: 0,
  });
  const [cropSavedNotice, setCropSavedNotice] = useState(false);

  // Stored image library
  const [library, setLibrary] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LIBRARY_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });

  // Sync selectedUrl when modal opens with new currentImageUrl
  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentImageUrl || '');
      setUrlInput(currentImageUrl || '');
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setRotation(0);
      setFlipX(false);
    }
  }, [isOpen, currentImageUrl]);

  // Combine library with characterExistingImages
  const allLibraryImages = Array.from(
    new Set([
      ...library,
      ...characterExistingImages.filter((img) => img && img.trim().length > 0),
    ])
  );

  const saveToLibrary = (dataUrl: string) => {
    if (!dataUrl || dataUrl.trim().length === 0) return;
    setLibrary((prev) => {
      const next = [dataUrl, ...prev.filter((item) => item !== dataUrl)].slice(0, 30);
      try {
        localStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify(next));
      } catch {
        // storage quota
      }
      return next;
    });
  };

  const removeFromLibrary = (urlToRemove: string) => {
    setLibrary((prev) => {
      const next = prev.filter((item) => item !== urlToRemove);
      try {
        localStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify(next));
      } catch {
        // storage quota
      }
      return next;
    });
  };

  // Get canvas dimensions for the active aspect ratio
  const getStageDimensions = useCallback(() => {
    if (aspectPreset === '3:4') return { width: 300, height: 400 };
    if (aspectPreset === '4:3') return { width: 400, height: 300 };
    return { width: 360, height: 360 };
  }, [aspectPreset]);

  // Redraw staging canvas whenever image or transform changes
  const drawStagingCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getStageDimensions();
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Background checkerboard / dark slate
    ctx.fillStyle = '#090d14';
    ctx.fillRect(0, 0, width, height);

    ctx.save();

    // Apply circular clip if circle token preset
    if (aspectPreset === 'circle') {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - 4, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.translate(width / 2 + panX, height / 2 + panY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipX ? -zoom : zoom, zoom);

      // Cover scale by default
      const baseScale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      const drawW = img.naturalWidth * baseScale;
      const drawH = img.naturalHeight * baseScale;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.fillStyle = '#475569';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Select an image to crop & stage', width / 2, height / 2);
    }

    ctx.restore();

    // Draw Tabletop Frame Overlay
    if (frameStyle !== 'none') {
      ctx.save();
      if (aspectPreset === 'circle') {
        const radius = Math.min(width, height) / 2 - 6;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
        if (frameStyle === 'gold_ring') {
          ctx.lineWidth = 8;
          ctx.strokeStyle = '#d97706';
          ctx.stroke();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#fef08a';
          ctx.stroke();
        } else if (frameStyle === 'dark_iron') {
          ctx.lineWidth = 10;
          ctx.strokeStyle = '#334155';
          ctx.stroke();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#94a3b8';
          ctx.stroke();
        } else if (frameStyle === 'parchment_vignette') {
          const grad = ctx.createRadialGradient(
            width / 2,
            height / 2,
            radius * 0.65,
            width / 2,
            height / 2,
            radius
          );
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(69, 26, 3, 0.72)');
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#78350f';
          ctx.stroke();
        }
      } else {
        if (frameStyle === 'gold_ring') {
          ctx.lineWidth = 10;
          ctx.strokeStyle = '#d97706';
          ctx.strokeRect(5, 5, width - 10, height - 10);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#fef08a';
          ctx.strokeRect(10, 10, width - 20, height - 20);
        } else if (frameStyle === 'dark_iron') {
          ctx.lineWidth = 12;
          ctx.strokeStyle = '#1e293b';
          ctx.strokeRect(6, 6, width - 12, height - 12);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#64748b';
          ctx.strokeRect(12, 12, width - 24, height - 24);
        } else if (frameStyle === 'parchment_vignette') {
          const grad = ctx.createRadialGradient(
            width / 2,
            height / 2,
            Math.min(width, height) * 0.3,
            width / 2,
            height / 2,
            Math.max(width, height) * 0.7
          );
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(69, 26, 3, 0.72)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
          ctx.lineWidth = 6;
          ctx.strokeStyle = '#78350f';
          ctx.strokeRect(3, 3, width - 6, height - 6);
        }
      }
      ctx.restore();
    }
  }, [aspectPreset, frameStyle, zoom, panX, panY, rotation, flipX, getStageDimensions]);

  // Load selectedUrl into HTMLImageElement for canvas staging
  useEffect(() => {
    if (!selectedUrl) {
      loadedImageRef.current = null;
      drawStagingCanvas();
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      drawStagingCanvas();
    };
    img.onerror = () => {
      // Fallback without crossOrigin if server blocks anonymous CORS headers
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        loadedImageRef.current = fallbackImg;
        drawStagingCanvas();
      };
      fallbackImg.src = selectedUrl;
    };
    img.src = selectedUrl;
  }, [selectedUrl, drawStagingCanvas]);

  useEffect(() => {
    if (activeTab === 'crop') {
      drawStagingCanvas();
    }
  }, [activeTab, drawStagingCanvas]);

  const handleBakeCrop = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return selectedUrl;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setSelectedUrl(dataUrl);
      saveToLibrary(dataUrl);
      setCropSavedNotice(true);
      setTimeout(() => setCropSavedNotice(false), 2500);
      return dataUrl;
    } catch {
      return selectedUrl;
    }
  };

  // Handle file reading from input or drag-and-drop
  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setSelectedUrl(result);
        setUrlInput('');

        const img = new Image();
        img.onload = () => {
          setUploadedFileMeta({
            name: file.name,
            sizeKb: Math.round(file.size / 1024),
            dimensions: `${img.naturalWidth} × ${img.naturalHeight}px`,
          });
        };
        img.src = result;

        saveToLibrary(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleApply = () => {
    const finalUrl = activeTab === 'crop' ? handleBakeCrop() : selectedUrl;
    onSelectImage(finalUrl);
    if (finalUrl) saveToLibrary(finalUrl);
    onClose();
  };

  const handleClear = () => {
    setSelectedUrl('');
    setUrlInput('');
    onSelectImage('');
    onClose();
  };

  if (!isOpen) return null;

  const getFilteredPresets = () => {
    let list: Array<{ id: string; name: string; category: string; url: string }> = [];

    if (presetCategory === 'all') {
      if (targetType === 'item') {
        list = [
          ...FANTASY_PRESETS.weapons,
          ...FANTASY_PRESETS.armor,
          ...FANTASY_PRESETS.magicItems,
          ...FANTASY_PRESETS.potionsAndGear,
        ];
      } else {
        list = [...FANTASY_PRESETS.portraits];
      }
    } else if (presetCategory === 'portraits') {
      list = FANTASY_PRESETS.portraits;
    } else if (presetCategory === 'weapons') {
      list = FANTASY_PRESETS.weapons;
    } else if (presetCategory === 'armor') {
      list = FANTASY_PRESETS.armor;
    } else if (presetCategory === 'magic') {
      list = FANTASY_PRESETS.magicItems;
    } else if (presetCategory === 'gear') {
      list = FANTASY_PRESETS.potionsAndGear;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
      );
    }

    return list;
  };

  const presetsToDisplay = getFilteredPresets();

  const modalHeaderTitle =
    title ||
    (targetType === 'profile'
      ? 'Character Profile Picture & Token Studio'
      : targetType === 'portrait'
      ? 'Character Portrait Browser & Cropper'
      : `Item Image Browser: ${itemName || 'Gear'}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              {targetType === 'item' ? (
                <Package className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-serif flex items-center gap-2">
                <span>{modalHeaderTitle}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {subtitle ||
                  'Upload local art, pick fantasy presets, or use the built-in Crop & Stage Studio for custom tokens and portraits.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 pb-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'upload'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Browse File</span>
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'presets'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preset Gallery</span>
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'library'
                  ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Library ({allLibraryImages.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'url'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Direct URL</span>
            </button>
            <button
              onClick={() => setActiveTab('crop')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'crop'
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 shadow-xs'
                  : 'text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/20'
              }`}
            >
              <Crop className="w-3.5 h-3.5" />
              <span>Crop &amp; Stage Studio</span>
            </button>
          </div>

          {selectedUrl && (
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <button
                onClick={() => setActiveTab('crop')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold flex items-center gap-1"
              >
                <Crop className="w-3 h-3" />
                <span>Crop / Frame</span>
              </button>
              <div className="w-7 h-7 rounded-md overflow-hidden border border-cyan-500/50 bg-black/60 shrink-0">
                <img src={selectedUrl} alt="Selected" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: BROWSE LOCAL FILES (UPLOAD) */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/40 scale-[0.99]'
                    : 'border-slate-700 bg-slate-950/50 hover:border-cyan-500/60 hover:bg-slate-950/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileProcess(f);
                  }}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
                  <Upload className="w-7 h-7" />
                </div>

                <h3 className="font-bold text-slate-200 text-sm mb-1">
                  Click to browse or drag &amp; drop an image here
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  PNG, JPG, WebP, GIF, or SVG from your computer. After uploading, click{' '}
                  <strong className="text-amber-300">Crop &amp; Stage Studio</strong> to pan, zoom, and frame it!
                </p>

                <div className="mt-4 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono">
                  Browse My Computer
                </div>
              </div>

              {selectedUrl && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-4 flex-wrap">
                  <div
                    className={`overflow-hidden border border-cyan-500/40 bg-black/60 shrink-0 ${
                      targetType === 'profile' ? 'w-20 h-20 rounded-full' : 'w-20 h-20 rounded-xl'
                    }`}
                  >
                    <img src={selectedUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-xs text-cyan-300 truncate font-mono">
                        {uploadedFileMeta?.name || 'Selected Image Source'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                        Ready
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                      {uploadedFileMeta?.dimensions && (
                        <div>Dimensions: {uploadedFileMeta.dimensions}</div>
                      )}
                      {uploadedFileMeta?.sizeKb && <div>File Size: {uploadedFileMeta.sizeKb} KB</div>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('crop')}
                      className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Crop className="w-4 h-4" />
                      <span>Open in Crop &amp; Stage Studio</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUrl('');
                        setUploadedFileMeta(null);
                      }}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                      title="Remove preview"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PRESET FANTASY GALLERY */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                  {[
                    { id: 'all', label: 'All Presets' },
                    { id: 'portraits', label: 'Portraits' },
                    { id: 'weapons', label: 'Weapons' },
                    { id: 'armor', label: 'Armor' },
                    { id: 'magic', label: 'Magic Items' },
                    { id: 'gear', label: 'Potions & Gems' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setPresetCategory(cat.id as any)}
                      className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
                        presetCategory === cat.id
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="relative shrink-0 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search presets..."
                    className="w-full pl-8 pr-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {presetsToDisplay.map((item) => {
                  const isSelected = selectedUrl === item.url;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedUrl(item.url);
                        setUrlInput(item.url);
                      }}
                      className={`group relative rounded-xl overflow-hidden border p-1.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/40 shadow-lg scale-102'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/60 relative">
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="pt-1.5 px-0.5">
                        <div className="font-semibold text-xs text-slate-200 truncate group-hover:text-amber-300">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                          <span>{item.category}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: WORKSPACE LIBRARY & RECENTS */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Showing all images uploaded, cropped, or linked in this workspace:</span>
                {allLibraryImages.length > 0 && (
                  <span className="font-mono text-cyan-400">
                    {allLibraryImages.length} image{allLibraryImages.length > 1 ? 's' : ''} stored
                  </span>
                )}
              </div>

              {allLibraryImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {allLibraryImages.map((imgUrl, idx) => {
                    const isSelected = selectedUrl === imgUrl;
                    return (
                      <div
                        key={idx}
                        className={`group relative rounded-xl overflow-hidden border p-1.5 transition-all ${
                          isSelected
                            ? 'border-purple-400 bg-purple-500/10 ring-2 ring-purple-400/40 shadow-lg scale-102'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        <div
                          onClick={() => {
                            setSelectedUrl(imgUrl);
                            setUrlInput(imgUrl);
                          }}
                          className="w-full aspect-square rounded-lg overflow-hidden bg-black/60 relative cursor-pointer"
                        >
                          <img
                            src={imgUrl}
                            alt={`Library item ${idx}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-md">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div className="pt-1.5 flex items-center justify-between gap-1 text-[10px] font-mono text-slate-400">
                          <span className="truncate">
                            {imgUrl.startsWith('data:') ? 'Staged / Upload' : 'Web Asset'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromLibrary(imgUrl);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove from recents"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <FolderOpen className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-xs text-slate-400">
                    No images saved in your workspace library yet.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIRECT URL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
                  Paste Direct Web Image URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      setSelectedUrl(e.target.value);
                    }}
                    placeholder="https://example.com/character-portrait.png"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => {
                      if (urlInput.trim()) {
                        setSelectedUrl(urlInput.trim());
                        saveToLibrary(urlInput.trim());
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono font-semibold transition-colors shrink-0"
                  >
                    Test &amp; Preview
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MICRO IMAGE CROPPER & STAGING STUDIO */}
          {activeTab === 'crop' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Left: Interactive Canvas Viewport (7 Cols) */}
              <div className="md:col-span-7 flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between w-full text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <Move className="w-3.5 h-3.5" />
                    <span>Drag canvas to pan • Use controls to zoom &amp; frame</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                    {aspectPreset.toUpperCase()}
                  </span>
                </div>

                <div
                  className="relative rounded-xl overflow-hidden border-2 border-cyan-500/40 shadow-2xl cursor-move bg-[#090d14]"
                  onMouseDown={(e) => {
                    setIsPanning(true);
                    panStartRef.current = {
                      x: e.clientX,
                      y: e.clientY,
                      origX: panX,
                      origY: panY,
                    };
                  }}
                  onMouseMove={(e) => {
                    if (!isPanning) return;
                    const dx = e.clientX - panStartRef.current.x;
                    const dy = e.clientY - panStartRef.current.y;
                    setPanX(panStartRef.current.origX + dx);
                    setPanY(panStartRef.current.origY + dy);
                  }}
                  onMouseUp={() => setIsPanning(false)}
                  onMouseLeave={() => setIsPanning(false)}
                >
                  <canvas ref={canvasRef} className="block max-w-full h-auto" />
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span>
                    Pan: ({Math.round(panX)}, {Math.round(panY)})
                  </span>
                  <span>•</span>
                  <span>Zoom: {Math.round(zoom * 100)}%</span>
                  <span>•</span>
                  <span>Rot: {rotation}°</span>
                </div>
              </div>

              {/* Right: Staging Controls (5 Cols) */}
              <div className="md:col-span-5 space-y-4 bg-slate-950/90 p-4 rounded-2xl border border-slate-800 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Crop className="w-4 h-4" />
                    <span>Portrait &amp; Token Staging</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setPanX(0);
                      setPanY(0);
                      setRotation(0);
                      setFlipX(false);
                      setFrameStyle('none');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Aspect Ratio Presets */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase block">
                    1. Aspect Ratio / Token Shape
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: '1:1', label: '1:1 Square' },
                      { id: '3:4', label: '3:4 Portrait' },
                      { id: '4:3', label: '4:3 Landscape' },
                      { id: 'circle', label: 'Circle Token' },
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAspectPreset(preset.id as AspectPreset)}
                        className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                          aspectPreset === preset.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zoom Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase">
                    <span className="flex items-center gap-1">
                      <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                      <span>2. Zoom Scale</span>
                    </span>
                    <span className="text-cyan-300 font-bold">{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Rotate & Flip */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase block">
                    3. Orientation &amp; Mirroring
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Rotate 90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlipX((f) => !f)}
                      className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1.5 ${
                        flipX
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5 text-amber-400" />
                      <span>Flip Horizontal</span>
                    </button>
                  </div>
                </div>

                {/* Tabletop Border Frame */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase block">
                    4. Tabletop Border Frame
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'none', label: 'No Frame' },
                      { id: 'gold_ring', label: 'Gold Ring' },
                      { id: 'dark_iron', label: 'Dark Iron' },
                      { id: 'parchment_vignette', label: 'Parchment Vignette' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFrameStyle(f.id as FrameStyle)}
                        className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                          frameStyle === f.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bake to Library Button */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <button
                    type="button"
                    onClick={handleBakeCrop}
                    disabled={!selectedUrl}
                    className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Stage &amp; Save Crop to Library</span>
                  </button>
                  {cropSavedNotice && (
                    <div className="text-[11px] text-emerald-400 text-center">
                      ✓ Staged image saved! Click &ldquo;Apply Image&rdquo; below to use it.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div>
            {currentImageUrl && (
              <button
                onClick={handleClear}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Current Picture</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedUrl}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 text-xs font-bold font-mono flex items-center gap-1.5 shadow-lg transition-all"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{activeTab === 'crop' ? 'Bake Crop & Apply Image' : 'Apply Image'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
