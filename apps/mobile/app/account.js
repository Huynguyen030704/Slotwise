import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Check,
  Cloud,
  CloudOff,
  Download,
  Layers,
  LogOut,
  RefreshCw,
  Trash2,
} from '../src/ui/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../src/data/AuthProvider';
import { useNodes } from '../src/data/NodesProvider';
import { useSync } from '../src/data/SyncProvider';
import { exportNodes } from '../src/data/exportData';
import { AuthForm } from '../src/features/auth/AuthForm';
import { AppText } from '../src/ui/AppText';
import { Button } from '../src/ui/Button';
import { KeyboardSpacer } from '../src/ui/KeyboardSpacer';
import { Sheet } from '../src/ui/Sheet';
import { useTheme } from '../src/theme/ThemeProvider';
import { radius, spacing } from '../src/theme/tokens';

/** @param {{ children: import('react').ReactNode, danger?: boolean }} props */
function Card({ children, danger }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: danger ? colors.danger : colors.line,
        backgroundColor: colors.surface,
      }}
    >
      {children}
    </View>
  );
}

/** @param {{ icon: import('react').ReactNode, children: import('react').ReactNode }} props */
function Benefit({ icon, children }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
      <View style={{ marginTop: 2 }}>{icon}</View>
      <AppText style={{ flex: 1 }} tone="muted">
        {children}
      </AppText>
    </View>
  );
}

const SYNC_TONE = /** @type {const} */ ({
  signedOut: 'muted',
  idle: 'ok',
  syncing: 'accent',
  offline: 'muted',
  error: 'danger',
  conflict: 'danger',
});

export default function AccountScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const sync = useSync();
  const { nodes } = useNodes();

  const [message, setMessage] = useState(
    /** @type {{ text: string, tone: 'danger' | 'ok' } | null} */ (null),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const header = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <AppText accessibilityRole="header" weight="heading" size={26}>
        {t('account.title')}
      </AppText>
      <Button title={t('common.close')} variant="secondary" onPress={close} />
    </View>
  );

  /** @type {import('react-native').ViewStyle} */
  const column = { width: '100%', maxWidth: 560, alignSelf: 'center', gap: spacing.lg };
  const scroll = { padding: spacing.lg };

  if (!auth.configured) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={scroll}>
          <View style={column}>
            {header}
            <Card>
              <CloudOff size={28} color={colors.muted} />
              <AppText tone="muted">{t('account.notConfigured')}</AppText>
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (auth.loading) {
    return (
      <SafeAreaView style={{ flex: 1, padding: spacing.lg }}>
        <View style={column}>
          {header}
          <ActivityIndicator accessibilityLabel="loading" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const user = auth.session?.user;
  const lastSync = sync.lastSyncAt
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(
        sync.lastSyncAt,
      )
    : null;
  const tone = SYNC_TONE[sync.state];
  const StateIcon =
    sync.state === 'idle'
      ? Check
      : sync.state === 'syncing'
        ? RefreshCw
        : sync.state === 'offline'
          ? CloudOff
          : AlertTriangle;
  const initial = (user?.email ?? '?').trim().charAt(0).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={scroll} keyboardShouldPersistTaps="handled">
        <View style={column}>
          {header}

          {!user ? (
            <>
              <Card>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.peakBg,
                  }}
                >
                  <Cloud size={26} color={colors.accent} />
                </View>
                <AppText weight="heading" size={20}>
                  {t('account.introTitle')}
                </AppText>
                <Benefit icon={<Layers size={18} color={colors.accent} />}>
                  {t('account.benefits.devices')}
                </Benefit>
                <Benefit icon={<CloudOff size={18} color={colors.accent} />}>
                  {t('account.benefits.offline')}
                </Benefit>
                <Benefit icon={<Check size={18} color={colors.accent} />}>
                  {t('account.benefits.merge')}
                </Benefit>
              </Card>
              <Card>
                <AuthForm />
              </Card>
              <AppText tone="muted" size={13} style={{ textAlign: 'center' }}>
                {t('account.optional')}
              </AppText>
            </>
          ) : (
            <>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View
                    accessibilityElementsHidden
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.accent,
                    }}
                  >
                    <AppText weight="heading" size={20} tone="accentInk">
                      {initial}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText tone="muted" size={13}>
                      {t('account.signedInAs')}
                    </AppText>
                    <AppText weight="bodyBold" numberOfLines={1}>
                      {user.email ?? user.id}
                    </AppText>
                  </View>
                </View>

                <View
                  accessibilityLiveRegion="polite"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    padding: spacing.md,
                    borderRadius: radius.md,
                    backgroundColor: colors.bg,
                  }}
                >
                  <StateIcon size={18} color={colors[tone]} />
                  <View style={{ flex: 1 }}>
                    <AppText tone={tone} weight="bodyBold" size={14}>
                      {t(`account.syncState.${sync.state}`)}
                    </AppText>
                    {lastSync ? (
                      <AppText tone="muted" size={13}>
                        {t('account.lastSync', { time: lastSync })}
                      </AppText>
                    ) : null}
                    {sync.error && sync.state === 'error' ? (
                      <AppText tone="danger" size={13}>
                        {sync.error}
                      </AppText>
                    ) : null}
                  </View>
                </View>

                <Button
                  title={t('account.syncNow')}
                  icon={<RefreshCw size={18} color={colors.accentInk} />}
                  loading={sync.state === 'syncing'}
                  onPress={sync.syncNow}
                  disabled={sync.state === 'conflict'}
                />
              </Card>

              {sync.state === 'conflict' ? (
                <View accessibilityRole="alert">
                  <Card danger>
                    <AppText weight="bodyBold">{t('account.conflictTitle')}</AppText>
                    <AppText tone="muted">{t('account.conflictBody')}</AppText>
                    <Button
                      title={t('account.export')}
                      variant="secondary"
                      icon={<Download size={18} color={colors.ink} />}
                      onPress={() => exportNodes(nodes, t('account.exportFile'))}
                    />
                    <Button
                      title={t('account.conflictReplace')}
                      variant="danger"
                      onPress={sync.replaceLocalWithAccount}
                    />
                    <Button
                      title={t('account.signOut')}
                      variant="secondary"
                      onPress={auth.signOut}
                    />
                  </Card>
                </View>
              ) : null}

              <Card>
                <AppText weight="bodyBold">{t('account.dataTitle')}</AppText>
                <AppText tone="muted" size={13}>
                  {t('account.exportHint')}
                </AppText>
                <Button
                  title={t('account.export')}
                  variant="secondary"
                  icon={<Download size={18} color={colors.ink} />}
                  onPress={async () => {
                    await exportNodes(nodes, t('account.exportFile'));
                    setMessage({
                      text: t('account.exported', { count: nodes.length }),
                      tone: 'ok',
                    });
                  }}
                />
                <Button
                  title={t('account.signOut')}
                  variant="secondary"
                  icon={<LogOut size={18} color={colors.ink} />}
                  onPress={auth.signOut}
                />
                <AppText tone="muted" size={13}>
                  {t('account.signOutHint')}
                </AppText>
              </Card>

              <Card danger>
                <AppText weight="bodyBold" tone="danger">
                  {t('account.dangerTitle')}
                </AppText>
                <AppText tone="muted" size={13}>
                  {t('account.deleteHint')}
                </AppText>
                <Button
                  title={t('account.delete')}
                  variant="danger"
                  icon={<Trash2 size={18} color={colors.accentInk} />}
                  onPress={() => setConfirmDelete(true)}
                />
              </Card>
            </>
          )}

          {message ? (
            <AppText tone={message.tone} accessibilityLiveRegion="polite">
              {message.text}
            </AppText>
          ) : null}
        </View>
        <KeyboardSpacer />
      </ScrollView>

      <Sheet
        visible={confirmDelete}
        title={t('account.deleteTitle')}
        onClose={() => setConfirmDelete(false)}
      >
        <AppText tone="muted">{t('account.deleteBody')}</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' }}>
          <Button
            title={t('common.cancel')}
            variant="secondary"
            onPress={() => setConfirmDelete(false)}
          />
          <Button
            title={t('account.deleteConfirm')}
            variant="danger"
            onPress={async () => {
              setConfirmDelete(false);
              const err = await auth.deleteAccount();
              if (err)
                setMessage({ text: t('account.deleteFailed', { message: err }), tone: 'danger' });
              else close();
            }}
          />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}
