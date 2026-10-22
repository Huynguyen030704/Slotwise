import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { isDone, taskBuckets } from '@slotwise/core';
import { Target } from '../../ui/icons';
import { useNodes } from '../../data/NodesProvider';
import { localDate } from '../../data/time';
import { addDays, formatDay } from '../../lib/dates';
import { AppText } from '../../ui/AppText';
import { IconButton } from '../../ui/IconButton';
import { Snackbar } from '../../ui/Snackbar';
import { TextPromptSheet } from '../../ui/TextPromptSheet';
import { TopBar } from '../../ui/TopBar';
import { ActionsSheet } from '../list/ActionsSheet';
import { TaskRow } from '../list/TaskRow';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';

/**
 * Task-first day view (no clock): what to do today, tomorrow and later, in the order of the list.
 * @param {{ embedded?: boolean }} props
 */
export function TodayPane({ embedded = false }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const api = useNodes();
  const today = localDate();
  const tomorrow = addDays(today, 1);

  const buckets = useMemo(() => taskBuckets(api.nodes, today), [api.nodes, today]);
  const [menu, setMenu] = useState(/** @type {string | null} */ (null));
  const [renaming, setRenaming] = useState(/** @type {string | null} */ (null));
  const [snack, setSnack] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!snack) return undefined;
    const id = setTimeout(() => setSnack(null), 6000);
    return () => clearTimeout(id);
  }, [snack]);

  const byId = (/** @type {string | null} */ id) => api.nodes.find((n) => n.id === id) ?? null;
  const menuNode = byId(menu);
  const total =
    buckets.today.length +
    buckets.doneToday.length +
    buckets.tomorrow.length +
    buckets.later.length;

  const Root = embedded ? View : SafeAreaView;
  const rootProps = embedded ? {} : { edges: /** @type {const} */ (['top']) };

  /**
   * @param {string} title
   * @param {import('@slotwise/core/types.js').TreeNode[]} items
   * @param {boolean} [muted]
   */
  const section = (title, items, muted = false) => (
    <View key={title} style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
        <AppText
          accessibilityRole="header"
          weight="heading"
          size={18}
          tone={muted ? 'muted' : 'ink'}
        >
          {title}
        </AppText>
        <AppText size={13} tone="muted">
          {items.length}
        </AppText>
      </View>
      {items.length ? (
        items.map((n) => (
          <TaskRow
            key={n.id}
            node={n}
            depth={0}
            hasChildren={false}
            done={isDone(api.nodes, n)}
            hideMeta
            subtitle={groupTitle(n)}
            onToggleDone={() => api.setTaskDone(n.id, !isDone(api.nodes, n))}
            onToggleCollapse={() => {}}
            onMore={() => setMenu(n.id)}
          />
        ))
      ) : (
        <AppText size={14} tone="muted">
          {t('today.emptySection')}
        </AppText>
      )}
    </View>
  );

  /** Name of the group a task sits under, to tell similar titles apart. */
  const groupTitle = (/** @type {import('@slotwise/core/types.js').TreeNode} */ n) => {
    let cur = n;
    for (let i = 0; i < 20 && cur.parentId; i++) {
      const parent = api.nodes.find((x) => x.id === cur.parentId);
      if (!parent) break;
      if (parent.kind === 'group') return parent.title;
      cur = parent;
    }
    return undefined;
  };

  return (
    <Root {...rootProps} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 96 }}
      >
        {embedded ? (
          <AppText accessibilityRole="header" weight="heading" size={26}>
            {t('today.title')}
          </AppText>
        ) : (
          <TopBar
            title={t('today.title')}
            extra={
              <IconButton label={t('focus.openLabel')} onPress={() => router.push('/focus')}>
                <Target size={20} color={colors.ink} />
              </IconButton>
            }
          />
        )}
        <AppText tone="muted" style={{ textTransform: 'capitalize' }}>
          {formatDay(today, i18n.language)}
        </AppText>

        {total === 0 ? (
          <View
            style={{
              padding: spacing.lg,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.surface,
            }}
          >
            <AppText tone="muted">{t('today.empty')}</AppText>
          </View>
        ) : null}

        {section(t('today.sectionToday'), buckets.today)}
        {buckets.doneToday.length ? section(t('today.sectionDone'), buckets.doneToday, true) : null}
        {section(t('today.sectionTomorrow'), buckets.tomorrow)}
        {section(t('today.sectionLater'), buckets.later, true)}
      </ScrollView>

      <ActionsSheet
        node={menuNode}
        nodes={api.nodes}
        onClose={() => setMenu(null)}
        done={menuNode ? isDone(api.nodes, menuNode) : false}
        onToggleDone={() => menuNode && api.setTaskDone(menuNode.id, !isDone(api.nodes, menuNode))}
        onRename={() => setRenaming(menu)}
        onToday={
          menuNode?.scheduledDate === today
            ? undefined
            : () => menu && api.update(menu, { scheduledDate: today })
        }
        onTomorrow={
          menuNode?.scheduledDate === tomorrow
            ? undefined
            : () => menu && api.update(menu, { scheduledDate: tomorrow })
        }
        onLater={() => menu && api.update(menu, { scheduledDate: null })}
        onDelete={() => {
          if (!menuNode) return;
          api.remove(menuNode.id);
          setSnack(t('list.deleted', { title: menuNode.title }));
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
      <Snackbar
        message={snack}
        actionLabel={t('common.undo')}
        onAction={() => {
          api.undo();
          setSnack(null);
        }}
      />
    </Root>
  );
}
