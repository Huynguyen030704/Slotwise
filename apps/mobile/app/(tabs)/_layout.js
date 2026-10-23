import { Redirect, Tabs } from 'expo-router';
import { CalendarCheck, CalendarDays, ListChecks } from '../../src/ui/icons';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions } from 'react-native';
import { WIDE_BREAKPOINT } from '../../src/lib/layout';
import { useAuth } from '../../src/data/AuthProvider';
import { useSettings } from '../../src/data/SettingsProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { fonts } from '../../src/theme/tokens';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT;
  const auth = useAuth();
  const settings = useSettings();
  const byClock = settings.mode === 'schedule';

  // First launch without an account: show the welcome screen once. Skipping it keeps the app fully
  // usable offline; signing in later is available under Account.
  if (settings.ready && !auth.loading && !auth.session && !settings.welcomeSeen) {
    return <Redirect href="/welcome" />;
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        // A single tab is pointless: the day sits beside the list on wide screens.
        tabBarStyle: wide
          ? { display: 'none' }
          : { backgroundColor: colors.surface, borderTopColor: colors.line, minHeight: 56 },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 12 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.list'),
          tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          // The day is shown next to the list on wide screens.
          href: wide || !byClock ? null : undefined,
          title: t('tabs.calendar'),
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          // Without a clock the Today list replaces the calendar.
          href: wide || byClock ? null : undefined,
          title: t('tabs.today'),
          tabBarIcon: ({ color, size }) => <CalendarCheck color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
