import { forwardRef, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { Eye, EyeOff } from './icons';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, fonts, radius, spacing } from '../theme/tokens';

/**
 * Labelled text field: visible label above, inline error below, accent ring on focus. Password
 * fields get a show/hide toggle. Works with password managers through `autoComplete`.
 * @typedef {object} FormFieldProps
 * @property {string} label
 * @property {string} value
 * @property {(v: string) => void} onChange
 * @property {string} [error]
 * @property {string} [hint]
 * @property {boolean} [password]
 * @property {string} [showLabel] accessible name of the toggle when the password is hidden
 * @property {string} [hideLabel] accessible name of the toggle when the password is visible
 * @property {import('react-native').TextInputProps['autoComplete']} [autoComplete]
 * @property {import('react-native').TextInputProps['keyboardType']} [keyboardType]
 * @property {import('react-native').TextInputProps['returnKeyType']} [returnKeyType]
 * @property {() => void} [onSubmit]
 * @property {boolean} [editable]
 */

export const FormField = forwardRef(
  /** @param {FormFieldProps} props @param {any} ref */
  function FormField(
    {
      label,
      value,
      onChange,
      error,
      hint,
      password,
      showLabel,
      hideLabel,
      autoComplete,
      keyboardType,
      returnKeyType,
      onSubmit,
      editable = true,
    },
    ref,
  ) {
    const { colors } = useTheme();
    const [focused, setFocused] = useState(false);
    const [visible, setVisible] = useState(false);
    const Icon = visible ? EyeOff : Eye;

    return (
      <View style={{ gap: spacing.xs }}>
        <AppText size={14} weight="bodyMedium">
          {label}
        </AppText>
        <View
          style={{
            minHeight: MIN_TOUCH + 4,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: radius.md,
            borderWidth: focused || error ? 2 : 1,
            borderColor: error ? colors.danger : focused ? colors.accent : colors.line,
            backgroundColor: colors.surface,
            opacity: editable ? 1 : 0.6,
          }}
        >
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChange}
            accessibilityLabel={label}
            accessibilityHint={hint}
            editable={editable}
            secureTextEntry={password && !visible}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={autoComplete}
            keyboardType={keyboardType}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmit}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholderTextColor={colors.muted}
            style={[
              {
                flex: 1,
                minHeight: MIN_TOUCH,
                paddingHorizontal: spacing.md,
                color: colors.ink,
                fontFamily: fonts.body,
                fontSize: 16,
              },
              Platform.OS === 'web' ? /** @type {any} */ ({ outlineStyle: 'none' }) : null,
            ]}
          />
          {password ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible ? hideLabel : showLabel}
              onPress={() => setVisible((v) => !v)}
              hitSlop={4}
              style={{
                width: MIN_TOUCH,
                height: MIN_TOUCH,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={20} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        {error ? (
          <AppText
            size={13}
            tone="danger"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </AppText>
        ) : hint ? (
          <AppText size={13} tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
    );
  },
);
