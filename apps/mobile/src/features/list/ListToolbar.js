import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Archive, ChevronsDownUp, ChevronsUpDown, FolderTree, Search, X } from '../../ui/icons';
import { ChipButton } from '../../ui/ChipButton';
import { IconButton } from '../../ui/IconButton';
import { Input } from '../../ui/Input';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { DoneToggle } from './DoneToggle';

/**
 * Search box and the buttons that make a long list manageable: hide done tasks, collapse or
 * expand everything, jump to a group.
 * @param {{
 *   query: string,
 *   onQuery: (q: string) => void,
 *   doneCount: number,
 *   hideDone: boolean,
 *   onToggleDone: () => void,
 *   canCollapse: boolean,
 *   anyExpanded: boolean,
 *   onToggleAll: () => void,
 *   groupCount: number,
 *   onJump: () => void,
 *   hiddenCount: number,
 *   onOpenHidden: () => void,
 * }} props
 */
export function ListToolbar({
  query,
  onQuery,
  doneCount,
  hideDone,
  onToggleDone,
  canCollapse,
  anyExpanded,
  onToggleAll,
  groupCount,
  onJump,
  hiddenCount,
  onOpenHidden,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Input
            value={query}
            onChangeText={onQuery}
            placeholder={t('search.placeholder')}
            accessibilityLabel={t('search.placeholder')}
            returnKeyType="search"
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect={false}
            style={{ paddingLeft: 40 }}
          />
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: spacing.md, justifyContent: 'center' }}
          >
            <Search size={18} color={colors.muted} />
          </View>
        </View>
        {query ? (
          <IconButton label={t('search.clear')} onPress={() => onQuery('')}>
            <X size={20} color={colors.ink} />
          </IconButton>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {doneCount ? (
          <DoneToggle count={doneCount} hidden={hideDone} onToggle={onToggleDone} />
        ) : null}
        {canCollapse ? (
          <ChipButton
            label={t(anyExpanded ? 'list.collapseAll' : 'list.expandAll')}
            icon={(p) => (anyExpanded ? <ChevronsDownUp {...p} /> : <ChevronsUpDown {...p} />)}
            onPress={onToggleAll}
          />
        ) : null}
        {hiddenCount ? (
          <ChipButton
            label={t('hidden.open', { n: hiddenCount })}
            icon={(p) => <Archive {...p} />}
            onPress={onOpenHidden}
          />
        ) : null}
        {groupCount > 1 ? (
          <ChipButton label={t('jump.open')} icon={(p) => <FolderTree {...p} />} onPress={onJump} />
        ) : null}
      </View>
    </View>
  );
}
