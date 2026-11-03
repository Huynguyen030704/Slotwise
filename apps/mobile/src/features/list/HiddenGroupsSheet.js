import { View } from 'react-native';
import { Eye } from '../../ui/icons';
import { useTranslation } from 'react-i18next';
import { Sheet } from '../../ui/Sheet';
import { Button } from '../../ui/Button';
import { AppText } from '../../ui/AppText';
import { useTheme } from '../../theme/ThemeProvider';
import { MIN_TOUCH, spacing } from '../../theme/tokens';

/**
 * The groups that were put away, each with a button to bring it back.
 * @param {{
 *   visible: boolean,
 *   groups: { id: string, title: string, total: number }[],
 *   onShow: (id: string) => void,
 *   onClose: () => void,
 * }} props
 */
export function HiddenGroupsSheet({ visible, groups, onShow, onClose }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} title={t('hidden.title')} onClose={onClose}>
      <AppText tone="muted" size={13}>
        {t('hidden.hint')}
      </AppText>
      {groups.map((g) => (
        <View
          key={g.id}
          style={{
            minHeight: MIN_TOUCH,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText weight="bodyMedium" numberOfLines={2}>
              {g.title}
            </AppText>
            <AppText size={13} tone="muted">
              {t('hidden.tasks', { n: g.total })}
            </AppText>
          </View>
          <Button
            title={t('hidden.show')}
            variant="secondary"
            icon={<Eye size={18} color={colors.ink} />}
            onPress={() => onShow(g.id)}
          />
        </View>
      ))}
    </Sheet>
  );
}
