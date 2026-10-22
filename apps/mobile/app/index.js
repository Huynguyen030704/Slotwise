import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Moon, Sun, Languages } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../src/theme/ThemeProvider';
import { MIN_TOUCH, fonts, radius, spacing } from '../src/theme/tokens';

export default function Home() {
  const { t, i18n } = useTranslation();
  const { colors, scheme, toggle } = useTheme();
  const nextLang = i18n.language === 'vi' ? 'en' : 'vi';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.heading }]}>
          {t('app.name')}
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.switchLanguage')}
            onPress={() => i18n.changeLanguage(nextLang)}
            style={[styles.iconBtn, { borderColor: colors.line, backgroundColor: colors.surface }]}
          >
            <Languages size={20} color={colors.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              scheme === 'dark' ? t('settings.switchToLight') : t('settings.switchToDark')
            }
            onPress={toggle}
            style={[styles.iconBtn, { borderColor: colors.line, backgroundColor: colors.surface }]}
          >
            {scheme === 'dark' ? (
              <Sun size={20} color={colors.ink} />
            ) : (
              <Moon size={20} color={colors.ink} />
            )}
          </Pressable>
        </View>
      </View>
      <Text style={[styles.tagline, { color: colors.muted, fontFamily: fonts.body }]}>
        {t('app.tagline')}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={{ color: colors.ink, fontFamily: fonts.body, fontSize: 16 }}>
          {t('home.empty')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: { fontSize: 16 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg },
});
