import { useEffect, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fold } from '@slotwise/core';
import { Sheet } from '../../ui/Sheet';
import { Input } from '../../ui/Input';
import { AppText } from '../../ui/AppText';
import { useFocusWhenOpen } from '../../lib/useFocusWhenOpen';
import { MIN_TOUCH, spacing } from '../../theme/tokens';

/**
 * List of every group with its progress, to jump straight to one however long the list is.
 * @param {{
 *   visible: boolean,
 *   groups: { id: string, title: string, done: number, total: number }[],
 *   onPick: (id: string) => void,
 *   onClose: () => void,
 * }} props
 */
export function GroupJumpSheet({ visible, groups, onPick, onClose }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const inputRef = useFocusWhenOpen(visible, '');

  useEffect(() => {
    if (visible) setFilter('');
  }, [visible]);

  const shown = useMemo(() => {
    const q = fold(filter).trim();
    return q ? groups.filter((g) => fold(g.title).includes(q)) : groups;
  }, [groups, filter]);

  return (
    <Sheet visible={visible} title={t('jump.title')} onClose={onClose}>
      {groups.length > 6 ? (
        <Input
          ref={inputRef}
          value={filter}
          onChangeText={setFilter}
          placeholder={t('jump.filter')}
          accessibilityLabel={t('jump.filter')}
          autoCapitalize="none"
          autoCorrect={false}
        />
      ) : null}
      {shown.length ? (
        shown.map((g) => (
          <Pressable
            key={g.id}
            accessibilityRole="button"
            accessibilityLabel={t('jump.item', { title: g.title, done: g.done, total: g.total })}
            onPress={() => onPick(g.id)}
            style={({ pressed }) => ({
              minHeight: MIN_TOUCH,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <AppText weight="bodyMedium" style={{ flex: 1 }} numberOfLines={2}>
              {g.title}
            </AppText>
            <AppText size={13} tone={g.total && g.done === g.total ? 'ok' : 'muted'}>
              {t('list.progress', { done: g.done, total: g.total })}
            </AppText>
          </Pressable>
        ))
      ) : (
        <AppText tone="muted">{t('jump.none')}</AppText>
      )}
    </Sheet>
  );
}
