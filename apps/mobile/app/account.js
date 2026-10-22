import { useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Download, LogOut, RefreshCw, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../src/data/AuthProvider';
import { useNodes } from '../src/data/NodesProvider';
import { useSync } from '../src/data/SyncProvider';
import { exportNodes } from '../src/data/exportData';
import { AppText } from '../src/ui/AppText';
import { Button } from '../src/ui/Button';
import { Sheet } from '../src/ui/Sheet';
import { useTheme } from '../src/theme/ThemeProvider';
import { MIN_TOUCH, fonts, radius, spacing } from '../src/theme/tokens';

/** @param {{ label: string, value: string, onChange: (v: string) => void, secure?: boolean }} props */
function Field({ label, value, onChange, secure }) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={label}
      placeholderTextColor={colors.muted}
      accessibilityLabel={label}
      secureTextEntry={secure}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType={secure ? 'default' : 'email-address'}
      style={{
        minHeight: MIN_TOUCH,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        color: colors.ink,
        backgroundColor: colors.surface,
        fontFamily: fonts.body,
        fontSize: 16,
      }}
    />
  );
}

export default function AccountScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const sync = useSync();
  const { nodes } = useNodes();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState(/** @type {'in' | 'up'} */ ('in'));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    /** @type {{ text: string, tone: 'danger' | 'ok' } | null} */ (null),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  /** @param {() => Promise<string | null>} fn */
  const run = async (fn) => {
    setBusy(true);
    setMessage(null);
    const err = await fn();
    setBusy(false);
    if (err) setMessage({ text: t('account.authError', { message: err }), tone: 'danger' });
    return err;
  };

  const submitEmail = async () => {
    const err = await run(() =>
      mode === 'in'
        ? auth.signInWithPassword(email.trim(), password)
        : auth.signUp(email.trim(), password),
    );
    if (!err && mode === 'up') setMessage({ text: t('account.checkEmail'), tone: 'ok' });
  };

  const header = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <AppText accessibilityRole="header" weight="heading" size={26}>
        {t('account.title')}
      </AppText>
      <Button title={t('common.close')} variant="secondary" onPress={close} />
    </View>
  );

  const card = {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  };

  if (!auth.configured) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
          {header}
          <View style={card}>
            <AppText tone="muted">{t('account.notConfigured')}</AppText>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (auth.loading) {
    return (
      <SafeAreaView style={{ flex: 1, padding: spacing.lg }}>
        {header}
        <ActivityIndicator accessibilityLabel="loading" color={colors.accent} />
      </SafeAreaView>
    );
  }

  const user = auth.session?.user;
  const lastSync = sync.lastSyncAt
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(
        sync.lastSyncAt,
      )
    : null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {header}

        {!user ? (
          <View style={card}>
            <AppText tone="muted">{t('account.intro')}</AppText>
            <Button
              title={t('account.google')}
              onPress={() => run(auth.signInWithGoogle)}
              disabled={busy}
            />
            <AppText tone="muted" size={13} style={{ textAlign: 'center' }}>
              {t('account.or')}
            </AppText>
            <Field label={t('account.email')} value={email} onChange={setEmail} />
            <Field label={t('account.password')} value={password} onChange={setPassword} secure />
            <Button
              title={mode === 'in' ? t('account.signIn') : t('account.signUp')}
              variant="secondary"
              onPress={submitEmail}
              disabled={busy || !email.trim() || password.length < 6}
            />
            <Button
              title={mode === 'in' ? t('account.toSignUp') : t('account.toSignIn')}
              variant="secondary"
              onPress={() => setMode(mode === 'in' ? 'up' : 'in')}
            />
            {busy ? <ActivityIndicator color={colors.accent} /> : null}
          </View>
        ) : (
          <>
            <View style={card}>
              <AppText tone="muted" size={13}>
                {t('account.signedInAs')}
              </AppText>
              <AppText weight="bodyBold">{user.email ?? user.id}</AppText>
              <AppText
                tone={sync.state === 'error' ? 'danger' : sync.state === 'idle' ? 'ok' : 'muted'}
              >
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
              <Button
                title={t('account.syncNow')}
                icon={<RefreshCw size={18} color={colors.accentInk} />}
                onPress={sync.syncNow}
                disabled={sync.state === 'syncing' || sync.state === 'conflict'}
              />
            </View>

            {sync.state === 'conflict' ? (
              <View style={[card, { borderColor: colors.danger }]} accessibilityRole="alert">
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
                <Button title={t('account.signOut')} variant="secondary" onPress={auth.signOut} />
              </View>
            ) : null}

            <View style={card}>
              <Button
                title={t('account.export')}
                variant="secondary"
                icon={<Download size={18} color={colors.ink} />}
                onPress={async () => {
                  await exportNodes(nodes, t('account.exportFile'));
                  setMessage({ text: t('account.exported', { count: nodes.length }), tone: 'ok' });
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
              <Button
                title={t('account.delete')}
                variant="danger"
                icon={<Trash2 size={18} color={colors.accentInk} />}
                onPress={() => setConfirmDelete(true)}
              />
            </View>
          </>
        )}

        {message ? (
          <AppText tone={message.tone} accessibilityLiveRegion="polite">
            {message.text}
          </AppText>
        ) : null}
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
