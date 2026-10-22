import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from '../theme/tokens';

/**
 * Bottom sheet. Tapping the backdrop or the system back gesture closes it.
 * @param {{ visible: boolean, title?: string, onClose: () => void, children: import('react').ReactNode }} props
 */
export function Sheet({ visible, title, onClose, children }) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="close"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          borderColor: colors.line,
          borderWidth: 1,
          maxHeight: '80%',
        }}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          keyboardShouldPersistTaps="handled"
        >
          {title ? (
            <AppText weight="heading" size={20}>
              {title}
            </AppText>
          ) : null}
          <View style={{ gap: spacing.sm }}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
