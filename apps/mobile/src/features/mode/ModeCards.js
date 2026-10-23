import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ListChecks } from '../../ui/icons';
import { AppText } from '../../ui/AppText';
import { useTheme } from '../../theme/ThemeProvider';
import { MIN_TOUCH, radius, spacing } from '../../theme/tokens';

const OPTIONS = /** @type {const} */ ([
  { value: 'schedule', Icon: CalendarDays },
  { value: 'tasks', Icon: ListChecks },
]);

/**
 * Pick how to use Slotwise: tasks placed on a timeline, or plain task lists.
 * @param {{ value: 'schedule' | 'tasks', onChange: (m: 'schedule' | 'tasks') => void }} props
 */
export function ModeCards({ value, onChange }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
      {OPTIONS.map(({ value: v, Icon }) => {
        const active = value === v;
        return (
          <Pressable
            key={v}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${t(`mode.${v}.title`)}. ${t(`mode.${v}.body`)}`}
            onPress={() => onChange(v)}
            style={({ pressed }) => ({
              minHeight: MIN_TOUCH + 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: active ? 2 : 1,
              borderColor: active ? colors.accent : colors.line,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? colors.accent : colors.bg,
              }}
            >
              <Icon size={20} color={active ? colors.accentInk : colors.muted} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText weight="bodyBold">{t(`mode.${v}.title`)}</AppText>
              <AppText size={13} tone="muted">
                {t(`mode.${v}.body`)}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
