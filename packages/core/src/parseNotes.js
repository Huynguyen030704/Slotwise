/** @typedef {import('./types.js').TreeNode} TreeNode */

/**
 * Parsed node before persistence: no userId or position.
 * @typedef {Omit<TreeNode, 'userId' | 'position'>} ParsedNode
 */

/**
 * @typedef {object} ParseResult
 * @property {ParsedNode[]} nodes
 * @property {number[]} skippedLines 1-based numbers of lines that were ignored
 */

/**
 * @param {string} id
 * @param {string | null} parentId
 * @param {'group' | 'task' | 'note'} kind
 * @param {string} title
 * @param {boolean} done
 * @param {boolean} doLast
 * @returns {ParsedNode}
 */
function makeNode(id, parentId, kind, title, done, doLast) {
  return {
    id,
    parentId,
    kind,
    title,
    collapsed: false,
    status: done ? 'done' : 'todo',
    durationMin: 60,
    energy: 'heavy',
    doLast,
    scheduledDate: null,
    pinnedStartMin: null,
    doneAt: null,
    doneDate: null,
    doneStartMin: null,
  };
}

/**
 * Parse Notepad/Markdown text into a node list. Never throws on odd formatting.
 * @param {string} text
 * @param {() => string} genId id generator
 * @returns {ParseResult}
 */
export function parseNotes(text, genId) {
  /** @type {ParsedNode[]} */
  const nodes = [];
  /** @type {number[]} */
  const skippedLines = [];
  /** @type {{ indent: number, node: ParsedNode }[]} */
  let stack = [];
  /** @type {ParsedNode | null} */
  let group = null;

  const lines = String(text).replace(/\r/g, '').split('\n');
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    const s = line.normalize('NFC').replace(/\\([[\]*_#`~\-.!()])/g, '$1');
    const indent = /** @type {RegExpMatchArray} */ (s.match(/^[ \t]*/))[0].replace(
      /\t/g,
      '    ',
    ).length;
    const t = s.trim();

    if (/^\*\*[^*].*\*\*$/.test(t)) {
      const title = t
        .replace(/^\*\*|\*\*$/g, '')
        .replace(/[:：]\s*$/, '')
        .trim();
      if (title) {
        group = makeNode(genId(), null, 'group', title, false, false);
        nodes.push(group);
        stack = [];
      } else {
        skippedLines.push(i + 1);
      }
      return;
    }

    const m = t.match(/^(?:\d+[.)]|[-+])\s+(.*)$/);
    const listed = m !== null;
    let body = m ? m[1] : t;
    const done = /\[done\]/i.test(body) || /\[x\]/i.test(body);
    const doLast = /làm cuối/i.test(body);
    body = body
      .replace(/\[done\]/gi, '')
      .replace(/\[x\]/gi, '')
      .replace(/\[ \]/g, '')
      .replace(/\*+/g, '')
      .replace(/làm cuối/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[:：]\s*$/, '')
      .trim();
    if (!body) {
      skippedLines.push(i + 1);
      return;
    }

    const kind = !listed && !done && indent === 0 ? 'note' : 'task';
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parentId = stack.length ? stack[stack.length - 1].node.id : group ? group.id : null;
    const node = makeNode(genId(), parentId, kind, body, done, doLast);
    nodes.push(node);
    if (kind === 'task') stack.push({ indent, node });
  });

  /** @type {Map<string, ParsedNode>} */
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes) {
    const p = n.parentId ? byId.get(n.parentId) : undefined;
    if (p && p.kind === 'task' && p.status === 'done' && n.kind === 'task') n.status = 'done';
  }
  return { nodes, skippedLines };
}
