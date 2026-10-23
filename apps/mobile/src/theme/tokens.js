/** Design tokens from CLAUDE.md section 10. Never hardcode colors in components. */

export const colors = {
  light: {
    bg: '#EDF0F2',
    surface: '#FFFFFF',
    ink: '#16202A',
    muted: '#5B6874',
    line: '#D3DAE1',
    accent: '#2F3FA0',
    heavy: '#2F3FA0',
    accentInk: '#FFFFFF',
    light: '#F3D27A',
    danger: '#B3261E',
    ok: '#1F7A4D',
    busy: '#DDE2E8',
    lightInk: '#16202A',
    peakBg: 'rgba(47,63,160,0.08)',
    peakLine: 'rgba(47,63,160,0.4)',
  },
  dark: {
    bg: '#12171D',
    surface: '#1B222A',
    ink: '#E8EDF2',
    muted: '#9AA7B4',
    line: '#2C3640',
    accent: '#8A97FF',
    heavy: '#8A97FF',
    accentInk: '#0E1230',
    light: '#E7B84A',
    danger: '#FF8A80',
    ok: '#6FD3A0',
    busy: '#26303A',
    lightInk: '#16202A',
    peakBg: 'rgba(138,151,255,0.09)',
    peakLine: 'rgba(138,151,255,0.45)',
  },
};

export const fonts = {
  heading: 'BricolageGrotesque_700Bold',
  body: 'BeVietnamPro_400Regular',
  bodyMedium: 'BeVietnamPro_500Medium',
  bodyBold: 'BeVietnamPro_600SemiBold',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 6, md: 10, lg: 14 };
/** Minimum touch target (CLAUDE.md section 10). */
export const MIN_TOUCH = 44;
