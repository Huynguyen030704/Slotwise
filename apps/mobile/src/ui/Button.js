import { ActivityIndicator, Pressable } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, radius, spacing } from '../theme/tokens';

/**
 * @param {{
 *   title: string,
 *   onPress: () => void,
 *   variant?: 'primary' | 'secondary' | 'danger',
 *   disabled?: boolean,
 *   loading?: boolean,
 *   icon?: import('react').ReactNode,
 * }} props
 */
export function Button({ title, onPress, variant = 'primary', disabled, loading, icon }) {
  const { colors } = useTheme();
  const bg =
    variant === 'primary' ? colors.accent : variant === 'danger' ? colors.danger : colors.surface;
  const fg = variant === 'secondary' ? 'ink' : 'accentInk';
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: variant === 'secondary' ? 1 : 0,
        borderColor: colors.line,
        backgroundColor: bg,
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
      })}
    >
      {loading ? <ActivityIndicator size="small" color={colors[fg]} /> : icon}
      <AppText tone={fg} weight="bodyBold">
        {title}
      </AppText>
    </Pressable>
  );
}
