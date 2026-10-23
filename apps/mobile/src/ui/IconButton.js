import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { canHover, tappable } from '../lib/touch';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, radius, spacing } from '../theme/tokens';

const LONG_PRESS_TIP_MS = 1600;

/**
 * Icon-only button. `label` is required for screen readers. It also shows as a tooltip under the
 * button: while a mouse is over it or it has keyboard focus, and on touch screens while the
 * button is held down for a moment (hover does not exist there, and a tap must just press).
 * @param {{ label: string, onPress: () => void, children: import('react').ReactNode, disabled?: boolean, filled?: boolean, size?: number }} props
 */
export function IconButton({ label, onPress, children, disabled, filled, size = MIN_TOUCH }) {
  const { colors } = useTheme();
  const [tip, setTip] = useState(false);
  const timer = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const hoverProps = canHover
    ? {
        onHoverIn: () => setTip(true),
        onHoverOut: () => setTip(false),
        onFocus: () => setTip(true),
        onBlur: () => setTip(false),
      }
    : {};
  const showBriefly = () => {
    setTip(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTip(false), LONG_PRESS_TIP_MS);
  };
  return (
    <View style={{ zIndex: tip ? 20 : 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        onLongPress={canHover ? undefined : showBriefly}
        delayLongPress={350}
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
          ...tappable,
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
