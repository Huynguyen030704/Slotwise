import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { randomUUID } from 'expo-crypto';
import {
  childrenOf,
  moveNode,
  parseNotes,
  positionBetween,
  rollOver,
  setDone,
  softDelete,
} from '@slotwise/core';
import { loadNodes, saveNodes } from './db';
import { localDate, nowIso } from './time';

/** @typedef {import('@slotwise/core/types.js').TreeNode} TreeNode */

const UNDO_LIMIT = 20;
const USER_ID = 'local';

/**
 * Position after the last live child of a parent.
 * @param {TreeNode[]} nodes
 * @param {string | null} parentId
 */
function appendPosition(nodes, parentId) {
  const kids = childrenOf(nodes, parentId);
  return positionBetween(kids.length ? (kids[kids.length - 1].position ?? null) : null, null);
}

/**
 * @param {Partial<TreeNode>} over
 * @returns {TreeNode}
 */
function makeNode(over) {
  const now = nowIso();
  return {
    id: randomUUID(),
    userId: USER_ID,
    parentId: null,
    kind: 'task',
    title: '',
    position: 'V',
    collapsed: false,
    status: 'todo',
    durationMin: 60,
    energy: 'heavy',
    doLast: false,
    scheduledDate: localDate(),
    pinnedStartMin: null,
    doneAt: null,
    doneDate: null,
    doneStartMin: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...over,
  };
}

/**
 * @typedef {object} NodesApi
 * @property {TreeNode[]} nodes all nodes including soft-deleted
 * @property {boolean} ready
 * @property {boolean} canUndo
 * @property {(title: string) => void} addGroup
 * @property {(title: string, parentId: string | null) => void} addTask
 * @property {(id: string, title: string) => void} rename
 * @property {(id: string, patch: Partial<TreeNode>) => void} update
 * @property {(id: string, done: boolean, startMin?: number | null) => void} setTaskDone
 * @property {(id: string) => void} toggleCollapsed
 * @property {(id: string) => void} remove
 * @property {(id: string, target: import('@slotwise/core/tree.js').DropTarget) => void} move
 * @property {(text: string) => { added: number, skipped: number }} importNotes
 * @property {(date: string) => number} rollOver move unfinished tasks of a date to the next day
 * @property {() => void} undo
 */

const NodesContext = createContext(/** @type {NodesApi | null} */ (null));

/** @param {{ children: import('react').ReactNode }} props */
export function NodesProvider({ children }) {
  const [nodes, setNodes] = useState(/** @type {TreeNode[]} */ ([]));
  const [ready, setReady] = useState(false);
  const [undoDepth, setUndoDepth] = useState(0);
  const ref = useRef(/** @type {TreeNode[]} */ ([]));
  const undoStack = useRef(/** @type {TreeNode[][]} */ ([]));

  useEffect(() => {
    let alive = true;
    loadNodes().then((loaded) => {
      if (!alive) return;
      ref.current = loaded;
      setNodes(loaded);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  /** Swap in `next`, save only the changed rows, optionally record an undo step. */
  const commit = useCallback(
    /** @param {TreeNode[]} next @param {boolean} [undoable] */
    (next, undoable = true) => {
      const prev = ref.current;
      if (next === prev) return;
      const before = new Map(prev.map((n) => [n.id, n]));
      saveNodes(next.filter((n) => before.get(n.id) !== n)).catch((e) =>
        console.warn('saveNodes failed', e?.message),
      );
      if (undoable) {
        undoStack.current.push(prev);
        if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift();
        setUndoDepth(undoStack.current.length);
      }
      ref.current = next;
      setNodes(next);
    },
    [],
  );

  const api = useMemo(
    () =>
      /** @type {NodesApi} */ ({
        nodes,
        ready,
        canUndo: undoDepth > 0,
        addGroup: (title) => {
          const t = title.trim();
          if (!t) return;
          commit([
            ...ref.current,
            makeNode({ kind: 'group', title: t, position: appendPosition(ref.current, null) }),
          ]);
        },
        addTask: (title, parentId) => {
          const t = title.trim();
          if (!t) return;
          commit([
            ...ref.current,
            makeNode({ title: t, parentId, position: appendPosition(ref.current, parentId) }),
          ]);
        },
        rename: (id, title) => {
          const t = title.trim();
          if (!t) return;
          const now = nowIso();
          commit(ref.current.map((n) => (n.id === id ? { ...n, title: t, updatedAt: now } : n)));
        },
        update: (id, patch) => {
          const now = nowIso();
          commit(ref.current.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now } : n)));
        },
        setTaskDone: (id, done, startMin = null) => {
          let next = setDone(ref.current, id, done, { now: nowIso(), today: localDate() });
          if (done && startMin !== null) {
            next = next.map((n) => (n.id === id ? { ...n, doneStartMin: startMin } : n));
          }
          commit(next);
        },
        toggleCollapsed: (id) => {
          const now = nowIso();
          commit(
            ref.current.map((n) =>
              n.id === id ? { ...n, collapsed: !n.collapsed, updatedAt: now } : n,
            ),
            false,
          );
        },
        remove: (id) => commit(softDelete(ref.current, id, nowIso())),
        move: (id, target) => commit(moveNode(ref.current, id, target, nowIso())),
        importNotes: (text) => {
          const { nodes: parsed, skippedLines } = parseNotes(text, randomUUID);
          if (!parsed.length) return { added: 0, skipped: skippedLines.length };
          const now = nowIso();
          const today = localDate();
          /** @type {Map<string | null, string>} */
          const lastPos = new Map();
          const created = parsed.map((p) => {
            let last = lastPos.get(p.parentId);
            if (last === undefined) {
              const kids = childrenOf(ref.current, p.parentId);
              last = kids.length ? (kids[kids.length - 1].position ?? '') : '';
            }
            const position = positionBetween(last || null, null);
            lastPos.set(p.parentId, position);
            return /** @type {TreeNode} */ ({
              ...p,
              userId: USER_ID,
              position,
              scheduledDate: p.kind === 'task' ? today : null,
              doneAt: p.status === 'done' ? now : null,
              doneDate: p.status === 'done' ? today : null,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            });
          });
          commit([...ref.current, ...created]);
          return { added: created.length, skipped: skippedLines.length };
        },
        rollOver: (date) => {
          const { nodes: next, count } = rollOver(ref.current, date, nowIso());
          commit(next);
          return count;
        },
        undo: () => {
          const prev = undoStack.current.pop();
          setUndoDepth(undoStack.current.length);
          if (!prev) return;
          const now = nowIso();
          const cur = new Map(ref.current.map((n) => [n.id, n]));
          const restored = prev.map((n) => (cur.get(n.id) === n ? n : { ...n, updatedAt: now }));
          const prevIds = new Set(prev.map((n) => n.id));
          // Nodes created after the snapshot are soft-deleted rather than dropped.
          const added = ref.current
            .filter((n) => !prevIds.has(n.id))
            .map((n) => ({ ...n, deletedAt: now, updatedAt: now }));
          commit([...restored, ...added], false);
        },
      }),
    [nodes, ready, undoDepth, commit],
  );

  return <NodesContext.Provider value={api}>{children}</NodesContext.Provider>;
}

export function useNodes() {
  const ctx = useContext(NodesContext);
  if (!ctx) throw new Error('useNodes must be used inside NodesProvider');
  return ctx;
}
