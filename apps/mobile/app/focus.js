import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, Pause, Play, RotateCcw, SkipForward } from '../src/ui/icons';
import { useTranslation } from 'react-i18next';
import { useNodes } from '../src/data/NodesProvider';
import { localDate } from '../src/data/time';
import { useSettings } from '../src/data/SettingsProvider';
import { taskBuckets } from '@slotwise/core';
import { formatClock, formatDuration } from '../src/lib/format';
import { AppText } from '../src/ui/AppText';
import { Button } from '../src/ui/Button';
import { useDayPlan } from '../src/features/calendar/useDayPlan';
import { useTheme } from '../src/theme/ThemeProvider';
import { radius, spacing } from '../src/theme/tokens';

const FOCUS_SECONDS = 25 * 60;

/** @param {number} s */
const mmss = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function FocusScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const api = useNodes();
  const { plan } = useDayPlan(localDate());
  const { mode } = useSettings();
  const byClock = mode === 'schedule';

  /** Open tasks of today: in time order on the timeline, in list order without a clock. */
  const queue = useMemo(
    () =>
      byClock
        ? plan.tasks
            .filter((n) => plan.slots[n.id] !== undefined)
            .sort((a, b) => plan.slots[a.id] - plan.slots[b.id])
        : taskBuckets(api.nodes, localDate()).today,
    [byClock, plan, api.nodes],
  );
  const [index, setIndex] = useState(0);
  const current = queue.length ? queue[Math.min(index, queue.length - 1)] : null;

  const [remaining, setRemaining] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);

  const resetTimer = useCallback(() => {
    setRunning(false);
    setRemaining(FOCUS_SECONDS);
  }, []);

  // A new task starts with a fresh timer.
  useEffect(() => {
    resetTimer();
  }, [current?.id, resetTimer]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) setRunning(false);
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const start = () => {
    endAt.current = Date.now() + remaining * 1000;
    setRunning(true);
  };
  const finished = remaining === 0;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!current) {
    return (
      <SafeAreaView
        style={{ flex: 1, padding: spacing.lg, gap: spacing.lg, justifyContent: 'center' }}
      >
        <AppText weight="heading" size={26} accessibilityRole="header">
          {t('focus.title')}
        </AppText>
        <AppText tone="muted">{t('focus.empty')}</AppText>
        <Button title={t('common.close')} variant="secondary" onPress={close} />
      </SafeAreaView>
    );
  }

  const start0 = byClock ? plan.slots[current.id] : null;
  const n = queue.length;
  const i = Math.min(index, n - 1) + 1;

  return (
    <SafeAreaView style={{ flex: 1, padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText weight="heading" size={20} accessibilityRole="header">
          {t('focus.title')}
        </AppText>
        <Button title={t('common.close')} variant="secondary" onPress={close} />
      </View>

      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          gap: spacing.lg,
          padding: spacing.xl,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.surface,
        }}
      >
        <AppText tone="muted" size={13}>
          {t('focus.position', { i, n })}
          {start0 !== null
            ? ` · ${t('focus.planned', { time: formatClock(start0) })} · ${formatDuration(current.durationMin, t)}`
            : ''}
        </AppText>
        <AppText weight="heading" size={30} accessibilityRole="header">
          {current.title}
        </AppText>
        <AppText
          weight="heading"
          size={56}
          tone={finished ? 'ok' : 'accent'}
          accessibilityLabel={t('focus.timerLabel', { time: mmss(remaining) })}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {mmss(remaining)}
        </AppText>
        {finished ? (
          <AppText tone="ok" accessibilityLiveRegion="polite">
            {t('focus.timerDone')}
          </AppText>
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {running ? (
            <Button
              title={t('focus.pause')}
              variant="secondary"
              icon={<Pause size={18} color={colors.ink} />}
              onPress={() => setRunning(false)}
            />
          ) : (
            <Button
              title={remaining === FOCUS_SECONDS ? t('focus.start') : t('focus.resume')}
              icon={<Play size={18} color={colors.accentInk} />}
              onPress={start}
              disabled={finished}
            />
          )}
          <Button
            title={t('focus.reset')}
            variant="secondary"
            icon={<RotateCcw size={18} color={colors.ink} />}
            onPress={resetTimer}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            title={t('focus.finish')}
            icon={<Check size={18} color={colors.accentInk} />}
            onPress={() => api.setTaskDone(current.id, true, start0)}
          />
        </View>
        {n > 1 ? (
          <Button
            title={t('focus.next')}
            variant="secondary"
            icon={<SkipForward size={18} color={colors.ink} />}
            onPress={() => setIndex((x) => (x + 1) % n)}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
