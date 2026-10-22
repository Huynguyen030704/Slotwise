import { Pressable, View } from 'react-native';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Flag,
  MoreHorizontal,
  Pin,
  Wind,
  Zap,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../ui/AppText';
import { IconButton } from '../../ui/IconButton';
import { useTheme } from '../../theme/ThemeProvider';
import { MIN_TOUCH, radius, spacing } from '../../theme/tokens';
import { formatClock, formatDuration } from '../../lib/format';

/**
 * One task row. Leaves show duration, energy and pin; parents show a derived checkbox.
 * @param {{
 *   node: import('@slotwise/core/types.js').TreeNode,
 *   depth: number,
 *   hasChildren: boolean,
 *   done: boolean,
 *   onToggleDone: () => void,
 *   onToggleCollapse: () => void,
 *   onMore: () => void,
 * }} props
 */
export function TaskRow({
  node,
  depth,
  hasChildren,
  done,
  onToggleDone,
  onToggleCollapse,
  onMore,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const energyColor = node.energy === 'heavy' ? colors.heavy : colors.light;
  const EnergyIcon = node.energy === 'heavy' ? Zap : Wind;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: depth * 20,
        backgroundColor: colors.surface,
        borderColor: colors.line,
        borderWidth: 1,
        borderRadius: radius.md,
        paddingRight: spacing.xs,
      }}
    >
      {hasChildren ? (
        <IconButton
          label={t(node.collapsed ? 'list.expand' : 'list.collapse', { title: node.title })}
          onPress={onToggleCollapse}
          size={MIN_TOUCH}
        >
          {node.collapsed ? (
            <ChevronRight size={18} color={colors.muted} />
          ) : (
            <ChevronDown size={18} color={colors.muted} />
          )}
        </IconButton>
      ) : null}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={t(done ? 'list.markTodo' : 'list.markDone', { title: node.title })}
        onPress={onToggleDone}
        style={{
          width: MIN_TOUCH,
          height: MIN_TOUCH,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radius.sm,
            borderWidth: 2,
            borderColor: done ? colors.ok : colors.muted,
            backgroundColor: done ? colors.ok : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {done ? <Check size={16} color={colors.surface} strokeWidth={3} /> : null}
        </View>
      </Pressable>
      <View style={{ flex: 1, paddingVertical: spacing.sm, gap: spacing.xs }}>
        <AppText
          weight="bodyMedium"
          tone={done ? 'muted' : 'ink'}
          style={done ? { textDecorationLine: 'line-through' } : undefined}
        >
          {node.title}
        </AppText>
        {!hasChildren ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <EnergyIcon size={14} color={energyColor} />
              <AppText size={13} tone="muted">
                {t(`energy.${node.energy}`)} · {formatDuration(node.durationMin, t)}
              </AppText>
            </View>
            {node.pinnedStartMin !== null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Pin size={13} color={colors.muted} />
                <AppText size={13} tone="muted">
                  {formatClock(node.pinnedStartMin)}
                </AppText>
              </View>
            ) : null}
            {node.doLast ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Flag size={13} color={colors.muted} />
                <AppText size={13} tone="muted">
                  {t('list.doLastTag')}
                </AppText>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <IconButton label={t('list.more', { title: node.title })} onPress={onMore}>
        <MoreHorizontal size={20} color={colors.muted} />
      </IconButton>
    </View>
  );
}
