import { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CalendarCheck, CloudOff, Layers, Zap } from '../src/ui/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../src/data/AuthProvider';
import { useSettings } from '../src/data/SettingsProvider';
import { AuthForm } from '../src/features/auth/AuthForm';
import { AppText } from '../src/ui/AppText';
import { PrefButtons } from '../src/ui/PrefButtons';
import { useTheme } from '../src/theme/ThemeProvider';
import { WIDE_BREAKPOINT } from '../src/lib/layout';
import { MIN_TOUCH, radius, spacing } from '../src/theme/tokens';

/**
 * App mark: indigo tile with a calendar tick (inverted on the indigo panel).
 * @param {{ size?: number, inverse?: boolean }} props
 */
function BrandMark({ size = 56, inverse = false }) {
  const { colors } = useTheme();
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: inverse ? colors.accentInk : colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CalendarCheck size={size * 0.52} color={inverse ? colors.accent : colors.accentInk} />
    </View>
  );
}

/** @param {{ onAccent?: boolean }} props */
function ValueProps({ onAccent = false }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const items = [
    { Icon: Layers, key: 'plan' },
    { Icon: Zap, key: 'energy' },
    { Icon: CloudOff, key: 'offline' },
  ];
  const tone = onAccent ? 'accentInk' : 'ink';
  return (
    <View style={{ gap: spacing.lg }}>
      {items.map(({ Icon, key }) => (
        <View key={key} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: onAccent ? colors.accentInk : colors.line,
              backgroundColor: onAccent ? 'transparent' : colors.surface,
            }}
          >
            <Icon size={20} color={onAccent ? colors.accentInk : colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText weight="bodyBold" tone={tone}>
              {t(`welcome.props.${key}.title`)}
            </AppText>
            <AppText
              size={14}
              tone={onAccent ? 'accentInk' : 'muted'}
              style={onAccent ? { opacity: 0.85 } : undefined}
            >
              {t(`welcome.props.${key}.body`)}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const { markWelcomeSeen } = useSettings();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;

  const enter = () => {
    markWelcomeSeen();
    router.replace('/');
  };

  // Signed in (email, or back from the Google redirect): remember it and go to the app.
  useEffect(() => {
    if (auth.session) enter();
  }, [auth.session]);

  const form = (
    <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <AppText accessibilityRole="header" weight="heading" size={28}>
          {t('welcome.formTitle')}
        </AppText>
        <AppText tone="muted">{t('welcome.formSubtitle')}</AppText>
      </View>
      {auth.configured ? (
        <AuthForm />
      ) : (
        <View
          style={{
            padding: spacing.lg,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
          }}
        >
          <AppText tone="muted">{t('account.notConfigured')}</AppText>
        </View>
      )}
      <View style={{ gap: spacing.xs, alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          onPress={enter}
          style={({ pressed }) => ({
            minHeight: MIN_TOUCH,
            paddingHorizontal: spacing.lg,
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <AppText tone="accent" weight="bodyBold">
            {t('welcome.skip')}
          </AppText>
        </Pressable>
        <AppText size={13} tone="muted" style={{ textAlign: 'center' }}>
          {t('welcome.skipHint')}
        </AppText>
      </View>
    </View>
  );

  if (wide) {
    return (
      <SafeAreaView style={{ flex: 1, flexDirection: 'row' }}>
        <View
          style={{
            flex: 1,
            padding: spacing.xl * 2,
            justifyContent: 'center',
            gap: spacing.xl,
            backgroundColor: colors.accent,
          }}
        >
          <BrandMark inverse />
          <View style={{ gap: spacing.sm }}>
            <AppText weight="heading" size={44} tone="accentInk" accessibilityRole="header">
              {t('app.name')}
            </AppText>
            <AppText size={18} tone="accentInk" style={{ opacity: 0.9 }}>
              {t('welcome.tagline')}
            </AppText>
          </View>
          <ValueProps onAccent />
        </View>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ padding: spacing.lg, alignItems: 'flex-end' }}>
            <PrefButtons />
          </View>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl }}
            keyboardShouldPersistTaps="handled"
          >
            {form}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            gap: spacing.xl,
            paddingBottom: spacing.xl * 2,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: spacing.xl }}>
            <View style={{ alignItems: 'flex-end' }}>
              <PrefButtons />
            </View>
            <View style={{ gap: spacing.md, alignItems: 'flex-start' }}>
              <BrandMark />
              <AppText weight="heading" size={34} accessibilityRole="header">
                {t('app.name')}
              </AppText>
              <AppText tone="muted" size={16}>
                {t('welcome.tagline')}
              </AppText>
            </View>
            {form}
            <ValueProps />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
