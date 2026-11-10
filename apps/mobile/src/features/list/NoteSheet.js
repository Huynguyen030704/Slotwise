import { useCallback, useEffect, useState } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { Trash2 } from '../../ui/icons';
import { useTranslation } from 'react-i18next';
import { Sheet } from '../../ui/Sheet';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { AppText } from '../../ui/AppText';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusWhenOpen } from '../../lib/useFocusWhenOpen';
import { useKeyboardInset } from '../../lib/useKeyboardInset';
import { spacing } from '../../theme/tokens';

const MAX_LENGTH = 2000;
const MIN_INPUT = 200; // about eight lines: enough to read a short note without scrolling
const SHEET_CHROME = 200; // title, task name and buttons around the input
const PAD = spacing.md;

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
  const inputRef = useFocusWhenOpen(!!node, node?.note ?? '');
  const { height: windowH } = useWindowDimensions();
  const keyboard = useKeyboardInset();
  // The box grows with what is written, up to what fits on screen (the sheet is 80% of the window,
  // or what the keyboard leaves); beyond that it scrolls. `contentH` is the text's height with the
  // box's padding. A text box reports its own height as its scroll height, so on the web the text
  // is measured by squeezing the box to nothing for an instant; phones report the text height.
  const [contentH, setContentH] = useState(0);
  const measure = useCallback(() => {
    const el = inputRef.current;
    if (Platform.OS !== 'web' || !el?.style) return;
    const before = el.style.height;
    el.style.height = '0px';
    const h = el.scrollHeight;
    el.style.height = before;
    setContentH(h);
  }, [inputRef]);
  useEffect(() => {
    if (!node) return undefined;
    measure();
    const id = setTimeout(measure, 300); // the sheet is mounted and styled by now
    return () => clearTimeout(id);
  }, [node, text, measure]);
  const maxH = Math.max(MIN_INPUT, Math.round((windowH - keyboard) * 0.8) - SHEET_CHROME);
  const inputH = Math.min(maxH, Math.max(MIN_INPUT, contentH));

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
        ref={inputRef}
        autoFocus
        multiline
        value={text}
        onChangeText={setText}
        maxLength={MAX_LENGTH}
        placeholder={t('note.placeholder')}
        accessibilityLabel={t('note.title')}
        textAlignVertical="top"
        onContentSizeChange={(e) => {
          if (Platform.OS !== 'web')
            setContentH(Math.ceil(e.nativeEvent.contentSize.height) + 2 * PAD);
        }}
        style={{ height: inputH, paddingTop: PAD, paddingBottom: PAD }}
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
