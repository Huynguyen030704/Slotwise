import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, ChevronLeft, ChevronRight } from '../../ui/icons';
import { useTranslation } from 'react-i18next';
import { useNodes } from '../../data/NodesProvider';
import { useSettings } from '../../data/SettingsProvider';
import { localDate } from '../../data/time';
import { addDays, formatDay } from '../../lib/dates';
import { formatClock } from '../../lib/format';
import { TopBar } from '../../ui/TopBar';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';
import { Snackbar } from '../../ui/Snackbar';
import { TextPromptSheet } from '../../ui/TextPromptSheet';
import { ActionsSheet } from '../list/ActionsSheet';
import { EditSheet } from '../list/EditSheet';
import { PinSheet } from './PinSheet';
import { Timeline } from './Timeline';
import { useDayPlan } from './useDayPlan';
import { useTheme } from '../../theme/ThemeProvider';
import { MIN_TOUCH, radius, spacing } from '../../theme/tokens';

const WORK_START = 480;
const WORK_END = 1080;
const PEAK_CHOICES = /** @type {const} */ (['morning', 'afternoon']);

/** @param {{ embedded?: boolean }} props */
export function CalendarPane({ embedded = false }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const api = useNodes();
  const { peak, setPeak } = useSettings();
  const Root = embedded ? View : SafeAreaView;
  const rootProps = embedded ? {} : { edges: /** @type {const} */ (['top']) };
  const [date, setDate] = useState(localDate());
  const { fixed, blocks, unplaced, peakBlock } = useDayPlan(date);

  const [menu, setMenu] = useState(/** @type {string | null} */ (null));
  const [pinning, setPinning] = useState(/** @type {string | null} */ (null));
  const [renaming, setRenaming] = useState(/** @type {string | null} */ (null));
  const [editing, setEditing] = useState(/** @type {string | null} */ (null));
  const [snack, setSnack] = useState(
    /** @type {{ message: string, undo: boolean } | null} */ (null),
  );

  useEffect(() => {
    if (!snack) return undefined;
    const id = setTimeout(() => setSnack(null), 6000);
    return () => clearTimeout(id);
  }, [snack]);

  const byId = (/** @type {string | null} */ id) => api.nodes.find((n) => n.id === id) ?? null;
  const menuNode = byId(menu);
  const menuBlock = blocks.find((b) => b.node.id === menu);
  const isToday = date === localDate();
  const tomorrow = (/** @type {string} */ id) =>
    api.update(id, { scheduledDate: addDays(date, 1), pinnedStartMin: null });

  const dateBar = (
    <View style={{ gap: spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <IconButton label={t('calendar.prevDay')} onPress={() => setDate(addDays(date, -1))}>
          <ChevronLeft size={20} color={colors.ink} />
        </IconButton>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <AppText weight="bodyBold" style={{ textTransform: 'capitalize', textAlign: 'center' }}>
            {formatDay(date, i18n.language)}
          </AppText>
          {!isToday ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setDate(localDate())}
              style={{ minHeight: MIN_TOUCH, justifyContent: 'center' }}
            >
              <AppText tone="accent" weight="bodyMedium" size={13}>
                {t('calendar.backToToday')}
              </AppText>
            </Pressable>
          ) : null}
        </View>
        <IconButton label={t('calendar.nextDay')} onPress={() => setDate(addDays(date, 1))}>
          <ChevronRight size={20} color={colors.ink} />
        </IconButton>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <AppText size={13} tone="muted">
          {t('calendar.peakToggle')}
        </AppText>
        {PEAK_CHOICES.map((p) => {
          const active = peak === p;
          return (
            <Pressable
              key={p}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setPeak(p)}
              style={{
                minHeight: 36,
                paddingHorizontal: spacing.md,
                justifyContent: 'center',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: active ? colors.accent : colors.line,
                backgroundColor: active ? colors.accent : colors.surface,
              }}
            >
              <AppText size={13} weight="bodyMedium" tone={active ? 'accentInk' : 'ink'}>
                {t(`calendar.${p}`)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {unplaced.length ? (
        <View
          accessibilityRole="alert"
          style={{
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.danger,
            backgroundColor: colors.surface,
          }}
        >
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <AlertTriangle size={18} color={colors.danger} />
            <AppText weight="bodyBold" style={{ flex: 1 }}>
              {t('calendar.unplacedTitle', { n: unplaced.length })}
            </AppText>
          </View>
          <AppText size={13} tone="muted">
            {t('calendar.unplacedHint')}
          </AppText>
          {unplaced.map((n) => (
            <View
              key={n.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => setMenu(n.id)}
                style={{ flex: 1, minHeight: MIN_TOUCH, justifyContent: 'center' }}
              >
                <AppText weight="bodyMedium">{n.title}</AppText>
              </Pressable>
              <Button
                title={t('actions.scheduleTomorrow')}
                variant="secondary"
                onPress={() => tomorrow(n.id)}
              />
            </View>
          ))}
        </View>
      ) : null}
      {!blocks.length && !unplaced.length ? (
        <View
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
          }}
        >
          <AppText tone="muted">{t('calendar.empty')}</AppText>
        </View>
      ) : null}
    </View>
  );

  return (
    <Root {...rootProps} style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        {embedded ? (
          <AppText accessibilityRole="header" weight="heading" size={26}>
            {t('calendar.title')}
          </AppText>
        ) : (
          <TopBar title={t('calendar.title')} />
        )}
      </View>
      <Timeline
        workStartMin={WORK_START}
        workEndMin={WORK_END}
        peak={peakBlock}
        fixed={fixed}
        blocks={blocks}
        top={dateBar}
        onBlockPress={(node) => setMenu(node.id)}
        onToggleDone={(b) => api.setTaskDone(b.node.id, !b.done, b.startMin)}
        onPin={(id, startMin) => {
          api.update(id, { pinnedStartMin: startMin, scheduledDate: date });
          setSnack({
            message: t('calendar.pinned_ok', {
              title: byId(id)?.title ?? '',
              time: formatClock(startMin),
            }),
            undo: true,
          });
        }}
        onUnpin={(id) => {
          api.update(id, { pinnedStartMin: null });
          setSnack({
            message: t('calendar.unpinned', { title: byId(id)?.title ?? '' }),
            undo: true,
          });
        }}
        onReject={(message) => setSnack({ message, undo: false })}
      />

      <ActionsSheet
        node={menuNode}
        nodes={api.nodes}
        onClose={() => setMenu(null)}
        done={menuBlock?.done ?? false}
        onToggleDone={() =>
          menuBlock && api.setTaskDone(menuBlock.node.id, !menuBlock.done, menuBlock.startMin)
        }
        onRename={() => setRenaming(menu)}
        onEdit={() => setEditing(menu)}
        onPin={() => setPinning(menu)}
        onUnpin={() => menu && api.update(menu, { pinnedStartMin: null })}
        onTomorrow={() => menu && tomorrow(menu)}
        onDelete={() => {
          if (!menuNode) return;
          api.remove(menuNode.id);
          setSnack({ message: t('list.deleted', { title: menuNode.title }), undo: true });
        }}
      />
      <PinSheet
        node={byId(pinning)}
        onClose={() => setPinning(null)}
        onPinned={(message) => setSnack({ message, undo: true })}
      />
      <TextPromptSheet
        visible={!!renaming}
        title={t('rename.title')}
        placeholder={t('rename.placeholder')}
        initial={byId(renaming)?.title ?? ''}
        onSubmit={(text) => renaming && api.rename(renaming, text)}
        onClose={() => setRenaming(null)}
      />
      <EditSheet
        node={byId(editing)}
        onSave={(patch) => editing && api.update(editing, patch)}
        onClose={() => setEditing(null)}
      />
      <Snackbar
        message={snack?.message ?? null}
        actionLabel={snack?.undo ? t('common.undo') : undefined}
        onAction={() => {
          api.undo();
          setSnack(null);
        }}
      />
    </Root>
  );
}
