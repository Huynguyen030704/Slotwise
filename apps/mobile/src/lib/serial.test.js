import { createQueue } from './serial';

const tick = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('createQueue', () => {
  it('never runs two jobs at once and keeps the order', async () => {
    const queue = createQueue();
    const log = [];
    let running = 0;
    let overlapped = false;
    const job = (name, ms) => async () => {
      running++;
      if (running > 1) overlapped = true;
      log.push(`start ${name}`);
      await tick(ms);
      log.push(`end ${name}`);
      running--;
      return name;
    };
    const results = await Promise.all([
      queue(job('a', 15)),
      queue(job('b', 1)),
      queue(job('c', 5)),
    ]);
    expect(results).toEqual(['a', 'b', 'c']);
    expect(overlapped).toBe(false);
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
  });

  it('keeps going after a failed job and still reports that failure', async () => {
    const queue = createQueue();
    const failed = queue(async () => {
      throw new Error('boom');
    });
    const next = queue(async () => 'ok');
    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
  });
});
