import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, radius, spacing } from '../theme/tokens';

const GAP = spacing.xs;
const EDGE = spacing.sm;

/**
 * Small label under its anchor. It is drawn straight into the page body with fixed positioning,
 * so a row or card that comes later in the layout can never paint over it, and it stays inside
 * the window.
 * @param {{ label: string, anchorRef: { current: any } }} props
 */
export function Tooltip({ label, anchorRef }) {
  const { colors } = useTheme();
  const [pos, setPos] = useState(/** @type {{ top: number, right: number } | null} */ (null));

  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el?.getBoundingClientRect) return;
    const rect = el.getBoundingClientRect();
    setPos({
      top: rect.bottom + GAP,
      right: Math.max(EDGE, window.innerWidth - rect.right),
    });
  }, [anchorRef, label]);

  if (!pos) return null;
  return createPortal(
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        maxWidth: Math.min(260, window.innerWidth - 2 * EDGE),
        zIndex: 100000,
        pointerEvents: 'none',
        padding: `${spacing.sm}px ${spacing.md}px`,
        borderRadius: radius.sm,
        background: colors.ink,
        color: colors.bg,
        fontFamily: fonts.bodyMedium,
        fontSize: 13,
        lineHeight: '18px',
      }}
    >
      {label}
    </div>,
    document.body,
  );
}
