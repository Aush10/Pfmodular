import React, { useState } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Check,
  Trash2,
  ExternalLink,
  Shield,
  Swords,
  Crosshair,
  Crown,
  Heart,
  Flame,
  Zap,
} from 'lucide-react';

export interface ImageBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  currentImageUrl?: string;
  onSelectImage: (imageUrl: string) => void;
  type?: 'item' | 'profile';
}

interface ImagePreset {
  id: string;
  name: string;
  category: 'token' | 'weapon' | 'armor' | 'magic' | 'character';
  url: string;
}

const PRESET_IMAGES: ImagePreset[] = [
  // Applet silhouette asset
  {
    id: 'p-silhouette',
    name: 'Body Silhouette (Dual)',
    category: 'character',
    url: '/assets/aistudio/image_1f44ffe4.png',
  },
  // Character portraits (Curated high-res fantasy tokens)
  {
    id: 'p-valerius',
    name: 'Dragon Knight (Valerius)',
    category: 'character',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-mage',
    name: 'Arcane Wizard / Mage',
    category: 'character',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-rogue',
    name: 'Shadow Rogue / Scout',
    category: 'character',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-cleric',
    name: 'Holy Cleric / Paladin',
    category: 'character',
    url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-barbarian',
    name: 'Raging Berserker',
    category: 'character',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80',
  },
  // Equipment & Item Icons
  {
    id: 'p-ring-lazy',
    name: 'Ring of Lazy Draw',
    category: 'magic',
    url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-flame-axe',
    name: '+1 Flaming Greataxe',
    category: 'weapon',
    url: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-shield',
    name: 'Mithral Heavy Shield',
    category: 'armor',
    url: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-full-plate',
    name: 'Full Plate Armor',
    category: 'armor',
    url: 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-haversack',
    name: 'Handy Haversack / Bag',
    category: 'magic',
    url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-potion-cure',
    name: 'Healing Elixir / Potion',
    category: 'magic',
    url: 'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-wand',
    name: 'Wand of Mage Armor',
    category: 'magic',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-bow',
    name: 'Composite Longbow',
    category: 'weapon',
    url: 'https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-gems',
    name: 'Gemstones & Treasure',
    category: 'magic',
    url: 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=400&q=80',
  },
];

export const ImageBrowserModal: React.FC<ImageBrowserModalProps> = ({
  isOpen,
  onClose,
  title = 'Image Browser & Selector',
  currentImageUrl = '',
  onSelectImage,
  type = 'item',
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [urlInput, setUrlInput] = useState<string>(currentImageUrl);
  const [previewUrl, setPreviewUrl] = useState<string>(currentImageUrl);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [uploadError, setUploadError] = useState<string>('');

  if (!isOpen) return null;

  // Handle local file upload via FileReader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, GIF, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPreviewUrl(dataUrl);
        setUrlInput(dataUrl);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleApply = (urlToApply: string) => {
    onSelectImage(urlToApply);
    onClose();
  };

  const handleClear = () => {
    onSelectImage('');
    onClose();
  };

  const filteredPresets = PRESET_IMAGES.filter((p) => {
    if (filterCategory === 'all') return true;
    return p.category === filterCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-amber-300">{title}</h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Choose from bundled presets, upload a local file, or paste an image URL.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            {[
              { id: 'presets', label: 'Preset Gallery' },
              { id: 'upload', label: 'Upload Local File' },
              { id: 'url', label: 'Web Image URL' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-t-lg border-t border-x transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-900 border-slate-700 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {currentImageUrl && (
            <button
              onClick={handleClear}
              className="text-[11px] font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 pb-1"
              title="Remove existing picture"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Current Pic</span>
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              {/* Category Filters */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
                {['all', 'character', 'weapon', 'armor', 'magic'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2.5 py-1 rounded-full border capitalize text-[11px] transition-colors ${
                      filterCategory === cat
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid of Presets */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {filteredPresets.map((preset) => {
                  const isSelected = previewUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setPreviewUrl(preset.url);
                        setUrlInput(preset.url);
                      }}
                      className={`group relative rounded-xl overflow-hidden border p-1 text-left flex flex-col transition-all hover:scale-102 ${
                        isSelected
                          ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-500/15'
                          : 'border-slate-700 bg-slate-950/60 hover:border-slate-500'
                      }`}
                    >
                      <div className="aspect-square w-full rounded-lg bg-black/50 overflow-hidden relative">
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=200&q=80';
                          }}
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 p-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-sans font-medium text-slate-300 truncate mt-1.5 block">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD LOCAL FILE */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-8 text-center flex flex-col items-center justify-center transition-colors bg-slate-950/40">
                <div className="p-3 rounded-full bg-amber-500/15 text-amber-400 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-200">
                  Select an image from your computer
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans">
                  Files are loaded locally into the browser memory and saved directly with your character sheet.
                </p>

                <label className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs cursor-pointer shadow-md transition-transform active:scale-95 inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Choose Local File...</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {uploadError && (
                  <p className="text-xs text-rose-400 mt-2 font-mono">{uploadError}</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: WEB IMAGE URL */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <label className="block text-xs font-mono font-bold text-slate-300">
                Paste Direct Image Link (HTTPS):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setPreviewUrl(e.target.value);
                  }}
                  placeholder="https://example.com/item_icon.png"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                />
                <button
                  onClick={() => setPreviewUrl(urlInput.trim())}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-colors"
                >
                  Load Preview
                </button>
              </div>
            </div>
          )}

          {/* Active Preview Box */}
          {previewUrl && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-700 bg-black/60 shrink-0">
                  <img
                    src={previewUrl}
                    alt="Active Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=200&q=80';
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-mono font-bold text-amber-400 block">
                    Selected Image Preview
                  </span>
                  <span className="text-xs text-slate-300 font-mono truncate block max-w-sm">
                    {previewUrl.startsWith('data:') ? 'Local file (Base64 data URL)' : previewUrl}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleApply(previewUrl)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-md transition-transform active:scale-95 shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Use</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 text-[11px]">
            Supports local tokens, transparent PNGs, and web assets.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            {previewUrl && (
              <button
                onClick={() => handleApply(previewUrl)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-xs transition-colors"
              >
                Apply Image
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
