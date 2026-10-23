import { Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';

/** True when a mouse can hover (not a phone or tablet), so hover-only hints make sense. */
export const canHover =
  IS_WEB &&
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

/**
 * Web-only styles for tappable things: no 300 ms tap delay or double-tap zoom, no text selection
 * or blue tap flash when tapping fast, and a pointer cursor. Spread into a style object.
 * @type {Record<string, unknown>}
 */
export const tappable = IS_WEB
  ? {
      touchAction: 'manipulation',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      cursor: 'pointer',
    }
  : {};
