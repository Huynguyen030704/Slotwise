import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ChevronsLeft, ChevronsRight, Minus, Plus } from '../../ui/icons';
import { useTranslation } from 'react-i18next';
import { checkPlacement, snapToGrid } from '@slotwise/core';
import { Sheet } from '../../ui/Sheet';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';
import { AppText } from '../../ui/AppText';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { formatClock } from '../../lib/format';
import { localDate } from '../../data/time';
import { useNodes } from '../../data/NodesProvider';
import { useDayPlan } from './useDayPlan';

/**
 * Keyboard/button alternative to dragging a task onto the calendar ("Ghim vào giờ…").
 * @param {{ node: import('@slotwise/core/types.js').TreeNode | null, onClose: () => void, onPinned?: (message: string) => void }} props
 */
export function PinSheet({ node, onClose, onPinned }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const api = useNodes();
  const date = node?.scheduledDate ?? localDate();
  const { blocks, busyFor, workStartMin: WORK_START, workEndMin: WORK_END } = useDayPlan(date);
  const [start, setStart] = useState(WORK_START);

  useEffect(() => {
    if (!node) return;
    const placed = blocks.find((b) => b.node.id === node.id);
    setStart(node.pinnedStartMin ?? placed?.startMin ?? WORK_START);
    // Only reset when a different task is opened, not on every plan change.
  }, [node?.id]);

  const duration = node?.durationMin ?? 60;
  /** @type {import('@slotwise/core/day.js').Placement} */
  const placement = node
    ? checkPlacement({
        startMin: start,
        durationMin: duration,
        workStartMin: WORK_START,
        workEndMin: WORK_END,
        busy: busyFor(node.id),
      })
    : { ok: true };
  /** @param {number} delta */
  const shift = (delta) =>
    setStart((s) => Math.max(WORK_START, Math.min(WORK_END - duration, snapToGrid(s + delta))));

  let message = '';
  if (!placement.ok) {
    message =
      placement.reason === 'outside'
        ? t('calendar.pinOutside')
        : t('calendar.pinConflict', {
            title: /** @type {{ label?: string }} */ (placement.with).label ?? '',
            range: `${formatClock(placement.with.startMin)}–${formatClock(placement.with.endMin)}`,
          });
  }

  return (
    <Sheet visible={!!node} title={t('calendar.pinTitle')} onClose={onClose}>
      <AppText tone="muted" size={13}>
        {node?.title}
      </AppText>
      <AppText weight="bodyBold">{t('calendar.pinStart')}</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <IconButton label="-60" onPress={() => shift(-60)}>
          <ChevronsLeft size={20} color={colors.ink} />
        </IconButton>
        <IconButton label="-15" onPress={() => shift(-15)}>
          <Minus size={20} color={colors.ink} />
        </IconButton>
        <AppText weight="heading" size={24} style={{ minWidth: 80, textAlign: 'center' }}>
          {formatClock(start)}
        </AppText>
        <IconButton label="+15" onPress={() => shift(15)}>
          <Plus size={20} color={colors.ink} />
        </IconButton>
        <IconButton label="+60" onPress={() => shift(60)}>
          <ChevronsRight size={20} color={colors.ink} />
        </IconButton>
      </View>
      <AppText size={13} tone={placement.ok ? 'ok' : 'danger'} accessibilityLiveRegion="polite">
        {placement.ok ? `${formatClock(start)}–${formatClock(start + duration)}` : message}
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' }}>
        <Button title={t('common.cancel')} variant="secondary" onPress={onClose} />
        <Button
          title={t('calendar.pinConfirm', { time: formatClock(start) })}
          disabled={!placement.ok}
          onPress={() => {
            if (!node) return;
            api.update(node.id, { pinnedStartMin: start, scheduledDate: date });
            onPinned?.(t('calendar.pinned_ok', { title: node.title, time: formatClock(start) }));
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}
