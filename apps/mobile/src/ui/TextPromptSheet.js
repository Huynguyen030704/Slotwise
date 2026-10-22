import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, fonts, radius, spacing } from '../theme/tokens';

/**
 * Single-line text prompt in a sheet (rename, add subtask).
 * @param {{ visible: boolean, title: string, placeholder?: string, initial?: string, submitLabel?: string, onSubmit: (text: string) => void, onClose: () => void }} props
 */
export function TextPromptSheet({
  visible,
  title,
  placeholder,
  initial = '',
  submitLabel,
  onSubmit,
  onClose,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [text, setText] = useState(initial);
  useEffect(() => {
    if (visible) setText(initial);
  }, [visible, initial]);
  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text);
    onClose();
  };
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <TextInput
        autoFocus
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        accessibilityLabel={title}
        onSubmitEditing={submit}
        returnKeyType="done"
        style={{
          minHeight: MIN_TOUCH,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          color: colors.ink,
          backgroundColor: colors.bg,
          fontFamily: fonts.body,
          fontSize: 16,
        }}
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' }}>
        <Button title={t('common.cancel')} variant="secondary" onPress={onClose} />
        <Button title={submitLabel ?? t('common.save')} onPress={submit} disabled={!text.trim()} />
      </View>
    </Sheet>
  );
}
