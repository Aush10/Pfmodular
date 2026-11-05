export type GlyphStyle = '01-flat-enamel' | '02-beveled-token' | '03-arcane-stamp' | 'none';

export type GlyphId =
  | 'blue-sword'
  | 'green-plus'
  | 'grey-skull'
  | 'orange-rabbit'
  | 'red-shield'
  | 'violet-crosshair'
  | 'yellow-halo';

export interface GlyphDefinition {
  id: GlyphId;
  name: string;
  category: 'Attack' | 'Defense' | 'Magic' | 'Utility' | 'Combat';
  filename: string;
}

export const GLYPH_STYLE_OPTIONS: { id: GlyphStyle; label: string }[] = [
  { id: '01-flat-enamel', label: 'Flat Enamel' },
  { id: '02-beveled-token', label: 'Beveled Token' },
  { id: '03-arcane-stamp', label: 'Arcane Stamp' },
  { id: 'none', label: 'None' },
];

export const GLYPH_DEFINITIONS: GlyphDefinition[] = [
  { id: 'blue-sword', name: 'Blue Sword', category: 'Attack', filename: 'blue-sword.png' },
  { id: 'red-shield', name: 'Red Shield', category: 'Defense', filename: 'red-shield.png' },
  { id: 'violet-crosshair', name: 'Violet Crosshair', category: 'Combat', filename: 'violet-crosshair.png' },
  { id: 'yellow-halo', name: 'Yellow Halo', category: 'Magic', filename: 'yellow-halo.png' },
  { id: 'green-plus', name: 'Green Plus', category: 'Utility', filename: 'green-plus.png' },
  { id: 'orange-rabbit', name: 'Orange Rabbit', category: 'Utility', filename: 'orange-rabbit.png' },
  { id: 'grey-skull', name: 'Grey Skull', category: 'Combat', filename: 'grey-skull.png' },
];

export interface GenericPortraitDefinition {
  id: string;
  name: string;
  category: string;
  url: string;
}

export const GENERIC_PORTRAITS: GenericPortraitDefinition[] = [
  {
    id: 'generic-knight',
    name: 'Knight Portrait',
    category: 'Portraits',
    url: '/character-sheet-icons/04-generic-portraits/generic-knight.png',
  },
  {
    id: 'generic-mage',
    name: 'Mage Portrait',
    category: 'Portraits',
    url: '/character-sheet-icons/04-generic-portraits/generic-mage.png',
  },
  {
    id: 'generic-monk',
    name: 'Monk Portrait',
    category: 'Portraits',
    url: '/character-sheet-icons/04-generic-portraits/generic-monk.png',
  },
  {
    id: 'generic-monster',
    name: 'Monster Portrait',
    category: 'Portraits',
    url: '/character-sheet-icons/04-generic-portraits/generic-monster.png',
  },
];

/**
 * Extracts a canonical GlyphId if the given string is a glyph ID or a glyph path.
 */
export function extractGlyphId(value?: string | null): GlyphId | null {
  if (!value) return null;
  const trimmed = value.trim();
  for (const def of GLYPH_DEFINITIONS) {
    if (trimmed === def.id || trimmed.endsWith(`/${def.filename}`) || trimmed === def.filename) {
      return def.id;
    }
  }
  return null;
}

export function isGlyphId(value?: string | null): boolean {
  return extractGlyphId(value) !== null;
}

/**
 * Returns the URL for a specific glyph ID in the given style.
 * If style is 'none', returns null unless fallbackStyle is provided.
 */
export function getGlyphUrl(
  glyphId: GlyphId,
  style: GlyphStyle = '01-flat-enamel',
  fallbackStyle?: Exclude<GlyphStyle, 'none'>
): string | null {
  const effectiveStyle = style === 'none' ? fallbackStyle : style;
  if (!effectiveStyle) return null;
  return `/character-sheet-icons/${effectiveStyle}/${glyphId}.png`;
}

/**
 * Resolves either a glyph ID, a glyph URL from any set, or a custom image URL
 * into a displayable URL based on the current active GlyphStyle.
 * If it is a glyph and activeStyle === 'none', returns null so the item renders without a glyph.
 */
export function resolveIconOrGlyphUrl(
  value?: string | null,
  activeStyle: GlyphStyle = '01-flat-enamel'
): string | null {
  if (!value) return null;
  const glyphId = extractGlyphId(value);
  if (glyphId) {
    if (activeStyle === 'none') return null;
    return `/character-sheet-icons/${activeStyle}/${glyphId}.png`;
  }
  return value;
}
