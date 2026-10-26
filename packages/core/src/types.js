/**
 * @typedef {'group' | 'task' | 'note'} NodeKind
 * @typedef {'heavy' | 'light'} Energy
 */

/**
 * Flat tree node. Sibling order is the scheduling priority.
 * @typedef {object} TreeNode
 * @property {string} id
 * @property {string} [userId]
 * @property {string | null} parentId
 * @property {NodeKind} kind
 * @property {string} title
 * @property {string} [position] fractional index
 * @property {boolean} collapsed
 * @property {'todo' | 'done'} status
 * @property {number} durationMin multiple of 15, 15..180
 * @property {Energy} energy
 * @property {boolean} doLast
 * @property {string | null} scheduledDate 'YYYY-MM-DD'
 * @property {number | null} pinnedStartMin minutes from 00:00
 * @property {string | null} doneAt ISO UTC
 * @property {string | null} doneDate 'YYYY-MM-DD'
 * @property {number | null} doneStartMin
 * @property {string} [createdAt] ISO UTC
 * @property {string} [updatedAt] ISO UTC
 * @property {string} [note] free text the person adds to a task; '' (or missing) means none
 * @property {string | null} [deletedAt] ISO UTC, soft delete
 * @property {Record<string, string>} [fieldTimes] ISO UTC of the last edit of each field group (see fields.js)
 */

/**
 * @typedef {object} Block
 * @property {number} startMin
 * @property {number} endMin
 */

/**
 * @typedef {object} SchedulableTask
 * @property {string} id
 * @property {number} durationMin
 * @property {Energy} energy
 * @property {boolean} doLast
 * @property {number | null} pinnedStartMin
 */

/**
 * @typedef {object} ScheduleInput
 * @property {number} workStartMin
 * @property {number} workEndMin
 * @property {number} gridMin
 * @property {Block} peak
 * @property {Block[]} fixed
 * @property {SchedulableTask[]} tasks in tree (priority) order
 */

/**
 * @typedef {object} ScheduleResult
 * @property {Record<string, number>} slots task id -> start minute
 * @property {string[]} unplaced
 */

export {};
