import { describe, expect, it } from 'vitest';
import { schedule } from '../src/schedule.js';

const MORNING = { startMin: 480, endMin: 720 };
const AFTERNOON = { startMin: 780, endMin: 1020 };

/**
 * @param {string} id
 * @param {Partial<import('../src/types.js').SchedulableTask>} [o]
 * @returns {import('../src/types.js').SchedulableTask}
 */
const task = (id, o = {}) => ({
  id,
  durationMin: 60,
  energy: 'heavy',
  doLast: false,
  pinnedStartMin: null,
  ...o,
});

/**
 * @param {Partial<import('../src/types.js').ScheduleInput>} [o]
 * @returns {import('../src/types.js').ScheduleInput}
 */
const input = (o = {}) => ({
  workStartMin: 480,
  workEndMin: 1080,
  gridMin: 15,
  peak: MORNING,
  fixed: [],
  tasks: [],
  ...o,
});

describe('schedule', () => {
  it('puts heavy tasks in peak and light tasks outside it', () => {
    const r = schedule(input({ tasks: [task('l', { energy: 'light' }), task('h')] }));
    expect(r.slots.h).toBe(480);
    expect(r.slots.l).toBe(720);
  });

  it('moves placement when peak switches from morning to afternoon', () => {
    const tasks = [task('h'), task('l', { energy: 'light' })];
    const am = schedule(input({ tasks }));
    const pm = schedule(input({ tasks, peak: AFTERNOON }));
    expect(am.slots.h).toBe(480);
    expect(pm.slots.h).toBe(780);
    expect(pm.slots.l).toBe(480);
  });

  it('gives doLast tasks the latest slot and queues them last', () => {
    const r = schedule(input({ tasks: [task('z', { doLast: true }), task('a')] }));
    expect(r.slots.a).toBe(480);
    expect(r.slots.z).toBe(660);
  });

  it('doLast light task takes the latest slot outside peak', () => {
    const r = schedule(input({ tasks: [task('z', { doLast: true, energy: 'light' })] }));
    expect(r.slots.z).toBe(1020);
  });

  it('keeps pinned tasks in place and schedules others around them', () => {
    const r = schedule(input({ tasks: [task('a'), task('p', { pinnedStartMin: 480 })] }));
    expect(r.slots.p).toBe(480);
    expect(r.slots.a).toBe(540);
  });

  it('never overlaps fixed blocks or other tasks', () => {
    const fixed = [
      { startMin: 540, endMin: 600 },
      { startMin: 720, endMin: 780 },
    ];
    const tasks = [
      task('a'),
      task('b'),
      task('c', { energy: 'light' }),
      task('d', { durationMin: 30 }),
    ];
    const { slots, unplaced } = schedule(input({ fixed, tasks }));
    expect(unplaced).toEqual([]);
    const all = [
      ...fixed.map((f) => [f.startMin, f.endMin]),
      ...tasks.map((t) => [slots[t.id], slots[t.id] + t.durationMin]),
    ];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(all[i][1] <= all[j][0] || all[j][1] <= all[i][0]).toBe(true);
      }
    }
  });

  it('reports unplaced tasks instead of throwing', () => {
    const r = schedule(
      input({ workStartMin: 480, workEndMin: 600, tasks: [task('a'), task('b'), task('c')] }),
    );
    expect(r.slots).toEqual({ a: 480, b: 540 });
    expect(r.unplaced).toEqual(['c']);
  });

  it('is deterministic', () => {
    const i = input({
      tasks: [task('a'), task('b', { energy: 'light' }), task('c', { doLast: true })],
    });
    expect(schedule(i)).toEqual(schedule(i));
  });

  it('tree order decides who picks first', () => {
    const base = { workEndMin: 600, peak: { startMin: 480, endMin: 600 } };
    const ab = schedule(input({ ...base, tasks: [task('a'), task('b')] }));
    const ba = schedule(input({ ...base, tasks: [task('b'), task('a')] }));
    expect(ab.slots).toEqual({ a: 480, b: 540 });
    expect(ba.slots).toEqual({ b: 480, a: 540 });
  });

  it('places every start on the grid', () => {
    const tasks = [
      task('a', { durationMin: 45 }),
      task('b', { durationMin: 90 }),
      task('c', { durationMin: 15 }),
    ];
    const { slots } = schedule(input({ tasks, fixed: [{ startMin: 500, endMin: 530 }] }));
    for (const id of Object.keys(slots)) expect(slots[id] % 15).toBe(0);
  });

  it('falls back to any valid slot when no preferred slot exists', () => {
    const r = schedule(input({ tasks: [task('h', { durationMin: 300 })] }));
    expect(r.slots.h).toBe(480);
  });
});
