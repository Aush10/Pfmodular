import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check } from 'lucide-react';

interface FieldCallTooltipProps {
  callName: string; // e.g. "#STR", "#HP", "#BAB", "#FORT"
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  description?: string;
  as?: 'div' | 'span' | 'td';
}

/**
 * Copy text to clipboard with fallback for restricted iframes or local file:// standalone builds
 */
function copyTextToClipboard(text: string): void {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text: string): void {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  } catch {
    // ignore
  }
}

/**
 * FieldCallTooltip
 * Displays the constant #CALL identifier after a continuous 3-second (3000ms) hover dwell.
 * Renders via a React Portal in document.body so it is never clipped by overflow-hidden or truncate.
 * Includes a hover bridge grace timer so users can smoothly move their cursor onto the popup to click & copy.
 */
export const FieldCallTooltip: React.FC<FieldCallTooltipProps> = ({
  callName,
  children,
  className = '',
  position = 'top',
  description,
  as: Component = 'div',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({
    top: 0,
    left: 0,
    placement: 'top',
  });

  const triggerRef = useRef<HTMLElement | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedCall = callName.startsWith('#') ? callName : `#${callName}`;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const preferBottom = position === 'bottom' || rect.top < 56;
    const clampedLeft = Math.max(90, Math.min(window.innerWidth - 90, rect.left + rect.width / 2));

    setCoords({
      top: preferBottom ? rect.bottom + 6 : rect.top - 6,
      left: clampedLeft,
      placement: preferBottom ? 'bottom' : 'top',
    });
  }, [position]);

  const clearTimers = () => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (isVisible) {
      updatePosition();
      return;
    }
    if (!dwellTimerRef.current) {
      dwellTimerRef.current = setTimeout(() => {
        updatePosition();
        setIsVisible(true);
        dwellTimerRef.current = null;
      }, 3000);
    }
  };

  const handleMouseLeave = () => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    // Grace delay so user can move cursor from the field onto the floating tooltip to click Copy
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsCopied(false);
    }, 450);
  };

  const handleTooltipMouseEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsCopied(false);
    }, 250);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    copyTextToClipboard(normalizedCall);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  useEffect(() => {
    if (!isVisible) return;
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isVisible, updatePosition]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  return (
    <Component
      ref={triggerRef as any}
      className={className || 'inline-flex items-center'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            onClick={handleCopy}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform:
                coords.placement === 'top'
                  ? 'translate(-50%, -100%)'
                  : 'translate(-50%, 0)',
              zIndex: 9999,
            }}
            className="cursor-pointer group select-none animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-amber-400 shadow-2xl text-xs font-mono text-amber-300 hover:bg-slate-900 hover:border-amber-300 transition-all whitespace-nowrap ring-2 ring-black/60">
              <span className="text-[10px] uppercase tracking-wider px-1 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold">
                Call ID
              </span>
              <span className="font-black text-sm text-amber-300 tracking-wide">
                {normalizedCall}
              </span>
              {description && (
                <span className="text-[10px] text-slate-300 hidden sm:inline">
                  · {description}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  isCopied
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                    : 'bg-white/10 text-slate-200 group-hover:bg-amber-500 group-hover:text-slate-950'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </span>
            </div>
          </div>,
          document.body
        )}
    </Component>
  );
};
