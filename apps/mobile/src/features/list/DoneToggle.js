import { Pressable } from 'react-native';
import { Eye, EyeOff } from '../../ui/icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../ui/AppText';
import { tappable } from '../../lib/touch';
import { useTheme } from '../../theme/ThemeProvider';
import { MIN_TOUCH, radius, spacing } from '../../theme/tokens';

/**
 * Button that hides or shows the tasks already done, with how many there are.
 * @param {{ count: number, hidden: boolean, onToggle: () => void }} props
 */
export function DoneToggle({ count, hidden, onToggle }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const Icon = hidden ? Eye : EyeOff;
  const label = hidden ? t('list.showDone', { n: count }) : t('list.hideDone', { n: count });
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: hidden }}
      onPress={onToggle}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        minHeight: MIN_TOUCH,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        opacity: pressed ? 0.7 : 1,
        ...tappable,
      })}
    >
      <Icon size={18} color={colors.muted} />
      <AppText size={14} weight="bodyMedium">
        {label}
      </AppText>
    </Pressable>
  );
}
