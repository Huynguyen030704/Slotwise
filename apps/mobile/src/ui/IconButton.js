import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, radius, spacing } from '../theme/tokens';

const IS_WEB = Platform.OS === 'web';

/**
 * Icon-only button. `label` is required for screen readers, and on web it also shows as a
 * tooltip under the button while the pointer is over it or it has keyboard focus.
 * @param {{ label: string, onPress: () => void, children: import('react').ReactNode, disabled?: boolean, filled?: boolean, size?: number }} props
 */
export function IconButton({ label, onPress, children, disabled, filled, size = MIN_TOUCH }) {
  const { colors } = useTheme();
  const [tip, setTip] = useState(false);
  const hoverProps = IS_WEB
    ? {
        onHoverIn: () => setTip(true),
        onHoverOut: () => setTip(false),
        onFocus: () => setTip(true),
        onBlur: () => setTip(false),
      }
    : {};
  return (
    <View style={{ zIndex: tip ? 20 : 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        hitSlop={4}
        {...hoverProps}
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
      {tip ? (
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
      ) : null}
    </View>
  );
}
