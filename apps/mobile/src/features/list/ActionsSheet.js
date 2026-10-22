import { Pressable } from 'react-native';
import {
  ArrowDown,
  ArrowUp,
  CalendarArrowDown,
  CalendarCheck,
  Check,
  Clock,
  CornerDownRight,
  FolderInput,
  Pencil,
  Pin,
  PinOff,
  SlidersHorizontal,
  Trash2,
} from '../../ui/icons';
import { useTranslation } from 'react-i18next';
import { childrenOf, isLeaf } from '@slotwise/core';
import { Sheet } from '../../ui/Sheet';
import { AppText } from '../../ui/AppText';
import { useTheme } from '../../theme/ThemeProvider';
import { MIN_TOUCH, spacing } from '../../theme/tokens';

/**
 * @param {{ icon: import('react').ReactNode, label: string, onPress: () => void, danger?: boolean }} props
 */
function Item({ icon, label, onPress, danger }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {icon}
      <AppText tone={danger ? 'danger' : 'ink'} weight="bodyMedium" style={{ flex: 1 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Keyboard/button alternatives for every drag action (CLAUDE.md section 9).
 * @param {{
 *   node: import('@slotwise/core/types.js').TreeNode | null,
 *   nodes: import('@slotwise/core/types.js').TreeNode[],
 *   onClose: () => void,
 *   onRename: () => void,
 *   onEdit?: () => void,
 *   onAddSubtask?: () => void,
 *   onDelete: () => void,
 *   onMove?: (target: import('@slotwise/core/tree.js').DropTarget) => void,
 *   onPin?: () => void,
 *   onUnpin?: () => void,
 *   onTomorrow?: () => void,
 *   onToday?: () => void,
 *   onLater?: () => void,
 *   done?: boolean,
 *   onToggleDone?: () => void,
 * }} props
 */
export function ActionsSheet({
  node,
  nodes,
  onClose,
  onRename,
  onEdit,
  onAddSubtask,
  onDelete,
  onMove,
  onPin,
  onUnpin,
  onTomorrow,
  onToday,
  onLater,
  done,
  onToggleDone,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!node)
    return (
      <Sheet visible={false} onClose={onClose}>
        {null}
      </Sheet>
    );

  const siblings = childrenOf(nodes, node.parentId);
  const idx = siblings.findIndex((s) => s.id === node.id);
  const prev = siblings[idx - 1];
  const next = siblings[idx + 1];
  const leaf = isLeaf(nodes, node);
  const groups = nodes.filter((n) => n.kind === 'group' && !n.deletedAt && n.id !== node.parentId);
  const run = (/** @type {() => void} */ fn) => () => {
    onClose();
    fn();
  };
  const ic = { size: 20, color: colors.ink };

  return (
    <Sheet visible title={node.title} onClose={onClose}>
      {leaf && onToggleDone ? (
        <Item
          icon={<Check {...ic} />}
          label={t(done ? 'actions.undone' : 'actions.done')}
          onPress={run(onToggleDone)}
        />
      ) : null}
      <Item icon={<Pencil {...ic} />} label={t('actions.rename')} onPress={run(onRename)} />
      {leaf && onEdit ? (
        <Item
          icon={<SlidersHorizontal {...ic} />}
          label={t('actions.edit')}
          onPress={run(onEdit)}
        />
      ) : null}
      {leaf && onPin ? (
        <Item icon={<Pin {...ic} />} label={t('actions.pinToTime')} onPress={run(onPin)} />
      ) : null}
      {leaf && node.pinnedStartMin !== null && onUnpin ? (
        <Item icon={<PinOff {...ic} />} label={t('actions.unpin')} onPress={run(onUnpin)} />
      ) : null}
      {leaf && onToday ? (
        <Item
          icon={<CalendarCheck {...ic} />}
          label={t('actions.doToday')}
          onPress={run(onToday)}
        />
      ) : null}
      {leaf && onTomorrow ? (
        <Item
          icon={<CalendarArrowDown {...ic} />}
          label={t('actions.scheduleTomorrow')}
          onPress={run(onTomorrow)}
        />
      ) : null}
      {leaf && onLater ? (
        <Item icon={<Clock {...ic} />} label={t('actions.later')} onPress={run(onLater)} />
      ) : null}
      {node.kind === 'task' && onAddSubtask ? (
        <Item
          icon={<CornerDownRight {...ic} />}
          label={t('actions.addSubtask')}
          onPress={run(onAddSubtask)}
        />
      ) : null}
      {onMove && prev ? (
        <Item
          icon={<ArrowUp {...ic} />}
          label={t('actions.moveUp')}
          onPress={run(() => onMove({ kind: 'before', id: prev.id }))}
        />
      ) : null}
      {onMove && next ? (
        <Item
          icon={<ArrowDown {...ic} />}
          label={t('actions.moveDown')}
          onPress={run(() => onMove({ kind: 'after', id: next.id }))}
        />
      ) : null}
      {onMove && node.kind === 'task'
        ? groups.map((g) => (
            <Item
              key={g.id}
              icon={<FolderInput {...ic} />}
              label={t('actions.moveToGroup', { title: g.title })}
              onPress={run(() => onMove({ kind: 'into', id: g.id }))}
            />
          ))
        : null}
      <Item
        icon={<Trash2 size={20} color={colors.danger} />}
        label={t('actions.delete')}
        onPress={run(onDelete)}
        danger
      />
    </Sheet>
  );
}
