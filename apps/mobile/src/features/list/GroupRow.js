import { View } from 'react-native';
import { ChevronDown, ChevronRight, MoreHorizontal } from '../../ui/icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../ui/AppText';
import { IconButton } from '../../ui/IconButton';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';

/**
 * Group header with progress `done / total leaves`.
 * @param {{
 *   node: import('@slotwise/core/types.js').TreeNode,
 *   progress: { done: number, total: number },
 *   onToggleCollapse: () => void,
 *   onMore: () => void,
 *   leading?: import('react').ReactNode,
 * }} props
 */
export function GroupRow({ node, progress, onToggleCollapse, onMore, leading }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const ratio = progress.total ? progress.done / progress.total : 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        backgroundColor: colors.surface,
        borderColor: colors.line,
        borderWidth: 1,
        borderRadius: radius.lg,
        paddingRight: spacing.xs,
      }}
    >
      {leading}
      <IconButton
        label={t(node.collapsed ? 'list.expand' : 'list.collapse', { title: node.title })}
        onPress={onToggleCollapse}
      >
        {node.collapsed ? (
          <ChevronRight size={18} color={colors.ink} />
        ) : (
          <ChevronDown size={18} color={colors.ink} />
        )}
      </IconButton>
      <View style={{ flex: 1, paddingVertical: spacing.sm, gap: spacing.xs }}>
        <AppText accessibilityRole="header" weight="heading" size={18}>
          {node.title}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.busy,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.round(ratio * 100)}%`,
                height: 6,
                backgroundColor: colors.ok,
              }}
            />
          </View>
          <AppText size={13} tone="muted">
            {t('list.progress', { done: progress.done, total: progress.total })}
          </AppText>
        </View>
      </View>
      <IconButton label={t('list.more', { title: node.title })} onPress={onMore}>
        <MoreHorizontal size={20} color={colors.muted} />
      </IconButton>
    </View>
  );
}
