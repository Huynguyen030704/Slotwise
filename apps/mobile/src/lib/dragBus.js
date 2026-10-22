/**
 * Tiny registry that lets a drag started in one pane (the task list) be previewed and dropped in
 * another (the day timeline). Coordinates are window coordinates (`absoluteX/Y` of the gesture).
 */

/**
 * @typedef {object} DragPayload
 * @property {string} id
 * @property {number} durationMin
 * @property {boolean} schedulable only leaf tasks can be pinned to the calendar
 */

/**
 * @typedef {object} DropTarget
 * @property {() => void} [start] called when a drag begins, to re-measure
 * @property {(x: number, y: number, p: DragPayload) => boolean} hover true when the pointer is over the target
 * @property {() => void} leave clear any preview
 * @property {(x: number, y: number, p: DragPayload) => boolean} drop true when the target took the drop
 */

/** @type {Set<DropTarget>} */
const targets = new Set();

/** @param {DropTarget} target */
export function registerDropTarget(target) {
  targets.add(target);
  return () => {
    targets.delete(target);
  };
}

export function dragStart() {
  targets.forEach((t) => t.start?.());
}

/**
 * @param {number} x
 * @param {number} y
 * @param {DragPayload} payload
 * @returns {boolean} whether some target is under the pointer
 */
export function dragHover(x, y, payload) {
  let hit = false;
  targets.forEach((t) => {
    if (!hit && t.hover(x, y, payload)) hit = true;
    else t.leave();
  });
  return hit;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {DragPayload} payload
 * @returns {boolean} whether a target took the drop
 */
export function dragDrop(x, y, payload) {
  let taken = false;
  targets.forEach((t) => {
    if (!taken && t.drop(x, y, payload)) taken = true;
    else t.leave();
  });
  return taken;
}

export function dragCancel() {
  targets.forEach((t) => t.leave());
}
