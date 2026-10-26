import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { Input } from './Input';
import { useFocusWhenOpen } from '../lib/useFocusWhenOpen';
import { spacing } from '../theme/tokens';

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
  const [text, setText] = useState(initial);
  const inputRef = useFocusWhenOpen(visible, initial);
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
      <Input
        ref={inputRef}
        autoFocus
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        accessibilityLabel={title}
        onSubmitEditing={submit}
        returnKeyType="done"
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' }}>
        <Button title={t('common.cancel')} variant="secondary" onPress={onClose} />
        <Button title={submitLabel ?? t('common.save')} onPress={submit} disabled={!text.trim()} />
      </View>
    </Sheet>
  );
}
