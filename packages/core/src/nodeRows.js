/** @typedef {import('./types.js').TreeNode} TreeNode */

/**
 * Flat row as stored in SQLite / Supabase `tree_nodes` (snake_case, 0/1 booleans).
 * @typedef {object} NodeRow
 * @property {string} id
 * @property {string} user_id
 * @property {string | null} parent_id
 * @property {string} kind
 * @property {string} title
 * @property {string} position
 * @property {number} collapsed
 * @property {string} status
 * @property {number} duration_min
 * @property {string} energy
 * @property {number} do_last
 * @property {string | null} scheduled_date
 * @property {number | null} pinned_start_min
 * @property {string | null} done_at
 * @property {string | null} done_date
 * @property {number | null} done_start_min
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string | null} deleted_at
 * @property {string} note
 * @property {string} field_times JSON text of `fieldTimes`
 */

/**
 * @param {string | null | undefined} text
 * @returns {Record<string, string>}
 */
function parseTimes(text) {
  try {
    const v = text ? JSON.parse(text) : {};
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/**
 * @param {TreeNode} n
 * @returns {NodeRow}
 */
export function nodeToRow(n) {
  return {
    id: n.id,
    user_id: n.userId ?? 'local',
    parent_id: n.parentId,
    kind: n.kind,
    title: n.title,
    position: n.position ?? '',
    collapsed: n.collapsed ? 1 : 0,
    status: n.status,
    duration_min: n.durationMin,
    energy: n.energy,
    do_last: n.doLast ? 1 : 0,
    scheduled_date: n.scheduledDate,
    pinned_start_min: n.pinnedStartMin,
    done_at: n.doneAt,
    done_date: n.doneDate,
    done_start_min: n.doneStartMin,
    created_at: n.createdAt ?? '',
    updated_at: n.updatedAt ?? '',
    deleted_at: n.deletedAt ?? null,
    note: n.note ?? '',
    field_times: JSON.stringify(n.fieldTimes ?? {}),
  };
}

/**
 * @param {NodeRow} r
 * @returns {TreeNode}
 */
export function rowToNode(r) {
  return {
    id: r.id,
    userId: r.user_id,
    parentId: r.parent_id,
    kind: /** @type {TreeNode['kind']} */ (r.kind),
    title: r.title,
    position: r.position,
    collapsed: r.collapsed === 1,
    status: r.status === 'done' ? 'done' : 'todo',
    durationMin: r.duration_min,
    energy: r.energy === 'light' ? 'light' : 'heavy',
    doLast: r.do_last === 1,
    scheduledDate: r.scheduled_date,
    pinnedStartMin: r.pinned_start_min,
    doneAt: r.done_at,
    doneDate: r.done_date,
    doneStartMin: r.done_start_min,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
    note: r.note ?? '',
    fieldTimes: parseTimes(r.field_times),
  };
}
