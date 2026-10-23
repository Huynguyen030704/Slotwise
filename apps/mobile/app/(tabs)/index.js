import { View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarPane } from '../../src/features/calendar/CalendarPane';
import { ListPane } from '../../src/features/list/ListPane';
import { TodayPane } from '../../src/features/today/TodayPane';
import { useSettings } from '../../src/data/SettingsProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { WIDE_BREAKPOINT } from '../../src/lib/layout';

/**
 * Narrow screens show the list alone (the day lives in its own tab). Wide screens show the list
 * and the day side by side so a task can be dragged from one onto the other.
 */
export default function ListScreen() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { mode } = useSettings();
  if (width < WIDE_BREAKPOINT) return <ListPane />;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <ListPane embedded />
      </View>
      <View style={{ flex: 1, minWidth: 0, borderLeftWidth: 1, borderLeftColor: colors.line }}>
        {mode === 'schedule' ? <CalendarPane embedded /> : <TodayPane embedded />}
      </View>
    </SafeAreaView>
  );
}
