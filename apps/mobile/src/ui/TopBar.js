import { View } from 'react-native';
import { AppText } from './AppText';
import { PrefButtons } from './PrefButtons';
import { spacing } from '../theme/tokens';

/**
 * Screen title with language and theme switches. `extra` renders before them.
 * @param {{ title: string, extra?: import('react').ReactNode }} props
 */
export function TopBar({ title, extra }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        zIndex: 10, // keeps button tooltips above the content below
        gap: spacing.sm,
      }}
    >
      <AppText accessibilityRole="header" weight="heading" size={26} style={{ flexGrow: 1 }}>
        {title}
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {extra}
        <PrefButtons />
      </View>
    </View>
  );
}
