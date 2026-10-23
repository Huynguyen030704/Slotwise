import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { FormField } from '../../ui/FormField';
import { useAuth } from '../../data/AuthProvider';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { MIN_PASSWORD, authErrorKey, isValidEmail } from './authErrors';

/**
 * Sign in or create an account with email and password. New accounts must confirm their email.
 */
export function AuthForm() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const auth = useAuth();

  const [mode, setMode] = useState(/** @type {'in' | 'up'} */ ('in'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(/** @type {string | null} */ (null));
  const [notice, setNotice] = useState(/** @type {string | null} */ (null));
  const passwordRef = useRef(/** @type {any} */ (null));

  const emailError = tried && !isValidEmail(email) ? t('auth.errors.emailInvalid') : undefined;
  const passwordError =
    tried && password.length < MIN_PASSWORD
      ? t('auth.errors.passwordShort', { n: MIN_PASSWORD })
      : undefined;

  /** @param {string} raw */
  const explain = (raw) => t(`auth.errors.${authErrorKey(raw)}`);

  const submit = async () => {
    setTried(true);
    setFormError(null);
    setNotice(null);
    if (!isValidEmail(email) || password.length < MIN_PASSWORD) return;
    setBusy(true);
    const err =
      mode === 'in'
        ? await auth.signInWithPassword(email.trim(), password)
        : await auth.signUp(email.trim(), password);
    setBusy(false);
    if (err) setFormError(explain(err));
    else if (mode === 'up') setNotice(t('auth.checkEmail'));
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          padding: 4,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.bg,
        }}
      >
        {['in', 'up'].map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setMode(/** @type {'in' | 'up'} */ (m));
                setFormError(null);
                setNotice(null);
              }}
              style={{
                flex: 1,
                minHeight: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.sm + 2,
                backgroundColor: active ? colors.accent : 'transparent',
              }}
            >
              <AppText weight="bodyBold" size={14} tone={active ? 'accentInk' : 'muted'}>
                {m === 'in' ? t('auth.signIn') : t('auth.signUp')}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <FormField
        label={t('auth.email')}
        value={email}
        onChange={setEmail}
        error={emailError}
        keyboardType="email-address"
        autoComplete="email"
        returnKeyType="next"
        onSubmit={() => passwordRef.current?.focus()}
        editable={!busy}
      />
      <FormField
        ref={passwordRef}
        label={t('auth.password')}
        value={password}
        onChange={setPassword}
        error={passwordError}
        hint={mode === 'up' ? t('auth.passwordHint', { n: MIN_PASSWORD }) : undefined}
        password
        showLabel={t('auth.showPassword')}
        hideLabel={t('auth.hidePassword')}
        autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        returnKeyType="done"
        onSubmit={submit}
        editable={!busy}
      />

      {formError ? (
        <AppText tone="danger" size={14} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {formError}
        </AppText>
      ) : null}
      {notice ? (
        <AppText tone="ok" size={14} accessibilityLiveRegion="polite">
          {notice}
        </AppText>
      ) : null}

      <Button
        title={mode === 'in' ? t('auth.signIn') : t('auth.createAccount')}
        onPress={submit}
        loading={busy}
      />
    </View>
  );
}
