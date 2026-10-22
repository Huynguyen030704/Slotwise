/** @typedef {import('./types.js').TreeNode} TreeNode */

/**
 * Shape sent to / read from the Supabase `tree_nodes` table (real booleans, no user_id: the server
 * fills it from the session).
 * @typedef {object} RemoteRow
 * @property {string} id
 * @property {string | null} parent_id
 * @property {string} kind
 * @property {string} title
 * @property {string} position
 * @property {boolean} collapsed
 * @property {string} status
 * @property {number} duration_min
 * @property {string} energy
 * @property {boolean} do_last
 * @property {string | null} scheduled_date
 * @property {number | null} pinned_start_min
 * @property {string | null} done_at
 * @property {string | null} done_date
 * @property {number | null} done_start_min
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string | null} deleted_at
 */

/**
 * @param {TreeNode} n
 * @returns {RemoteRow}
 */
export function nodeToRemote(n) {
  return {
    id: n.id,
    parent_id: n.parentId,
    kind: n.kind,
    title: n.title,
    position: n.position ?? '',
    collapsed: !!n.collapsed,
    status: n.status,
    duration_min: n.durationMin,
    energy: n.energy,
    do_last: !!n.doLast,
    scheduled_date: n.scheduledDate,
    pinned_start_min: n.pinnedStartMin,
    done_at: n.doneAt,
    done_date: n.doneDate,
    done_start_min: n.doneStartMin,
    created_at: n.createdAt ?? new Date(0).toISOString(),
    updated_at: n.updatedAt ?? new Date(0).toISOString(),
    deleted_at: n.deletedAt ?? null,
  };
}

/**
 * Postgres returns '2026-10-22T03:00:00+00:00'; normalise to the ISO form used locally.
 * @param {string | null} s
 * @returns {string | null}
 */
const iso = (s) => (s ? new Date(s).toISOString() : null);

/**
 * @param {RemoteRow} r
 * @param {string} userId
 * @returns {TreeNode}
 */
export function remoteToNode(r, userId) {
  return {
    id: r.id,
    userId,
    parentId: r.parent_id,
    kind: /** @type {TreeNode['kind']} */ (r.kind),
    title: r.title,
    position: r.position,
    collapsed: r.collapsed,
    status: r.status === 'done' ? 'done' : 'todo',
    durationMin: r.duration_min,
    energy: r.energy === 'light' ? 'light' : 'heavy',
    doLast: r.do_last,
    scheduledDate: r.scheduled_date,
    pinnedStartMin: r.pinned_start_min,
    doneAt: iso(r.done_at),
    doneDate: r.done_date,
    doneStartMin: r.done_start_min,
    createdAt: /** @type {string} */ (iso(r.created_at)),
    updatedAt: /** @type {string} */ (iso(r.updated_at)),
    deletedAt: iso(r.deleted_at),
  };
}
