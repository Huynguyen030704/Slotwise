import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../../src/ui/TopBar';
import { spacing } from '../../src/theme/tokens';

export default function CalendarScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, padding: spacing.lg }}>
      <TopBar title={t('calendar.title')} />
      <View style={{ flex: 1 }} />
    </SafeAreaView>
  );
}
