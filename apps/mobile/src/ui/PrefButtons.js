import { View } from 'react-native';
import { Languages, Moon, Sun } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { IconButton } from './IconButton';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';

/** Language and light/dark switches. */
export function PrefButtons() {
  const { t, i18n } = useTranslation();
  const { colors, scheme, toggle } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
  );
}
