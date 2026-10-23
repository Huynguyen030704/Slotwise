import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { KeyboardSpacer } from '../src/ui/KeyboardSpacer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useNodes } from '../src/data/NodesProvider';
import { AppText } from '../src/ui/AppText';
import { Button } from '../src/ui/Button';
import { Input } from '../src/ui/Input';
import { spacing } from '../src/theme/tokens';

export default function ImportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const api = useNodes();
  const [text, setText] = useState('');
  const [message, setMessage] = useState(/** @type {string | null} */ (null));

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const submit = () => {
    const { added } = api.importNotes(text);
    if (!added) {
      setMessage(t('import.nothing'));
      return;
    }
    close();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <AppText accessibilityRole="header" weight="heading" size={26}>
          {t('import.title')}
        </AppText>
        <AppText tone="muted">{t('import.hint')}</AppText>
        <Input
          value={text}
          onChangeText={(v) => {
            setText(v);
            setMessage(null);
          }}
          multiline
          autoFocus
          textAlignVertical="top"
          placeholder={t('import.placeholder')}
          accessibilityLabel={t('import.title')}
          style={{ minHeight: 240, padding: spacing.md, fontSize: 16 }}
        />
        {message ? (
          <AppText tone="danger" accessibilityLiveRegion="polite">
            {message}
          </AppText>
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' }}>
          <Button title={t('common.cancel')} variant="secondary" onPress={close} />
          <Button title={t('import.submit')} onPress={submit} disabled={!text.trim()} />
        </View>
        <KeyboardSpacer />
      </ScrollView>
    </SafeAreaView>
  );
}
