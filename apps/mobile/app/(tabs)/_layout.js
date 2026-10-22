import { Tabs } from 'expo-router';
import { CalendarDays, ListChecks } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions } from 'react-native';
import { WIDE_BREAKPOINT } from '../../src/lib/layout';
import { useTheme } from '../../src/theme/ThemeProvider';
import { fonts } from '../../src/theme/tokens';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          minHeight: 56,
        },
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
          href: wide ? null : undefined,
          title: t('tabs.calendar'),
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
