import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { blocksForDate, peakWindow, planDay } from '@slotwise/core';
import { useNodes } from '../../data/NodesProvider';
import { localDate } from '../../data/time';
import { useSettings } from '../../data/SettingsProvider';

/**
 * Plan for one day plus the blocks the timeline draws, using the user's settings (working hours,
 * sharp half of the day, recurring blocks).
 * @param {string} date 'YYYY-MM-DD'
 */
export function useDayPlan(date) {
  const { t } = useTranslation();
  const { nodes } = useNodes();
  const { settings } = useSettings();

  return useMemo(() => {
    const { workStartMin, workEndMin } = settings;
    const fixed = blocksForDate(settings.fixedBlocks, date).map((b) => ({
      id: b.id,
      kind: b.kind,
      label: b.label || t(`calendar.${b.kind}`),
      startMin: b.startMin,
      endMin: b.endMin,
    }));
    const peakBlock = peakWindow(settings);
    const plan = planDay(nodes, {
      date,
      today: localDate(),
      peak: peakBlock,
      fixed,
      workStartMin,
      workEndMin,
    });
    /** @type {import('./Timeline').TaskBlock[]} */
    const blocks = [
      ...plan.tasks
        .filter((n) => plan.slots[n.id] !== undefined)
        .map((node) => ({ node, startMin: plan.slots[node.id], done: false })),
      ...plan.doneTasks.map((node) => ({ node, startMin: plan.doneSlots[node.id], done: true })),
    ];
    const unplaced = plan.unplaced.map((id) => nodes.find((n) => n.id === id)).filter((n) => !!n);
    /** Busy ranges for validating a pin: meetings, finished tasks and other pinned tasks. */
    const busyFor = (/** @type {string} */ excludeId) => [
      ...fixed.map((f) => ({ id: f.id, label: f.label, startMin: f.startMin, endMin: f.endMin })),
      ...blocks
        .filter((b) => b.node.id !== excludeId && (b.done || b.node.pinnedStartMin !== null))
        .map((b) => ({
          id: b.node.id,
          label: b.node.title,
          startMin: b.startMin,
          endMin: b.startMin + b.node.durationMin,
        })),
    ];
    return { plan, fixed, blocks, unplaced, peakBlock, busyFor, workStartMin, workEndMin };
  }, [nodes, date, settings, t]);
}
