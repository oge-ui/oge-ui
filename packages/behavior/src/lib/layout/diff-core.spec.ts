import {
  OGE_DEFAULT_DIFF_VIEWER_CONFIG,
  ogeDiffModel,
  resolveOgeDiffViewerConfig,
  ogeDiffLines,
  ogeDiffRows,
  ogeDiffSplitLines,
  ogeDiffStats,
  ogeDiffWords,
  ogeJsonChanges,
  ogeJsonDiffText,
  ogeParseJson,
  type OgeDiffOp,
} from './diff-core';

/** Applies a diff to the old lines: must give the new lines. */
function apply(
  ops: readonly OgeDiffOp[],
  oldLines: string[],
  newLines: string[],
): string[] {
  const out: string[] = [];
  for (const op of ops) {
    if (op.kind === 'equal')
      out.push(...oldLines.slice(op.oldStart, op.oldStart + op.count));
    if (op.kind === 'insert')
      out.push(...newLines.slice(op.newStart, op.newStart + op.count));
  }
  return out;
}

describe('ogeDiffLines', () => {
  it('finds the shortest edit script', () => {
    const a = ['a', 'b', 'c', 'a', 'b', 'b', 'a'];
    const b = ['c', 'b', 'a', 'b', 'a', 'c'];
    const ops = ogeDiffLines(a, b);
    expect(apply(ops, a, b)).toEqual(b);
    // Myers' classic example: an edit distance of 5
    const edits = ops
      .filter((o) => o.kind !== 'equal')
      .reduce((s, o) => s + o.count, 0);
    expect(edits).toBe(5);
  });

  it('handles empty sides and identical texts', () => {
    expect(ogeDiffLines([], [])).toEqual([]);
    expect(ogeDiffLines([], ['x'])).toEqual([
      { kind: 'insert', oldStart: 0, newStart: 0, count: 1 },
    ]);
    expect(ogeDiffLines(['x', 'y'], [])).toEqual([
      { kind: 'delete', oldStart: 0, newStart: 0, count: 2 },
    ]);
    expect(ogeDiffLines(['x'], ['x'])).toEqual([
      { kind: 'equal', oldStart: 0, newStart: 0, count: 1 },
    ]);
  });

  it('can ignore whitespace and case', () => {
    expect(
      ogeDiffLines(['a  b'], [' a b '], { ignoreWhitespace: true })[0].kind,
    ).toBe('equal');
    expect(ogeDiffLines(['A'], ['a'], { ignoreCase: true })[0].kind).toBe(
      'equal',
    );
    expect(ogeDiffLines(['A'], ['a'])).toHaveLength(2);
  });

  it('is correct on random edits', () => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let run = 0; run < 40; run++) {
      const a = Array.from(
        { length: Math.floor(rand() * 30) },
        () => 'l' + Math.floor(rand() * 6),
      );
      const b = Array.from(
        { length: Math.floor(rand() * 30) },
        () => 'l' + Math.floor(rand() * 6),
      );
      expect(apply(ogeDiffLines(a, b), a, b)).toEqual(b);
    }
  });

  it('splits lines on every newline style', () => {
    expect(ogeDiffSplitLines('a\r\nb\rc\nd')).toEqual(['a', 'b', 'c', 'd']);
    expect(ogeDiffSplitLines('')).toEqual([]);
  });
});

describe('ogeDiffWords', () => {
  it('highlights the words that changed', () => {
    const { old, new: next } = ogeDiffWords(
      'const total = price * 2;',
      'const total = price * 3;',
    );
    expect(old).toEqual([
      { text: 'const total = price * ', changed: false },
      { text: '2', changed: true },
      { text: ';', changed: false },
    ]);
    expect(next.find((s) => s.changed)?.text).toBe('3');
    expect(ogeDiffWords('', 'new words').new).toEqual([
      { text: 'new words', changed: true },
    ]);
  });
});

describe('ogeDiffRows', () => {
  const oldText = [
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
  ];
  const newText = [
    'one',
    'two',
    'THREE',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
  ];
  const ops = ogeDiffLines(oldText, newText);

  it('pairs a changed line side by side, with word highlights, and folds unchanged runs', () => {
    const rows = ogeDiffRows(ops, oldText, newText, { context: 1 });
    expect(
      rows.map((r) =>
        r.kind === 'fold'
          ? `fold ${r.count}`
          : `${r.old?.line ?? '-'}:${r.new?.line ?? '-'}`,
      ),
    ).toEqual(['1:1', '2:2', '3:3', '4:4', 'fold 5', '10:10', '-:11']);
    const changed = rows[2];
    expect(changed).toMatchObject({
      kind: 'line',
      change: 0,
      old: {
        kind: 'delete',
        text: 'three',
        segments: [{ text: 'three', changed: true }],
      },
      new: { kind: 'insert', text: 'THREE' },
    });
    const fold = rows[4];
    expect(fold).toMatchObject({
      kind: 'fold',
      count: 5,
      oldLine: 5,
      newLine: 5,
    });
    expect(rows[6]).toMatchObject({
      change: 1,
      old: null,
      new: { text: 'eleven' },
    });
  });

  it('opens a fold, folds nothing with an infinite context, and stacks changes inline', () => {
    const folded = ogeDiffRows(ops, oldText, newText, { context: 1 });
    const key = folded.find((r) => r.kind === 'fold')!.key;
    expect(
      ogeDiffRows(ops, oldText, newText, {
        context: 1,
        expanded: new Set([key]),
      }).some((r) => r.kind === 'fold'),
    ).toBe(false);
    expect(
      ogeDiffRows(ops, oldText, newText, { context: Infinity }),
    ).toHaveLength(11);
    const inline = ogeDiffRows(ops, oldText, newText, {
      mode: 'inline',
      context: 0,
      words: false,
    });
    const change = inline.filter((r) => r.kind === 'line' && r.change === 0);
    expect(
      change.map((r) =>
        r.kind === 'line' ? [r.old?.text, r.new?.text] : null,
      ),
    ).toEqual([
      ['three', undefined],
      [undefined, 'THREE'],
    ]);
    expect(
      change[0].kind === 'line' && change[0].old?.segments,
    ).toBeUndefined();
  });

  it('counts additions, removals and changes', () => {
    expect(ogeDiffStats(ops)).toEqual({ added: 2, removed: 1, changes: 2 });
  });
});

describe('JSON', () => {
  it('writes canonical, key-sorted text', () => {
    expect(
      ogeJsonDiffText({ b: 1, a: { d: [2, { z: 0, y: 1 }], c: null } }),
    ).toBe(
      '{\n  "a": {\n    "c": null,\n    "d": [\n      2,\n      {\n        "y": 1,\n        "z": 0\n      }\n    ]\n  },\n  "b": 1\n}',
    );
    expect(ogeJsonDiffText({ b: 1, a: 2 }, false)).toBe(
      '{\n  "b": 1,\n  "a": 2\n}',
    );
    expect(ogeJsonDiffText(undefined)).toBe('');
  });

  it('lists the changed paths', () => {
    const before = {
      name: 'Ada',
      tags: ['a', 'b'],
      price: 10,
      'odd key': 1,
      nested: { on: true },
    };
    const after = {
      name: 'Ada',
      tags: ['a'],
      price: 12,
      extra: 'x',
      nested: { on: true },
    };
    expect(ogeJsonChanges(before, after)).toEqual([
      { path: '$.extra', kind: 'added', after: 'x' },
      { path: '$["odd key"]', kind: 'removed', before: 1 },
      { path: '$.price', kind: 'changed', before: 10, after: 12 },
      { path: '$.tags[1]', kind: 'removed', before: 'b' },
    ]);
    expect(ogeJsonChanges([1], [1, 2])).toEqual([
      { path: '$[1]', kind: 'added', after: 2 },
    ]);
    expect(ogeJsonChanges({ a: 1 }, [1])).toEqual([
      { path: '$', kind: 'changed', before: { a: 1 }, after: [1] },
    ]);
    expect(ogeJsonChanges(NaN, NaN)).toEqual([]);
  });

  it('parses or explains', () => {
    expect(ogeParseJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
    const bad = ogeParseJson('{a:1}');
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.error).toMatch(/JSON|property|token/i);
  });
});

describe('ogeDiffModel', () => {
  it('compares texts', () => {
    const model = ogeDiffModel('a\nb', 'a\nc', { context: Infinity });
    expect(model.stats).toEqual({ added: 1, removed: 1, changes: 1 });
    expect(model.rows).toHaveLength(2);
    expect(model.error).toBeNull();
    expect(ogeDiffModel(null, undefined).rows).toEqual([]);
  });

  it('compares JSON text or values, key order aside, and lists the paths', () => {
    const model = ogeDiffModel(
      '{"b":1,"a":2}',
      { a: 2, b: 3 },
      { language: 'json' },
    );
    expect(model.changes).toEqual([
      { path: '$.b', kind: 'changed', before: 1, after: 3 },
    ]);
    expect(model.stats.changes).toBe(1);
    const unsorted = ogeDiffModel(
      { b: 1, a: 2 },
      { a: 2, b: 1 },
      { language: 'json', sortKeys: false },
    );
    expect(unsorted.stats.changes).toBeGreaterThan(0);
  });

  it('says which side is not JSON', () => {
    expect(
      ogeDiffModel('{"a":1}', '{oops', { language: 'json' }).error,
    ).toMatchObject({ side: 'new' });
    expect(
      ogeDiffModel('nope', '{}', { language: 'json' }).error,
    ).toMatchObject({ side: 'old' });
  });

  it('merges a config over the defaults', () => {
    expect(resolveOgeDiffViewerConfig(undefined)).toEqual(
      OGE_DEFAULT_DIFF_VIEWER_CONFIG,
    );
    const config = resolveOgeDiffViewerConfig({
      context: 1,
      messages: { oldLabel: 'Önce' },
    });
    expect(config.messages.oldLabel).toBe('Önce');
    expect(config.messages.newLabel).toBe('After');
    expect(config.context).toBe(1);
  });
});
