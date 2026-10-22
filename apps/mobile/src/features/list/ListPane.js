import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import {
  ClipboardList,
  ClipboardPaste,
  GripVertical,
  ListPlus,
  Target,
  UserRound,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { dropTargetAt, isDone, isLeaf, progress, visibleRows } from '@slotwise/core';
import { useNodes } from '../../data/NodesProvider';
import { localDate } from '../../data/time';
import { addDays } from '../../lib/dates';
import { dragCancel, dragDrop, dragHover, dragStart } from '../../lib/dragBus';
import { TopBar } from '../../ui/TopBar';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';
import { Snackbar } from '../../ui/Snackbar';
import { TextPromptSheet } from '../../ui/TextPromptSheet';
import { PinSheet } from '../calendar/PinSheet';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { TaskRow } from './TaskRow';
import { GroupRow } from './GroupRow';
import { QuickAdd } from './QuickAdd';
import { ActionsSheet } from './ActionsSheet';
import { EditSheet } from './EditSheet';

const EDGE = 64; // auto-scroll band at the top and bottom of the list
const IS_WEB = Platform.OS === 'web';

/**
 * @typedef {{ id: string, mode: 'before' | 'after' | 'into' }} DropHint
 */

/**
 * The task list with drag to reorder (before / after a row, or into a group) and, when a day
 * timeline is on screen too, drag onto the timeline to pin a time. Dragging starts at the grip.
 * @param {{ embedded?: boolean }} props
 */
export function ListPane({ embedded = false }) {
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

  // drag state
  const [draggingId, setDraggingId] = useState(/** @type {string | null} */ (null));
  const [hint, setHint] = useState(/** @type {DropHint | null} */ (null));
  const listRef = useRef(/** @type {any} */ (null));
  const listFrameRef = useRef(/** @type {any} */ (null));
  const rowRefs = useRef(/** @type {Map<string, any>} */ (new Map()));
  const rects = useRef(/** @type {{ id: string, y: number, h: number }[]} */ ([]));
  const listFrame = useRef({ top: 0, bottom: 0 });
  const scrollY = useRef(0);
  const contentH = useRef(0);
  const viewH = useRef(0);
  const session = useRef(
    /** @type {null | { id: string, scroll0: number, x: number, y: number, cancelled: boolean, payload: import('../../lib/dragBus').DragPayload, target: import('@slotwise/core/tree.js').DropTarget | null, scrollDir: number }} */ (
      null
    ),
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

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  /** Work out the drop target under the pointer (list rows, or the timeline). */
  const refresh = useCallback(() => {
    const s = session.current;
    if (!s || s.cancelled) return;
    if (dragHover(s.x, s.y, s.payload)) {
      s.target = null;
      s.scrollDir = 0;
      setHint(null);
      return;
    }
    const offset = scrollY.current - s.scroll0;
    const row = rects.current.find((r) => s.y >= r.y - offset && s.y < r.y - offset + r.h);
    const next = row
      ? dropTargetAt(nodesRef.current, s.id, row.id, (s.y - (row.y - offset)) / row.h)
      : null;
    s.target = next;
    s.scrollDir =
      s.y < listFrame.current.top + EDGE && s.y >= listFrame.current.top
        ? -1
        : s.y > listFrame.current.bottom - EDGE && s.y <= listFrame.current.bottom
          ? 1
          : 0;
    setHint((prev) => {
      const h = next && row ? { id: row.id, mode: next.kind } : null;
      return prev?.id === h?.id && prev?.mode === h?.mode ? prev : h;
    });
  }, []);

  const startDrag = useCallback(
    (/** @type {import('@slotwise/core/types.js').TreeNode} */ node) => {
      const all = nodesRef.current;
      rects.current = [];
      rowRefs.current.forEach((ref, id) => {
        ref?.measureInWindow(
          (
            /** @type {number} */ _x,
            /** @type {number} */ y,
            /** @type {number} */ _w,
            /** @type {number} */ h,
          ) => {
            rects.current.push({ id, y, h });
          },
        );
      });
      listFrameRef.current?.measureInWindow(
        (
          /** @type {number} */ _x,
          /** @type {number} */ y,
          /** @type {number} */ _w,
          /** @type {number} */ h,
        ) => {
          listFrame.current = { top: y, bottom: y + h };
        },
      );
      session.current = {
        id: node.id,
        scroll0: scrollY.current,
        x: 0,
        y: 0,
        cancelled: false,
        payload: {
          id: node.id,
          durationMin: node.durationMin,
          schedulable: isLeaf(all, node),
        },
        target: null,
        scrollDir: 0,
      };
      dragStart();
      setDraggingId(node.id);
    },
    [],
  );

  const moveDrag = useCallback(
    (/** @type {number} */ x, /** @type {number} */ y) => {
      const s = session.current;
      if (!s || s.cancelled) return;
      s.x = x;
      s.y = y;
      refresh();
    },
    [refresh],
  );

  const endDrag = useCallback(
    (/** @type {boolean} */ ok) => {
      const s = session.current;
      session.current = null;
      setDraggingId(null);
      setHint(null);
      if (!s || s.cancelled || !ok) {
        dragCancel();
        return;
      }
      if (dragDrop(s.x, s.y, s.payload)) return;
      if (s.target) api.move(s.id, s.target);
    },
    [api],
  );

  // Auto-scroll the list while dragging near its top or bottom edge.
  useEffect(() => {
    if (!draggingId) return undefined;
    const id = setInterval(() => {
      const s = session.current;
      if (!s || !s.scrollDir) return;
      const max = Math.max(0, contentH.current - viewH.current);
      const next = Math.max(0, Math.min(max, scrollY.current + s.scrollDir * 14));
      if (next === scrollY.current) return;
      listRef.current?.scrollToOffset({ offset: next, animated: false });
      scrollY.current = next;
      refresh();
    }, 32);
    return () => clearInterval(id);
  }, [draggingId, refresh]);

  // Escape cancels a drag (web).
  useEffect(() => {
    if (!draggingId || !IS_WEB) return undefined;
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      if (e.key !== 'Escape' || !session.current) return;
      session.current.cancelled = true;
      setDraggingId(null);
      setHint(null);
      dragCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draggingId]);

  /** @param {import('@slotwise/core/types.js').TreeNode} node */
  const gripFor = (node) => {
    const gesture = Gesture.Pan()
      .minDistance(6)
      .runOnJS(true)
      .onStart(() => startDrag(node))
      .onUpdate((e) => moveDrag(e.absoluteX, e.absoluteY))
      .onEnd((e, success) => {
        // Re-resolve at the release point so a fast flick still lands where the pointer ended.
        if (success) moveDrag(e.absoluteX, e.absoluteY);
        endDrag(success);
      })
      .onFinalize(() => {
        if (session.current) endDrag(false);
      });
    return (
      <GestureDetector gesture={gesture}>
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 28,
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GripVertical size={16} color={colors.muted} />
        </View>
      </GestureDetector>
    );
  };

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <TopBar
        title={t('list.title')}
        extra={
          <>
            <IconButton label={t('account.openLabel')} onPress={() => router.push('/account')}>
              <UserRound size={20} color={colors.ink} />
            </IconButton>
            <IconButton label={t('focus.openLabel')} onPress={() => router.push('/focus')}>
              <Target size={20} color={colors.ink} />
            </IconButton>
            <IconButton label={t('summary.openLabel')} onPress={() => router.push('/summary')}>
              <ClipboardList size={20} color={colors.ink} />
            </IconButton>
            <IconButton label={t('list.importNotes')} onPress={() => router.push('/import')}>
              <ClipboardPaste size={20} color={colors.ink} />
            </IconButton>
          </>
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

  const Root = embedded ? View : SafeAreaView;
  const rootProps = embedded ? {} : { edges: /** @type {const} */ (['top']) };

  if (api.loadError) {
    return (
      <Root {...rootProps} style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
        {header}
        <View
          accessibilityRole="alert"
          style={{
            gap: spacing.md,
            alignItems: 'flex-start',
            padding: spacing.lg,
            borderWidth: 1,
            borderColor: colors.danger,
            borderRadius: radius.lg,
            backgroundColor: colors.surface,
          }}
        >
          <AppText weight="bodyBold">{t('data.openError')}</AppText>
          <AppText tone="muted">{t('data.openErrorHint')}</AppText>
          <Button title={t('data.retry')} onPress={api.reload} />
        </View>
      </Root>
    );
  }

  if (!api.ready) {
    return (
      <Root {...rootProps} style={{ flex: 1, padding: spacing.lg }}>
        {header}
        <ActivityIndicator accessibilityLabel="loading" color={colors.accent} />
      </Root>
    );
  }

  return (
    <Root {...rootProps} style={{ flex: 1 }}>
      <View ref={listFrameRef} collapsable={false} style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={rows}
          extraData={[hint, draggingId]}
          keyExtractor={(r) => r.node.id}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          scrollEnabled={!draggingId}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
          onContentSizeChange={(_w, h) => {
            contentH.current = h;
          }}
          onLayout={(e) => {
            viewH.current = e.nativeEvent.layout.height;
          }}
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
            const rowHint = hint && hint.id === node.id ? hint.mode : null;
            let content;
            if (node.kind === 'group') {
              content = (
                <GroupRow
                  node={node}
                  progress={progress(nodes, node)}
                  leading={gripFor(node)}
                  onToggleCollapse={() => api.toggleCollapsed(node.id)}
                  onMore={() => setMenu(node.id)}
                />
              );
            } else if (node.kind === 'note') {
              content = (
                <AppText tone="muted" size={14} style={{ marginLeft: depth * 20 + spacing.sm }}>
                  {node.title}
                </AppText>
              );
            } else {
              const done = isDone(nodes, node);
              content = (
                <TaskRow
                  node={node}
                  depth={depth}
                  hasChildren={hasChildren}
                  done={done}
                  leading={gripFor(node)}
                  onToggleDone={() => api.setTaskDone(node.id, !done)}
                  onToggleCollapse={() => api.toggleCollapsed(node.id)}
                  onMore={() => setMenu(node.id)}
                />
              );
            }
            return (
              <View
                ref={(r) => {
                  if (r) rowRefs.current.set(node.id, r);
                  else rowRefs.current.delete(node.id);
                }}
                collapsable={false}
                style={{ opacity: draggingId === node.id ? 0.4 : 1 }}
              >
                {content}
                {rowHint ? <DropIndicator mode={rowHint} /> : null}
              </View>
            );
          }}
        />
      </View>

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
    </Root>
  );
}

/**
 * Insertion line (before / after) or outline (into a group) shown while dragging.
 * @param {{ mode: 'before' | 'after' | 'into' }} props
 */
function DropIndicator({ mode }) {
  const { colors } = useTheme();
  if (mode === 'into') {
    return (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderWidth: 2,
          borderColor: colors.accent,
          borderRadius: radius.lg,
          backgroundColor: colors.peakBg,
        }}
      />
    );
  }
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: 3,
        borderRadius: 2,
        backgroundColor: colors.accent,
        ...(mode === 'before' ? { top: -5 } : { bottom: -5 }),
      }}
    />
  );
}
