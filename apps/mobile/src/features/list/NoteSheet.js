import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Trash2 } from '../../ui/icons';
import { useTranslation } from 'react-i18next';
import { Sheet } from '../../ui/Sheet';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { AppText } from '../../ui/AppText';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

const MAX_LENGTH = 2000;

/**
 * Write, change or delete the free-text note of a task. An empty note means "no note".
 * @param {{
 *   node: import('@slotwise/core/types.js').TreeNode | null,
 *   onSave: (note: string) => void,
 *   onClose: () => void,
 * }} props
 */
export function NoteSheet({ node, onSave, onClose }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [text, setText] = useState('');

  useEffect(() => {
    if (node) setText(node.note ?? '');
  }, [node]);

  const save = (/** @type {string} */ value) => {
    onSave(value.trim());
    onClose();
  };

  return (
    <Sheet visible={!!node} title={t('note.title')} onClose={onClose}>
      <AppText tone="muted" size={13} numberOfLines={2}>
        {node?.title}
      </AppText>
      <Input
        autoFocus
        multiline
        value={text}
        onChangeText={setText}
        maxLength={MAX_LENGTH}
        placeholder={t('note.placeholder')}
        accessibilityLabel={t('note.title')}
        textAlignVertical="top"
        style={{ minHeight: 140, paddingTop: spacing.md, paddingBottom: spacing.md }}
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' }}>
        {node?.note ? (
          <Button
            title={t('note.remove')}
            variant="secondary"
            icon={<Trash2 size={18} color={colors.danger} />}
            onPress={() => save('')}
          />
        ) : null}
        <Button title={t('common.cancel')} variant="secondary" onPress={onClose} />
        <Button title={t('common.save')} onPress={() => save(text)} />
      </View>
    </Sheet>
  );
}
