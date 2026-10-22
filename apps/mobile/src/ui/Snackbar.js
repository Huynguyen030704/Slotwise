import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, radius, spacing } from '../theme/tokens';

/**
 * @param {{ message: string | null, actionLabel?: string, onAction?: () => void }} props
 */
export function Snackbar({ message, actionLabel, onAction }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom: spacing.lg,
        backgroundColor: colors.ink,
        borderRadius: radius.md,
        paddingLeft: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <AppText style={{ color: colors.bg, flex: 1 }}>{message}</AppText>
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={{ minHeight: MIN_TOUCH, paddingHorizontal: spacing.lg, justifyContent: 'center' }}
        >
          <AppText weight="bodyBold" style={{ color: colors.light }}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
