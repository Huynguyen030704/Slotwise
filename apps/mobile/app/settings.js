import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { MIN_WORK_SPAN, peakWindow } from '@slotwise/core';
import { Coffee, Pencil, Plus, Trash2, Users } from '../src/ui/icons';
import { useSettings } from '../src/data/SettingsProvider';
import { BlockSheet } from '../src/features/settings/BlockSheet';
import { AppText } from '../src/ui/AppText';
import { Button } from '../src/ui/Button';
import { IconButton } from '../src/ui/IconButton';
import { Snackbar } from '../src/ui/Snackbar';
import { TimeStepper } from '../src/ui/TimeStepper';
import { useTheme } from '../src/theme/ThemeProvider';
import { formatClock } from '../src/lib/format';
import { radius, spacing } from '../src/theme/tokens';

const PEAK_CHOICES = /** @type {const} */ (['morning', 'afternoon']);

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { settings, update } = useSettings();

  const [editing, setEditing] = useState(
    /** @type {null | { block: import('@slotwise/core/settings.js').FixedBlockDef | null }} */ (
      null
    ),
  );
  const [removed, setRemoved] = useState(
    /** @type {null | import('@slotwise/core/settings.js').FixedBlockDef} */ (null),
  );

  useEffect(() => {
    if (!removed) return undefined;
    const id = setTimeout(() => setRemoved(null), 6000);
    return () => clearTimeout(id);
  }, [removed]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const peak = peakWindow(settings);
  const blocks = [...settings.fixedBlocks].sort((a, b) => a.startMin - b.startMin);

  const card = {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  };

  /** @param {{ kind: 'meeting' | 'lunch', label: string, startMin: number, endMin: number }} b */
  const saveBlock = (b) => {
    const existing = editing?.block;
    const next = { id: existing?.id ?? randomUUID(), ...b };
    update({
      fixedBlocks: existing
        ? settings.fixedBlocks.map((x) => (x.id === existing.id ? next : x))
        : [...settings.fixedBlocks, next],
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 96 }}
      >
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <AppText accessibilityRole="header" weight="heading" size={26}>
            {t('prefs.title')}
          </AppText>
          <Button title={t('common.close')} variant="secondary" onPress={close} />
        </View>
        <AppText tone="muted">{t('prefs.intro')}</AppText>

        <View style={card}>
          <AppText accessibilityRole="header" weight="heading" size={18}>
            {t('prefs.hours')}
          </AppText>
          <TimeStepper
            label={t('prefs.workStart')}
            value={settings.workStartMin}
            min={0}
            max={settings.workEndMin - MIN_WORK_SPAN}
            onChange={(v) => update({ workStartMin: v })}
          />
          <TimeStepper
            label={t('prefs.workEnd')}
            value={settings.workEndMin}
            min={settings.workStartMin + MIN_WORK_SPAN}
            max={1440}
            onChange={(v) => update({ workEndMin: v })}
          />
          <AppText size={13} tone="muted">
            {t('prefs.hoursHint', { n: MIN_WORK_SPAN / 60 })}
          </AppText>
        </View>

        <View style={card}>
          <AppText accessibilityRole="header" weight="heading" size={18}>
            {t('prefs.peak')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {PEAK_CHOICES.map((p) => {
              const active = settings.peak === p;
              return (
                <Pressable
                  key={p}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => update({ peak: p })}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.md,
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? colors.accent : colors.line,
                    backgroundColor: colors.bg,
                  }}
                >
                  <AppText weight={active ? 'bodyBold' : 'body'}>{t(`calendar.${p}`)}</AppText>
                </Pressable>
              );
            })}
          </View>
          <AppText size={13} tone="muted">
            {t('prefs.peakHint', {
              from: formatClock(peak.startMin),
              to: formatClock(peak.endMin),
            })}
          </AppText>
        </View>

        <View style={card}>
          <AppText accessibilityRole="header" weight="heading" size={18}>
            {t('prefs.blocks')}
          </AppText>
          <AppText size={13} tone="muted">
            {t('prefs.blocksHint')}
          </AppText>
          {blocks.length ? (
            blocks.map((b) => {
              const Icon = b.kind === 'lunch' ? Coffee : Users;
              const name = b.label || t(`calendar.${b.kind}`);
              return (
                <View
                  key={b.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    borderWidth: 1,
                    borderColor: colors.line,
                    borderRadius: radius.md,
                    paddingLeft: spacing.md,
                    backgroundColor: colors.bg,
                  }}
                >
                  <Icon size={18} color={colors.muted} />
                  <View style={{ flex: 1, paddingVertical: spacing.sm }}>
                    <AppText weight="bodyMedium">{name}</AppText>
                    <AppText size={13} tone="muted">
                      {formatClock(b.startMin)}–{formatClock(b.endMin)}
                    </AppText>
                  </View>
                  <IconButton
                    label={t('prefs.blockEditLabel', { name })}
                    onPress={() => setEditing({ block: b })}
                  >
                    <Pencil size={18} color={colors.ink} />
                  </IconButton>
                  <IconButton
                    label={t('prefs.blockDeleteLabel', { name })}
                    onPress={() => {
                      update({ fixedBlocks: settings.fixedBlocks.filter((x) => x.id !== b.id) });
                      setRemoved(b);
                    }}
                  >
                    <Trash2 size={18} color={colors.danger} />
                  </IconButton>
                </View>
              );
            })
          ) : (
            <AppText tone="muted">{t('prefs.blocksEmpty')}</AppText>
          )}
          <Button
            title={t('prefs.blockAdd')}
            variant="secondary"
            icon={<Plus size={18} color={colors.ink} />}
            onPress={() => setEditing({ block: null })}
          />
        </View>

        <AppText size={13} tone="muted">
          {t('prefs.syncNote')}
        </AppText>
      </ScrollView>

      <BlockSheet
        open={!!editing}
        block={editing?.block ?? null}
        workStartMin={settings.workStartMin}
        workEndMin={settings.workEndMin}
        onSave={saveBlock}
        onClose={() => setEditing(null)}
      />
      <Snackbar
        message={
          removed
            ? t('prefs.blockDeleted', { name: removed.label || t(`calendar.${removed.kind}`) })
            : null
        }
        actionLabel={t('common.undo')}
        onAction={() => {
          if (removed) update({ fixedBlocks: [...settings.fixedBlocks, removed] });
          setRemoved(null);
        }}
      />
    </SafeAreaView>
  );
}
