import { View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from '../theme/tokens';

/**
 * Small label under its anchor, drawn inside the anchor's parent (phones). The web version draws
 * it on top of the whole page instead, see Tooltip.web.js.
 * @param {{ label: string, size: number, anchorRef?: unknown }} props
 */
export function Tooltip({ label, size }) {
  const { colors } = useTheme();
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: size + spacing.xs,
        right: 0,
        width: 240,
        alignItems: 'flex-end',
      }}
    >
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.sm,
          backgroundColor: colors.ink,
        }}
      >
        <AppText size={13} style={{ color: colors.bg }}>
          {label}
        </AppText>
      </View>
    </View>
  );
}
