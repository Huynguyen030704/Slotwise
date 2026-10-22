import { View } from 'react-native';
import { Languages, Moon, Sun } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';

/**
 * Screen title with language and theme switches. `extra` renders before them.
 * @param {{ title: string, extra?: import('react').ReactNode }} props
 */
export function TopBar({ title, extra }) {
  const { t, i18n } = useTranslation();
  const { colors, scheme, toggle } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
      }}
    >
      <AppText accessibilityRole="header" weight="heading" size={26} style={{ flex: 1 }}>
        {title}
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {extra}
        <IconButton
          label={t('settings.switchLanguage')}
          onPress={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}
        >
          <Languages size={20} color={colors.ink} />
        </IconButton>
        <IconButton
          label={scheme === 'dark' ? t('settings.switchToLight') : t('settings.switchToDark')}
          onPress={toggle}
        >
          {scheme === 'dark' ? (
            <Sun size={20} color={colors.ink} />
          ) : (
            <Moon size={20} color={colors.ink} />
          )}
        </IconButton>
      </View>
    </View>
  );
}
