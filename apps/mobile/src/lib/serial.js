/**
 * Runs async jobs one at a time, in the order they were queued, whether or not an earlier one
 * failed. The SQLite connection is shared, and on the web its file system layer breaks ("Invalid
 * VFS state") when two statements or transactions overlap, which is what happens when a sync and
 * a screen save at the same moment.
 */
export function createQueue() {
  let tail = Promise.resolve();
  /**
   * @template T
   * @param {() => Promise<T>} job
   * @returns {Promise<T>}
   */
  return (job) => {
    const result = tail.then(job, job);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
