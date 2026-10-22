import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ClipboardPaste, ListPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { isDone, progress, visibleRows } from '@slotwise/core';
import { useNodes } from '../../src/data/NodesProvider';
import { TopBar } from '../../src/ui/TopBar';
import { AppText } from '../../src/ui/AppText';
import { Button } from '../../src/ui/Button';
import { IconButton } from '../../src/ui/IconButton';
import { Snackbar } from '../../src/ui/Snackbar';
import { TextPromptSheet } from '../../src/ui/TextPromptSheet';
import { TaskRow } from '../../src/features/list/TaskRow';
import { GroupRow } from '../../src/features/list/GroupRow';
import { QuickAdd } from '../../src/features/list/QuickAdd';
import { ActionsSheet } from '../../src/features/list/ActionsSheet';
import { EditSheet } from '../../src/features/list/EditSheet';
import { PinSheet } from '../../src/features/calendar/PinSheet';
import { addDays } from '../../src/lib/dates';
import { localDate } from '../../src/data/time';
import { useTheme } from '../../src/theme/ThemeProvider';
import { radius, spacing } from '../../src/theme/tokens';

export default function ListScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const api = useNodes();
  const { nodes } = api;

  const [target, setTarget] = useState(/** @type {string | null} */ (null));
  const [menu, setMenu] = useState(/** @type {string | null} */ (null));
  const [renaming, setRenaming] = useState(/** @type {string | null} */ (null));
  const [subtaskOf, setSubtaskOf] = useState(/** @type {string | null} */ (null));
  const [editing, setEditing] = useState(/** @type {string | null} */ (null));
  const [pinning, setPinning] = useState(/** @type {string | null} */ (null));
  const [snack, setSnack] = useState(
    /** @type {{ message: string, undo: boolean } | null} */ (null),
  );

  useEffect(() => {
    if (!snack) return undefined;
    const id = setTimeout(() => setSnack(null), 6000);
    return () => clearTimeout(id);
  }, [snack]);

  const rows = useMemo(() => visibleRows(nodes), [nodes]);
  const groups = useMemo(
    () => rows.filter((r) => r.node.kind === 'group').map((r) => r.node),
    [rows],
  );
  const byId = (/** @type {string | null} */ id) => nodes.find((n) => n.id === id) ?? null;
  const menuNode = byId(menu);

  // A deleted group can no longer receive new tasks.
  const activeTarget = groups.some((g) => g.id === target) ? target : null;

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <TopBar
        title={t('list.title')}
        extra={
          <IconButton label={t('list.importNotes')} onPress={() => router.push('/import')}>
            <ClipboardPaste size={20} color={colors.ink} />
          </IconButton>
        }
      />
      <QuickAdd
        groups={groups}
        target={activeTarget}
        onTargetChange={setTarget}
        onAddTask={(title) => api.addTask(title, activeTarget)}
        onAddGroup={(title) => api.addGroup(title)}
      />
    </View>
  );

  if (!api.ready) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, padding: spacing.lg }}>
        {header}
        <ActivityIndicator accessibilityLabel="loading" color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.node.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 96, gap: spacing.sm }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View
            style={{
              gap: spacing.md,
              alignItems: 'flex-start',
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: radius.lg,
              backgroundColor: colors.surface,
            }}
          >
            <AppText weight="heading" size={20}>
              {t('list.emptyTitle')}
            </AppText>
            <AppText tone="muted">{t('list.emptyBody')}</AppText>
            <Button
              title={t('list.importNotes')}
              variant="secondary"
              icon={<ListPlus size={18} color={colors.ink} />}
              onPress={() => router.push('/import')}
            />
          </View>
        }
        renderItem={({ item }) => {
          const { node, depth, hasChildren } = item;
          if (node.kind === 'group') {
            return (
              <GroupRow
                node={node}
                progress={progress(nodes, node)}
                onToggleCollapse={() => api.toggleCollapsed(node.id)}
                onMore={() => setMenu(node.id)}
              />
            );
          }
          if (node.kind === 'note') {
            return (
              <AppText tone="muted" size={14} style={{ marginLeft: depth * 20 + spacing.sm }}>
                {node.title}
              </AppText>
            );
          }
          const done = isDone(nodes, node);
          return (
            <TaskRow
              node={node}
              depth={depth}
              hasChildren={hasChildren}
              done={done}
              onToggleDone={() => api.setTaskDone(node.id, !done)}
              onToggleCollapse={() => api.toggleCollapsed(node.id)}
              onMore={() => setMenu(node.id)}
            />
          );
        }}
      />

      <ActionsSheet
        node={menuNode}
        nodes={nodes}
        onClose={() => setMenu(null)}
        onRename={() => setRenaming(menu)}
        onEdit={() => setEditing(menu)}
        onAddSubtask={() => setSubtaskOf(menu)}
        onMove={(dropTarget) => menu && api.move(menu, dropTarget)}
        onPin={() => setPinning(menu)}
        onUnpin={() => menu && api.update(menu, { pinnedStartMin: null })}
        onTomorrow={() =>
          menu &&
          api.update(menu, {
            scheduledDate: addDays(menuNode?.scheduledDate ?? localDate(), 1),
            pinnedStartMin: null,
          })
        }
        onDelete={() => {
          if (!menuNode) return;
          api.remove(menuNode.id);
          setSnack({ message: t('list.deleted', { title: menuNode.title }), undo: true });
        }}
      />
      <TextPromptSheet
        visible={!!renaming}
        title={t('rename.title')}
        placeholder={t('rename.placeholder')}
        initial={byId(renaming)?.title ?? ''}
        onSubmit={(text) => renaming && api.rename(renaming, text)}
        onClose={() => setRenaming(null)}
      />
      <TextPromptSheet
        visible={!!subtaskOf}
        title={t('actions.addSubtask')}
        placeholder={t('list.addTaskPlaceholder')}
        submitLabel={t('list.addTask')}
        onSubmit={(text) => subtaskOf && api.addTask(text, subtaskOf)}
        onClose={() => setSubtaskOf(null)}
      />
      <PinSheet
        node={byId(pinning)}
        onClose={() => setPinning(null)}
        onPinned={(message) => setSnack({ message, undo: true })}
      />
      <EditSheet
        node={byId(editing)}
        onSave={(patch) => editing && api.update(editing, patch)}
        onClose={() => setEditing(null)}
      />
      <Snackbar
        message={snack?.message ?? null}
        actionLabel={snack?.undo ? t('common.undo') : undefined}
        onAction={() => {
          api.undo();
          setSnack(null);
        }}
      />
    </SafeAreaView>
  );
}
