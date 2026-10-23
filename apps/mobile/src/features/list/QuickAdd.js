import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { FolderPlus, Plus } from '../../ui/icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../ui/AppText';
import { IconButton } from '../../ui/IconButton';
import { Input } from '../../ui/Input';
import { tappable } from '../../lib/touch';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

/**
 * Add a task in one step (type + Enter) and pick which group it goes to.
 * @param {{
 *   groups: import('@slotwise/core/types.js').TreeNode[],
 *   target: string | null,
 *   onTargetChange: (id: string | null) => void,
 *   onAddTask: (title: string) => void,
 *   onAddGroup: (title: string) => void,
 * }} props
 */
export function QuickAdd({ groups, target, onTargetChange, onAddTask, onAddGroup }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [text, setText] = useState('');

  const addTask = () => {
    if (!text.trim()) return;
    onAddTask(text);
    setText('');
  };
  const addGroup = () => {
    if (!text.trim()) return;
    onAddGroup(text);
    setText('');
  };

  /** @param {string | null} id @param {string} label */
  const chip = (id, label) => {
    const active = target === id;
    return (
      <Pressable
        key={id ?? 'none'}
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
        onPress={() => onTargetChange(id)}
        style={{
          minHeight: 36,
          paddingHorizontal: spacing.md,
          justifyContent: 'center',
          borderRadius: 18,
          borderWidth: 1,
          borderColor: active ? colors.accent : colors.line,
          backgroundColor: active ? colors.accent : colors.surface,
          ...tappable,
        }}
      >
        <AppText size={13} tone={active ? 'accentInk' : 'ink'} weight="bodyMedium">
          {label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Input
          value={text}
          onChangeText={setText}
          onSubmitEditing={addTask}
          returnKeyType="done"
          enterKeyHint="done"
          autoCapitalize="sentences"
          autoCorrect
          blurOnSubmit={false}
          placeholder={t('list.addTaskPlaceholder')}
          accessibilityLabel={t('list.addTaskPlaceholder')}
          style={{ flex: 1 }}
        />
        <IconButton label={t('list.addGroup')} onPress={addGroup} disabled={!text.trim()}>
          <FolderPlus size={20} color={colors.ink} />
        </IconButton>
        <IconButton label={t('list.addTask')} onPress={addTask} disabled={!text.trim()} filled>
          <Plus size={22} color={colors.accentInk} />
        </IconButton>
      </View>
      {groups.length ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <AppText size={13} tone="muted">
            {t('list.selectGroup')}
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm }}
          >
            {chip(null, t('list.noGroup'))}
            {groups.map((g) => chip(g.id, g.title))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
