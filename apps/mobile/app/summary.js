import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { CalendarArrowDown, Copy } from '../src/ui/icons';
import { useTranslation } from 'react-i18next';
import { groupReport, leaves, reportToText, unfinishedOn } from '@slotwise/core';
import { useNodes } from '../src/data/NodesProvider';
import { localDate } from '../src/data/time';
import { formatDay } from '../src/lib/dates';
import { AppText } from '../src/ui/AppText';
import { Button } from '../src/ui/Button';
import { Snackbar } from '../src/ui/Snackbar';
import { useTheme } from '../src/theme/ThemeProvider';
import { radius, spacing } from '../src/theme/tokens';

export default function SummaryScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const api = useNodes();
  const today = localDate();
  const [withNotes, setWithNotes] = useState(false);
  const [snack, setSnack] = useState(
    /** @type {{ message: string, undo: boolean } | null} */ (null),
  );

  useEffect(() => {
    if (!snack) return undefined;
    const id = setTimeout(() => setSnack(null), 5000);
    return () => clearTimeout(id);
  }, [snack]);

  const { todayTotal, todayDone, open, report, text, hasNotes } = useMemo(() => {
    const ls = leaves(api.nodes);
    const planned = ls.filter((l) => l.scheduledDate === today || l.doneDate === today);
    const rep = groupReport(api.nodes);
    return {
      todayTotal: planned.length,
      todayDone: planned.filter((l) => l.status === 'done').length,
      open: unfinishedOn(api.nodes, today),
      report: rep,
      hasNotes: rep.some((r) => [...r.doneNotes, ...r.todoNotes].some(Boolean)),
      text: reportToText(
        rep,
        {
          heading: t('summary.reportHeading', { date: formatDay(today, i18n.language) }),
          noGroup: t('list.noGroup'),
        },
        { withNotes },
      ),
    };
  }, [api.nodes, today, t, i18n.language, withNotes]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <AppText weight="heading" size={26} accessibilityRole="header">
            {t('summary.title')}
          </AppText>
          <Button title={t('common.close')} variant="secondary" onPress={close} />
        </View>

        <View
          style={{
            gap: spacing.sm,
            padding: spacing.lg,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
          }}
        >
          <AppText tone="muted" size={13} style={{ textTransform: 'capitalize' }}>
            {formatDay(today, i18n.language)}
          </AppText>
          {todayTotal ? (
            <AppText weight="heading" size={22}>
              {t('summary.progress', { done: todayDone, total: todayTotal })}
            </AppText>
          ) : (
            <AppText tone="muted">{t('summary.noTasks')}</AppText>
          )}
          {todayTotal && !open.length ? <AppText tone="ok">{t('summary.allDone')}</AppText> : null}
        </View>

        {open.length ? (
          <View style={{ gap: spacing.sm }}>
            <AppText weight="bodyBold">{t('summary.unfinished')}</AppText>
            {open.map((n) => (
              <AppText key={n.id} tone="muted">
                • {n.title}
              </AppText>
            ))}
            <Button
              title={t('summary.rollOver', { n: open.length })}
              icon={<CalendarArrowDown size={18} color={colors.accentInk} />}
              onPress={() => {
                const count = api.rollOver(today);
                setSnack({ message: t('summary.rolled', { n: count }), undo: true });
              }}
            />
          </View>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <AppText weight="bodyBold">{t('summary.report')}</AppText>
          {hasNotes ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.md,
                minHeight: 44,
              }}
            >
              <View style={{ flex: 1 }}>
                <AppText weight="bodyMedium">{t('summary.withNotes')}</AppText>
                <AppText size={13} tone="muted">
                  {t('summary.withNotesHint')}
                </AppText>
              </View>
              <Switch
                value={withNotes}
                onValueChange={setWithNotes}
                accessibilityLabel={t('summary.withNotes')}
                trackColor={{ true: colors.accent, false: colors.line }}
              />
            </View>
          ) : null}
          {report.length ? (
            report.map((r) => (
              <View
                key={r.title ?? 'none'}
                style={{
                  gap: spacing.xs,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.line,
                  backgroundColor: colors.surface,
                }}
              >
                <AppText weight="bodyBold">
                  {r.title ?? t('list.noGroup')} · {r.done}/{r.total}
                </AppText>
                {r.doneTitles.map((x, i) => (
                  <View key={`d-${i}`}>
                    <AppText size={14} tone="ok">
                      ✓ {x}
                    </AppText>
                    {withNotes && r.doneNotes[i] ? (
                      <AppText size={13} tone="muted" style={{ marginLeft: spacing.lg }}>
                        {r.doneNotes[i]}
                      </AppText>
                    ) : null}
                  </View>
                ))}
                {r.todoTitles.map((x, i) => (
                  <View key={`t-${i}`}>
                    <AppText size={14} tone="muted">
                      ○ {x}
                    </AppText>
                    {withNotes && r.todoNotes[i] ? (
                      <AppText size={13} tone="muted" style={{ marginLeft: spacing.lg }}>
                        {r.todoNotes[i]}
                      </AppText>
                    ) : null}
                  </View>
                ))}
              </View>
            ))
          ) : (
            <AppText tone="muted">{t('summary.noReport')}</AppText>
          )}
          <Button
            title={t('summary.copy')}
            variant="secondary"
            disabled={!report.length}
            icon={<Copy size={18} color={colors.ink} />}
            onPress={async () => {
              await Clipboard.setStringAsync(text);
              setSnack({ message: t('summary.copied'), undo: false });
            }}
          />
        </View>
      </ScrollView>
      <Snackbar
        message={snack?.message ?? null}
        actionLabel={snack?.undo ? t('common.undo') : undefined}
        onAction={() => {
          api.undo();
          setSnack(null);
        }}
      />
    </SafeAreaView>
  );
}
