import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { FolderPlus, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../ui/AppText';
import { IconButton } from '../../ui/IconButton';
import { useTheme } from '../../theme/ThemeProvider';
import { MIN_TOUCH, fonts, radius, spacing } from '../../theme/tokens';

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
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={addTask}
          returnKeyType="done"
          blurOnSubmit={false}
          placeholder={t('list.addTaskPlaceholder')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t('list.addTaskPlaceholder')}
          style={{
            flex: 1,
            minHeight: MIN_TOUCH,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            color: colors.ink,
            backgroundColor: colors.surface,
            fontFamily: fonts.body,
            fontSize: 16,
          }}
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
