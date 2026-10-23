import { forwardRef, useState } from 'react';
import { Platform, TextInput } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, fonts, radius, spacing } from '../theme/tokens';

/**
 * Single or multi-line text box in the app's style: thin border, accent ring on focus (replaces the
 * browser's default orange outline on web).
 * @typedef {import('react-native').TextInputProps & { error?: boolean }} InputProps
 */
export const Input = forwardRef(
  /** @param {InputProps} props @param {any} ref */
  function Input({ error, style, onFocus, onBlur, multiline, ...rest }, ref) {
    const { colors } = useTheme();
    const [focused, setFocused] = useState(false);
    return (
      <TextInput
        ref={ref}
        multiline={multiline}
        placeholderTextColor={colors.muted}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            minHeight: MIN_TOUCH,
            borderWidth: focused || error ? 2 : 1,
            borderColor: error ? colors.danger : focused ? colors.accent : colors.line,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            color: colors.ink,
            backgroundColor: colors.surface,
            fontFamily: fonts.body,
            fontSize: 16,
          },
          Platform.OS === 'web' ? /** @type {any} */ ({ outlineStyle: 'none' }) : null,
          style,
        ]}
      />
    );
  },
);
