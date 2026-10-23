import { describe, expect, it } from 'vitest';
import { parseNotes } from '../src/parseNotes.js';

const gen = () => {
  let n = 0;
  return () => `n${++n}`;
};
/** @param {string} text */
const parse = (text) => parseNotes(text, gen());
/** @param {string} text */
const titles = (text) => parse(text).nodes.map((n) => `${n.kind}:${n.title}`);

describe('parseNotes', () => {
  it('turns bold lines into groups and strips trailing colon', () => {
    const { nodes } = parse('**Kế hoạch tuần:**\n1. Viết báo cáo');
    expect(nodes[0]).toMatchObject({ kind: 'group', title: 'Kế hoạch tuần', parentId: null });
    expect(nodes[1]).toMatchObject({ kind: 'task', title: 'Viết báo cáo', parentId: nodes[0].id });
  });

  it('recognises list markers 1. 2) - +', () => {
    expect(titles('1. a\n2) b\n- c\n+ d')).toEqual(['task:a', 'task:b', 'task:c', 'task:d']);
  });

  it('nests deeper-indented lines as children, and tabs count as 4 spaces', () => {
    const { nodes } = parse('- cha\n    - con a\n\t- con b\n        - chau\n- cha 2');
    const [p, a, b, g, p2] = nodes;
    expect(a.parentId).toBe(p.id);
    expect(b.parentId).toBe(p.id);
    expect(g.parentId).toBe(b.id);
    expect(p2.parentId).toBeNull();
  });

  it('marks [DONE] and [x] as done, drops [ ]', () => {
    const { nodes } = parse('- a [DONE]\n- b [x]\n- c [ ]');
    expect(nodes.map((n) => n.status)).toEqual(['done', 'done', 'todo']);
    expect(nodes[2].title).toBe('c');
  });

  it('children inherit a done parent', () => {
    const { nodes } = parse('- cha [DONE]\n  - con\n  - con 2');
    expect(nodes.map((n) => n.status)).toEqual(['done', 'done', 'done']);
  });

  it('detects LÀM CUỐI case-insensitively and removes it', () => {
    const { nodes } = parse('- Gửi mail làm cuối\n- Dọn bàn LÀM CUỐI');
    expect(nodes.map((n) => [n.title, n.doLast])).toEqual([
      ['Gửi mail', true],
      ['Dọn bàn', true],
    ]);
  });

  it('treats plain unindented lines as notes', () => {
    expect(titles('Ghi nhớ chung')).toEqual(['note:Ghi nhớ chung']);
  });

  it('treats indented plain lines and done plain lines as tasks', () => {
    expect(titles('  dòng thụt\nxong rồi [DONE]')).toEqual(['task:dòng thụt', 'task:xong rồi']);
  });

  it('removes asterisks and unescapes backslash escapes', () => {
    expect(titles('- **đậm** việc \\[1\\] \\*sao\\*')).toEqual(['task:đậm việc [1] sao']);
  });

  it('normalises Unicode to NFC', () => {
    const decomposed = 'Việc làm cuối'.normalize('NFD');
    const { nodes } = parse(`- ${decomposed}`);
    expect(nodes[0].doLast).toBe(true);
    expect(nodes[0].title).toBe('Việc');
  });

  it('reports skipped lines and never throws', () => {
    const r = parse('- [DONE]\n\n**:**\n- ok\n\r\n- *');
    expect(r.skippedLines).toEqual([1, 3, 6]);
    expect(r.nodes.map((n) => n.title)).toEqual(['ok']);
    expect(() => parseNotes(/** @type {any} */ (undefined), gen())).not.toThrow();
  });

  it('uses defaults: 60 minutes, heavy', () => {
    const { nodes } = parse('- a');
    expect(nodes[0]).toMatchObject({ durationMin: 60, energy: 'heavy', pinnedStartMin: null });
  });

  it('a new group resets nesting; tasks before any group have no parent', () => {
    const { nodes } = parse('- sớm\n**N1**\n- a\n  - a1\n**N2**\n  - b');
    expect(nodes[0].parentId).toBeNull();
    expect(nodes[5].parentId).toBe(nodes[4].id);
  });
});
