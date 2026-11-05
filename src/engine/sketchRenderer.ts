/**
 * Procedural Graphite & Pencil Sketch Generator for Pathfinder 1e Journal
 * Generates authentic hand-drawn graphite/pencil sketches on parchment paper
 * with four distinct detail levels: crude, passible, tasteful, astounding.
 */

import { SketchDetailQuality } from '../types/character';

export interface SketchOptions {
  subject: string;
  quality: SketchDetailQuality;
  width?: number;
  height?: number;
  tint?: 'graphite' | 'charcoal' | 'sepia';
}

/**
 * Procedurally generates a pencil sketch illustration based on prompt keywords and detail quality.
 * Returns a high-res base64 PNG data URL.
 */
export function generateProceduralPencilSketch(options: SketchOptions): string {
  const width = options.width || 480;
  const height = options.height || 360;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const { quality, subject, tint = 'graphite' } = options;

  // 1. Parchment base paper
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  if (tint === 'sepia') {
    bgGrad.addColorStop(0, '#f5edd6');
    bgGrad.addColorStop(0.5, '#ede1c4');
    bgGrad.addColorStop(1, '#e3d4b1');
  } else {
    bgGrad.addColorStop(0, '#f8f6f0');
    bgGrad.addColorStop(0.5, '#f1ede4');
    bgGrad.addColorStop(1, '#e8e2d5');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Paper grain noise
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 14;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  // Setup pencil styling
  const pencilColor =
    tint === 'sepia'
      ? 'rgba(78, 52, 34, '
      : tint === 'charcoal'
      ? 'rgba(28, 28, 30, '
      : 'rgba(45, 48, 55, ';

  // Quality parameters
  const qualityParams: Record<
    SketchDetailQuality,
    { strokes: number; hatches: number; lineJitter: number; alphaMin: number; alphaMax: number; label: string }
  > = {
    crude: { strokes: 45, hatches: 60, lineJitter: 5.5, alphaMin: 0.25, alphaMax: 0.65, label: 'Crude Field Sketch' },
    passible: { strokes: 110, hatches: 180, lineJitter: 3.2, alphaMin: 0.2, alphaMax: 0.75, label: 'Passible Log Sketch' },
    tasteful: { strokes: 260, hatches: 420, lineJitter: 1.8, alphaMin: 0.15, alphaMax: 0.85, label: 'Tasteful Study' },
    astounding: { strokes: 600, hatches: 950, lineJitter: 0.9, alphaMin: 0.1, alphaMax: 0.92, label: 'Astounding Masterwork' },
  };

  const p = qualityParams[quality] || qualityParams.passible;

  // Derive pseudo-random seed from subject string
  let seed = 0;
  for (let i = 0; i < subject.length; i++) {
    seed = (seed * 31 + subject.charCodeAt(i)) & 0xffffffff;
  }
  const random = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 4294967296;
  };

  // 3. Vignette border or sketchbook framing
  ctx.save();
  ctx.strokeStyle = `${pencilColor}0.35)`;
  ctx.lineWidth = 1.2;
  const pad = 16;
  ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);
  if (quality === 'tasteful' || quality === 'astounding') {
    ctx.strokeStyle = `${pencilColor}0.18)`;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(pad + 3, pad + 3, width - pad * 2 - 6, height - pad * 2 - 6);
  }
  ctx.restore();

  // 4. Draw subject-inspired geometry (silhouette, contours, cross-hatching)
  const cx = width / 2;
  const cy = height / 2 - 10;
  const rx = Math.min(width, height) * 0.34;
  const ry = Math.min(width, height) * 0.32;

  // Determine motif from subject
  const lowerSub = subject.toLowerCase();
  const isCreature = /dragon|monster|goblin|beast|orc|demon|wolf|ghoul|undead|fiend|horse/i.test(lowerSub);
  const isLandscape = /ruin|castle|tower|dungeon|mountain|forest|shrine|temple|tomb|cavern|city/i.test(lowerSub);
  const isItem = /sword|shield|armor|potion|ring|staff|bow|dagger|amulet|helmet|relic/i.test(lowerSub);

  ctx.save();

  // Draw main structural silhouette with pencil cross-hatching
  const drawPencilLine = (x1: number, y1: number, x2: number, y2: number, alpha: number, widthScale: number = 1) => {
    ctx.beginPath();
    ctx.strokeStyle = `${pencilColor}${alpha})`;
    ctx.lineWidth = (0.6 + random() * 1.4) * widthScale;
    ctx.lineCap = 'round';

    const segments = 4;
    let currX = x1;
    let currY = y1;
    ctx.moveTo(currX, currY);

    for (let s = 1; s <= segments; s++) {
      const t = s / segments;
      const targetX = x1 + (x2 - x1) * t;
      const targetY = y1 + (y2 - y1) * t;
      const jitterX = (random() - 0.5) * p.lineJitter;
      const jitterY = (random() - 0.5) * p.lineJitter;
      ctx.lineTo(targetX + jitterX, targetY + jitterY);
    }
    ctx.stroke();
  };

  // Crosshatching shadow fields
  for (let h = 0; h < p.hatches; h++) {
    const angle = 0.55 + (random() - 0.5) * 0.3; // standard ~30-45 degree hatching
    const length = 20 + random() * (quality === 'astounding' ? 65 : 45);
    const originX = cx + (random() - 0.5) * rx * 1.6;
    const originY = cy + (random() - 0.5) * ry * 1.5;

    const endX = originX + Math.cos(angle) * length;
    const endY = originY + Math.sin(angle) * length;
    const alpha = p.alphaMin + random() * (p.alphaMax - p.alphaMin) * 0.6;
    drawPencilLine(originX, originY, endX, endY, alpha, 0.7);

    // Cross hatch (secondary angle) for higher qualities
    if ((quality === 'tasteful' || quality === 'astounding') && random() > 0.4) {
      const crossAngle = angle + 1.2;
      const crossEndX = originX + Math.cos(crossAngle) * (length * 0.75);
      const crossEndY = originY + Math.sin(crossAngle) * (length * 0.75);
      drawPencilLine(originX, originY, crossEndX, crossEndY, alpha * 0.7, 0.6);
    }
  }

  // Primary contours
  for (let s = 0; s < p.strokes; s++) {
    const angle1 = random() * Math.PI * 2;
    const angle2 = angle1 + 0.3 + random() * 0.7;
    const dist1 = (0.2 + random() * 0.8) * rx;
    const dist2 = (0.2 + random() * 0.8) * ry;

    let x1 = cx + Math.cos(angle1) * dist1;
    let y1 = cy + Math.sin(angle1) * dist2;
    let x2 = cx + Math.cos(angle2) * dist1;
    let y2 = cy + Math.sin(angle2) * dist2;

    if (isItem) {
      // Linear axes
      x1 = cx + (random() - 0.5) * 40;
      y1 = cy - ry * 0.8 + random() * ry * 1.6;
      x2 = x1 + (random() - 0.5) * 60;
      y2 = y1 + (random() - 0.5) * 30;
    } else if (isLandscape) {
      // Horizon & jagged peaks
      x1 = pad * 2 + random() * (width - pad * 4);
      y1 = cy + (random() - 0.5) * 80;
      x2 = x1 + (random() - 0.5) * 80;
      y2 = y1 - random() * 60;
    }

    const strokeAlpha = p.alphaMin + random() * (p.alphaMax - p.alphaMin);
    drawPencilLine(x1, y1, x2, y2, strokeAlpha, quality === 'astounding' ? 1.2 : 1.0);
  }

  // Smudge shading on high qualities
  if (quality === 'tasteful' || quality === 'astounding') {
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, rx * 1.2);
    grad.addColorStop(0, `${pencilColor}0.12)`);
    grad.addColorStop(0.5, `${pencilColor}0.06)`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - rx * 1.2, cy - ry * 1.2, rx * 2.4, ry * 2.4);
  }

  ctx.restore();

  // 5. Sketch Annotation (handwritten caption in bottom corner)
  ctx.save();
  ctx.font = 'italic 11px serif';
  ctx.fillStyle = `${pencilColor}0.75)`;
  ctx.textAlign = 'left';
  const cleanSub = subject.length > 36 ? subject.substring(0, 33) + '...' : subject;
  ctx.fillText(`“${cleanSub}”`, pad + 8, height - pad - 6);

  ctx.textAlign = 'right';
  ctx.font = '10px monospace';
  ctx.fillStyle = `${pencilColor}0.5)`;
  ctx.fillText(`[${p.label.toUpperCase()}]`, width - pad - 8, height - pad - 6);
  ctx.restore();

  return canvas.toDataURL('image/png');
}
