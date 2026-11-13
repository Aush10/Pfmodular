import React, { useState, useRef } from 'react';
import {
  User,
  Image as ImageIcon,
  Upload,
  Trash2,
  Plus,
  Link as LinkIcon,
  Sparkles,
  FolderOpen,
} from 'lucide-react';
import { PF1Character, ProfileCustomField } from '../../types/character';
import { ImageFileBrowserModal } from '../tools/ImageFileBrowserModal';

interface ProfileModuleProps {
  character: PF1Character;
  theme: string;
  fontClass: string;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
}

export const ProfileModule: React.FC<ProfileModuleProps> = ({
  character,
  theme,
  fontClass,
  onUpdateCharacter,
}) => {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [isFileBrowserOpen, setIsFileBrowserOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const headerBg = isParchment
    ? 'bg-amber-900/10 border-amber-900/20 text-amber-950 font-serif'
    : isBlueprint
    ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300 font-mono'
    : isMythWeavers
    ? 'bg-[#0f1113] border-[#2d3139] text-amber-400 font-serif'
    : 'bg-neutral-100 border-black text-black font-sans';

  const inputStyle = isParchment
    ? 'bg-white/80 border-amber-900/30 text-stone-900 focus:border-amber-700 focus:bg-white'
    : isBlueprint
    ? 'bg-slate-950/80 border-cyan-700/60 text-cyan-200 focus:border-cyan-400'
    : isMythWeavers
    ? 'bg-[#0d0e10] border-[#383d47] text-amber-100 focus:border-amber-500'
    : 'bg-white border-neutral-400 text-black';

  const profileData = character.profileData || {
    avatarUrl: '',
    customFields: [
      { id: 'f-1', title: 'Physical Appearance & Attire', content: 'Tall and armored with draconic motifs.' },
      { id: 'f-2', title: 'Backstory & Bloodline', content: 'Awakened draconic bloodline during the crusade.' },
      { id: 'f-3', title: 'Deity & Code of Conduct', content: 'Devoted to Sarenrae, dawn and redemption.' },
    ],
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      onUpdateCharacter((prev) => ({
        ...prev,
        profileData: {
          ...(prev.profileData || profileData),
          avatarUrl: base64,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!tempUrl.trim()) return;
    onUpdateCharacter((prev) => ({
      ...prev,
      profileData: {
        ...(prev.profileData || profileData),
        avatarUrl: tempUrl.trim(),
      },
    }));
    setTempUrl('');
    setShowUrlInput(false);
  };

  const handleRemoveAvatar = () => {
    onUpdateCharacter((prev) => ({
      ...prev,
      profileData: {
        ...(prev.profileData || profileData),
        avatarUrl: '',
      },
    }));
  };

  const handleAddField = () => {
    const newField: ProfileCustomField = {
      id: `field-${Date.now()}`,
      title: 'New Titled Section',
      content: '',
    };
    onUpdateCharacter((prev) => ({
      ...prev,
      profileData: {
        ...(prev.profileData || profileData),
        customFields: [...(prev.profileData?.customFields || profileData.customFields), newField],
      },
    }));
  };

  const handleUpdateField = (id: string, updates: Partial<ProfileCustomField>) => {
    onUpdateCharacter((prev) => ({
      ...prev,
      profileData: {
        ...(prev.profileData || profileData),
        customFields: (prev.profileData?.customFields || profileData.customFields).map((f) =>
          f.id === id ? { ...f, ...updates } : f
        ),
      },
    }));
  };

  const handleDeleteField = (id: string) => {
    onUpdateCharacter((prev) => ({
      ...prev,
      profileData: {
        ...(prev.profileData || profileData),
        customFields: (prev.profileData?.customFields || profileData.customFields).filter((f) => f.id !== id),
      },
    }));
  };

  return (
    <div className={`rounded-lg border overflow-hidden ${cardBg} ${fontClass}`}>
      {/* Header */}
      <div className={`px-3 py-2 border-b flex items-center justify-between ${headerBg}`}>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-400" />
          <span className="font-bold uppercase text-xs tracking-wider">
            Character Profile & Portrait
          </span>
        </div>
        <button
          onClick={handleAddField}
          className="text-xs px-2 py-0.5 rounded border border-cyan-500/40 hover:bg-cyan-500/20 text-cyan-300 font-mono flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add Titled Block</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Top Split: Portrait Image + Quick Identity Overview */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          {/* Avatar Picture Area */}
          <div className="md:col-span-4 flex flex-col items-center">
            <div
              className={`w-44 h-56 rounded-lg border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group transition-all ${
                profileData.avatarUrl
                  ? 'border-cyan-500/50 bg-slate-950'
                  : 'border-slate-700 bg-slate-950/40 hover:border-cyan-400'
              }`}
            >
              {profileData.avatarUrl ? (
                <>
                  <img
                    src={profileData.avatarUrl}
                    alt={character.name}
                    className="w-full h-full object-cover object-top cursor-pointer"
                    onClick={() => setIsFileBrowserOpen(true)}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity p-2">
                    <button
                      onClick={() => setIsFileBrowserOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold shadow-md flex items-center gap-1.5"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>File Browser</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono"
                    >
                      Quick Upload
                    </button>
                    <button
                      onClick={handleRemoveAvatar}
                      className="px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-500 text-white text-[11px] font-mono"
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <div
                  onClick={() => setIsFileBrowserOpen(true)}
                  className="cursor-pointer text-center p-3 flex flex-col items-center gap-1.5"
                >
                  <div className="p-3 rounded-full bg-slate-900 border border-slate-700 text-cyan-400 group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">
                    Open File Browser
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Upload from disk or choose fantasy portrait
                  </span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFile}
              className="hidden"
            />

            {/* Quick Actions Bar */}
            <div className="w-full mt-2.5 flex items-center justify-center gap-2">
              <button
                onClick={() => setIsFileBrowserOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-semibold flex items-center gap-1 transition-colors"
                title="Browse local disk or fantasy gallery"
              >
                <FolderOpen className="w-3 h-3 text-cyan-400" />
                <span>Browse Files</span>
              </button>
              {!showUrlInput ? (
                <button
                  onClick={() => setShowUrlInput(true)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 hover:underline font-mono inline-flex items-center gap-1"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>URL</span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="url"
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    placeholder="https://..."
                    className={`flex-1 px-2 py-1 rounded text-xs font-mono ${inputStyle}`}
                  />
                  <button
                    onClick={handleApplyUrl}
                    className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-mono font-bold"
                  >
                    Set
                  </button>
                  <button
                    onClick={() => setShowUrlInput(false)}
                    className="p-1 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Header Identity Details (Read/Write) */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-[10px] uppercase font-mono opacity-60">Character Name</label>
              <input
                type="text"
                value={character.name}
                onChange={(e) => onUpdateCharacter((prev) => ({ ...prev, name: e.target.value }))}
                className={`w-full px-2 py-1.5 rounded font-semibold ${inputStyle}`}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-mono opacity-60">Player</label>
              <input
                type="text"
                value={character.player}
                onChange={(e) => onUpdateCharacter((prev) => ({ ...prev, player: e.target.value }))}
                className={`w-full px-2 py-1.5 rounded ${inputStyle}`}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-mono opacity-60">Alignment</label>
              <input
                type="text"
                value={character.alignment}
                onChange={(e) => onUpdateCharacter((prev) => ({ ...prev, alignment: e.target.value }))}
                className={`w-full px-2 py-1.5 rounded ${inputStyle}`}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-mono opacity-60">Race / Heritage</label>
              <input
                type="text"
                value={character.race}
                onChange={(e) => onUpdateCharacter((prev) => ({ ...prev, race: e.target.value }))}
                className={`w-full px-2 py-1.5 rounded ${inputStyle}`}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-mono opacity-60">Deity / Faith</label>
              <input
                type="text"
                value={character.deity}
                onChange={(e) => onUpdateCharacter((prev) => ({ ...prev, deity: e.target.value }))}
                className={`w-full px-2 py-1.5 rounded ${inputStyle}`}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-mono opacity-60">Campaign / Setting</label>
              <input
                type="text"
                value={character.campaign}
                onChange={(e) => onUpdateCharacter((prev) => ({ ...prev, campaign: e.target.value }))}
                className={`w-full px-2 py-1.5 rounded ${inputStyle}`}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-mono opacity-60">Age / Gender</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={character.age}
                  onChange={(e) => onUpdateCharacter((prev) => ({ ...prev, age: parseInt(e.target.value, 10) || 0 }))}
                  className={`w-14 px-1.5 py-1.5 rounded ${inputStyle}`}
                />
                <input
                  type="text"
                  value={character.gender}
                  onChange={(e) => onUpdateCharacter((prev) => ({ ...prev, gender: e.target.value }))}
                  className={`flex-1 px-1.5 py-1.5 rounded ${inputStyle}`}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-mono opacity-60">Height / Weight</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={character.height}
                  onChange={(e) => onUpdateCharacter((prev) => ({ ...prev, height: e.target.value }))}
                  className={`w-1/2 px-1.5 py-1.5 rounded ${inputStyle}`}
                />
                <input
                  type="text"
                  value={character.weight}
                  onChange={(e) => onUpdateCharacter((prev) => ({ ...prev, weight: e.target.value }))}
                  className={`w-1/2 px-1.5 py-1.5 rounded ${inputStyle}`}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-mono opacity-60">Eyes / Hair</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={character.eyes}
                  onChange={(e) => onUpdateCharacter((prev) => ({ ...prev, eyes: e.target.value }))}
                  className={`w-1/2 px-1.5 py-1.5 rounded ${inputStyle}`}
                />
                <input
                  type="text"
                  value={character.hair}
                  onChange={(e) => onUpdateCharacter((prev) => ({ ...prev, hair: e.target.value }))}
                  className={`w-1/2 px-1.5 py-1.5 rounded ${inputStyle}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Customizable Titled Text Blocks */}
        <div className="space-y-3 pt-2 border-t border-slate-800/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-300 uppercase">
              Titled Background & Narrative Blocks ({profileData.customFields.length})
            </span>
          </div>

          <div className="space-y-3">
            {profileData.customFields.map((field) => (
              <div
                key={field.id}
                className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/40 space-y-2 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={field.title}
                    onChange={(e) => handleUpdateField(field.id, { title: e.target.value })}
                    className={`font-semibold text-xs px-2 py-1 rounded max-w-xs ${inputStyle}`}
                    placeholder="Block Title..."
                  />
                  <button
                    onClick={() => handleDeleteField(field.id)}
                    className="p-1 rounded opacity-60 hover:opacity-100 hover:bg-rose-900/40 text-rose-400 transition-all"
                    title="Delete block"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  value={field.content}
                  onChange={(e) => handleUpdateField(field.id, { content: e.target.value })}
                  placeholder="Enter details, description, backstory, or notes..."
                  rows={3}
                  className={`w-full p-2 rounded text-xs leading-relaxed resize-y ${inputStyle}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unified Image File Browser Modal for Profile Avatar */}
      <ImageFileBrowserModal
        isOpen={isFileBrowserOpen}
        onClose={() => setIsFileBrowserOpen(false)}
        targetType="profile"
        title="Choose Character Profile Picture"
        subtitle="Select from local disk, curated fantasy adventurer portraits, or enter an image link."
        currentImageUrl={profileData.avatarUrl}
        onSelectImage={(url) => {
          onUpdateCharacter((prev) => ({
            ...prev,
            profileData: {
              ...(prev.profileData || profileData),
              avatarUrl: url,
            },
          }));
        }}
        characterExistingImages={character.characterBio?.portraits || []}
      />
    </div>
  );
};
