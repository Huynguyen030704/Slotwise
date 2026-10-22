/**
 * Sample fixed blocks until calendar integration (Milestone 3). Minutes from 00:00.
 * `kind` picks the icon, `labelKey` the i18n text.
 */
/** @type {{ id: string, kind: 'meeting' | 'lunch', labelKey: string, startMin: number, endMin: number }[]} */
export const SAMPLE_FIXED = [
  {
    id: 'sample-meeting-1',
    kind: 'meeting',
    labelKey: 'calendar.meeting',
    startMin: 600,
    endMin: 630,
  },
  { id: 'sample-lunch', kind: 'lunch', labelKey: 'calendar.lunch', startMin: 720, endMin: 780 },
  {
    id: 'sample-meeting-2',
    kind: 'meeting',
    labelKey: 'calendar.meeting',
    startMin: 870,
    endMin: 930,
  },
];
