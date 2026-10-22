import { Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, radius } from '../theme/tokens';

/**
 * Icon-only button. `label` is required for screen readers.
 * @param {{ label: string, onPress: () => void, children: import('react').ReactNode, disabled?: boolean, filled?: boolean, size?: number }} props
 */
export function IconButton({ label, onPress, children, disabled, filled, size = MIN_TOUCH }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: filled ? 0 : 1,
        borderColor: colors.line,
        backgroundColor: filled ? colors.accent : colors.surface,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}
