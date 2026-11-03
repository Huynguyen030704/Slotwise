import { Pressable } from 'react-native';
import { AppText } from './AppText';
import { tappable } from '../lib/touch';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, radius, spacing } from '../theme/tokens';

/**
 * Small outlined button with an icon and a text, for toolbars.
 * @param {{
 *   label: string,
 *   icon: (props: { size: number, color: string }) => import('react').ReactNode,
 *   onPress: () => void,
 *   role?: 'button' | 'switch',
 *   checked?: boolean,
 * }} props
 */
export function ChipButton({ label, icon, onPress, role = 'button', checked }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={role === 'switch' ? { checked: !!checked } : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        minHeight: MIN_TOUCH,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        opacity: pressed ? 0.7 : 1,
        ...tappable,
      })}
    >
      {icon({ size: 18, color: colors.muted })}
      <AppText size={14} weight="bodyMedium">
        {label}
      </AppText>
    </Pressable>
  );
}
