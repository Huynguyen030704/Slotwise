import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PEAKS, planDay } from '@slotwise/core';
import { useNodes } from '../../data/NodesProvider';
import { useSettings } from '../../data/SettingsProvider';
import { SAMPLE_FIXED } from './sampleDay';

/**
 * Plan for one day plus the blocks the timeline draws.
 * @param {string} date 'YYYY-MM-DD'
 */
export function useDayPlan(date) {
  const { t } = useTranslation();
  const { nodes } = useNodes();
  const { peak } = useSettings();

  return useMemo(() => {
    const fixed = SAMPLE_FIXED.map((f) => ({ ...f, label: t(f.labelKey) }));
    const plan = planDay(nodes, { date, peak: PEAKS[peak], fixed });
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
    return { plan, fixed, blocks, unplaced, peakBlock: PEAKS[peak], busyFor };
  }, [nodes, date, peak, t]);
}
