/**
 * The diff viewer's framework-free half: a Myers line diff, word-level
 * highlights inside changed lines, the rows a side-by-side or an inline view
 * draws (unchanged runs folded around their context), and JSON compared as
 * canonical, key-sorted text plus a list of changed paths.
 */

/** One run of a diff: equal, deleted from the old text or inserted in the new. */
export interface OgeDiffOp {
  readonly kind: 'equal' | 'delete' | 'insert';
  /** Index of the run's first line in the old text (for an insert: where it goes). */
  readonly oldStart: number;
  readonly newStart: number;
  readonly count: number;
}

export interface OgeDiffOptions {
  /** Lines differing only in whitespace count as equal. */
  readonly ignoreWhitespace?: boolean;
  /** Lines differing only in letter case count as equal. */
  readonly ignoreCase?: boolean;
}

/** Myers' O(ND) shortest edit script between two sequences of keys. */
function myers(a: readonly string[], b: readonly string[]): OgeDiffOp[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let found = n === 0 && m === 0;
  for (let d = 0; d <= max && !found; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])
          ? v[offset + k + 1]
          : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = true;
        break;
      }
    }
  }
  // walk the trace back into single-line steps
  const steps: ('equal' | 'delete' | 'insert')[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0 && (x > 0 || y > 0); d--) {
    const vd = trace[d];
    const k = x - y;
    const down =
      k === -d || (k !== d && vd[offset + k - 1] < vd[offset + k + 1]);
    const prevK = down ? k + 1 : k - 1;
    const prevX = vd[offset + prevK];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      steps.push('equal');
      x--;
      y--;
    }
    if (d > 0) {
      steps.push(down ? 'insert' : 'delete');
      if (down) y--;
      else x--;
    }
  }
  while (x > 0 && y > 0) {
    steps.push('equal');
    x--;
    y--;
  }
  steps.reverse();
  const ops: OgeDiffOp[] = [];
  let oldAt = 0;
  let newAt = 0;
  for (const kind of steps) {
    const last = ops.at(-1);
    if (last && last.kind === kind) {
      ops[ops.length - 1] = { ...last, count: last.count + 1 };
    } else {
      ops.push({ kind, oldStart: oldAt, newStart: newAt, count: 1 });
    }
    if (kind !== 'insert') oldAt++;
    if (kind !== 'delete') newAt++;
  }
  return ops;
}

/** Splits text into lines (`\n`, `\r\n` or `\r`); an empty text has no lines. */
export function ogeDiffSplitLines(text: string): string[] {
  return text === '' ? [] : text.split(/\r\n|\r|\n/);
}

/** The runs turning `oldLines` into `newLines`. */
export function ogeDiffLines(
  oldLines: readonly string[],
  newLines: readonly string[],
  options: OgeDiffOptions = {},
): OgeDiffOp[] {
  const key = (line: string) => {
    let k = options.ignoreWhitespace ? line.replace(/\s+/g, ' ').trim() : line;
    if (options.ignoreCase) k = k.toLowerCase();
    return k;
  };
  return myers(oldLines.map(key), newLines.map(key));
}

/** A run of a changed line: `changed` runs are the words that differ. */
export interface OgeDiffSegment {
  readonly text: string;
  readonly changed: boolean;
}

const TOKEN = /\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu;

/** Word-level highlights of a changed pair of lines. */
export function ogeDiffWords(
  oldLine: string,
  newLine: string,
): { readonly old: OgeDiffSegment[]; readonly new: OgeDiffSegment[] } {
  const a = oldLine.match(TOKEN) ?? [];
  const b = newLine.match(TOKEN) ?? [];
  const ops = myers(a, b);
  const oldSegments: OgeDiffSegment[] = [];
  const newSegments: OgeDiffSegment[] = [];
  const push = (list: OgeDiffSegment[], text: string, changed: boolean) => {
    const last = list.at(-1);
    if (last && last.changed === changed)
      list[list.length - 1] = { text: last.text + text, changed };
    else list.push({ text, changed });
  };
  for (const op of ops) {
    if (op.kind !== 'insert')
      push(
        oldSegments,
        a.slice(op.oldStart, op.oldStart + op.count).join(''),
        op.kind === 'delete',
      );
    if (op.kind !== 'delete')
      push(
        newSegments,
        b.slice(op.newStart, op.newStart + op.count).join(''),
        op.kind === 'insert',
      );
  }
  return { old: oldSegments, new: newSegments };
}

/** One side of a drawn line. */
export interface OgeDiffCell {
  /** 1-based line number in its text. */
  readonly line: number;
  readonly text: string;
  readonly kind: 'equal' | 'delete' | 'insert';
  /** Word highlights, when the line is half of a changed pair. */
  readonly segments?: readonly OgeDiffSegment[];
}

/** A drawn row: a line (split: both sides; inline: one), or a fold of unchanged lines. */
export type OgeDiffRow =
  | {
      readonly kind: 'line';
      readonly key: string;
      readonly old: OgeDiffCell | null;
      readonly new: OgeDiffCell | null;
      /** Index of the change this row belongs to (for next / previous), `-1` for equal lines. */
      readonly change: number;
    }
  | {
      readonly kind: 'fold';
      readonly key: string;
      /** Unchanged lines hidden here. */
      readonly count: number;
      /** First hidden line, 1-based, in the old and the new text. */
      readonly oldLine: number;
      readonly newLine: number;
    };

export interface OgeDiffRowOptions {
  /** `'split'` (side by side, the default) or `'inline'` (one column). */
  readonly mode?: 'split' | 'inline';
  /** Unchanged lines kept around each change (default 3); `Infinity` folds nothing. */
  readonly context?: number;
  /** Fold keys the user opened. */
  readonly expanded?: ReadonlySet<string>;
  /** Highlight changed words inside changed lines (default `true`). */
  readonly words?: boolean;
}

/** The rows a view draws for a diff. */
export function ogeDiffRows(
  ops: readonly OgeDiffOp[],
  oldLines: readonly string[],
  newLines: readonly string[],
  options: OgeDiffRowOptions = {},
): OgeDiffRow[] {
  const mode = options.mode ?? 'split';
  const context = options.context ?? 3;
  const words = options.words ?? true;
  const rows: OgeDiffRow[] = [];
  let change = -1;
  const equalCell = (o: number, n: number) => ({
    old: { line: o + 1, text: oldLines[o], kind: 'equal' as const },
    new: { line: n + 1, text: newLines[n], kind: 'equal' as const },
  });
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.kind === 'equal') {
      const first = i === 0;
      const last = i === ops.length - 1;
      const keepBefore = first ? 0 : context; // after the previous change
      const keepAfter = last ? 0 : context; // before the next change
      const key = `fold:${op.oldStart}:${op.newStart}`;
      const hidden = op.count - keepBefore - keepAfter;
      const fold =
        Number.isFinite(context) && hidden > 1 && !options.expanded?.has(key);
      for (let j = 0; j < op.count; j++) {
        if (fold && j === keepBefore) {
          rows.push({
            kind: 'fold',
            key,
            count: hidden,
            oldLine: op.oldStart + j + 1,
            newLine: op.newStart + j + 1,
          });
          j += hidden - 1;
          continue;
        }
        const cells = equalCell(op.oldStart + j, op.newStart + j);
        rows.push({
          kind: 'line',
          key: `e:${op.oldStart + j}`,
          old: cells.old,
          new: cells.new,
          change: -1,
        });
      }
      continue;
    }
    // a change: a delete, an insert, or a delete followed by an insert
    change++;
    const del = op.kind === 'delete' ? op : null;
    const next = ops[i + 1];
    const ins =
      op.kind === 'insert' ? op : next?.kind === 'insert' ? next : null;
    if (del && ins) i++;
    const deleted = del
      ? oldLines.slice(del.oldStart, del.oldStart + del.count)
      : [];
    const inserted = ins
      ? newLines.slice(ins.newStart, ins.newStart + ins.count)
      : [];
    const pairs = Math.min(deleted.length, inserted.length);
    const highlight = (k: number) =>
      words && k < pairs ? ogeDiffWords(deleted[k], inserted[k]) : null;
    const oldCell = (k: number): OgeDiffCell => {
      const h = highlight(k);
      return {
        line: (del as OgeDiffOp).oldStart + k + 1,
        text: deleted[k],
        kind: 'delete',
        ...(h ? { segments: h.old } : {}),
      };
    };
    const newCell = (k: number): OgeDiffCell => {
      const h = highlight(k);
      return {
        line: (ins as OgeDiffOp).newStart + k + 1,
        text: inserted[k],
        kind: 'insert',
        ...(h ? { segments: h.new } : {}),
      };
    };
    if (mode === 'split') {
      for (let k = 0; k < Math.max(deleted.length, inserted.length); k++) {
        rows.push({
          kind: 'line',
          key: `c:${change}:${k}`,
          old: k < deleted.length ? oldCell(k) : null,
          new: k < inserted.length ? newCell(k) : null,
          change,
        });
      }
    } else {
      for (let k = 0; k < deleted.length; k++)
        rows.push({
          kind: 'line',
          key: `d:${change}:${k}`,
          old: oldCell(k),
          new: null,
          change,
        });
      for (let k = 0; k < inserted.length; k++)
        rows.push({
          kind: 'line',
          key: `i:${change}:${k}`,
          old: null,
          new: newCell(k),
          change,
        });
    }
  }
  return rows;
}

/** Lines added and removed. */
export function ogeDiffStats(ops: readonly OgeDiffOp[]): {
  readonly added: number;
  readonly removed: number;
  readonly changes: number;
} {
  let added = 0;
  let removed = 0;
  let changes = 0;
  ops.forEach((op, i) => {
    if (op.kind === 'insert') added += op.count;
    if (op.kind === 'delete') removed += op.count;
    // a delete and the insert after it are one change
    if (
      op.kind !== 'equal' &&
      !(op.kind === 'insert' && ops[i - 1]?.kind === 'delete')
    )
      changes++;
  });
  return { added, removed, changes };
}

// --- JSON ---------------------------------------------------------------------

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortDeep((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/**
 * A value as canonical JSON text: two-space indent and, by default, keys in
 * sorted order — so a diff shows what changed, not how it was ordered.
 */
export function ogeJsonDiffText(value: unknown, sortKeys = true): string {
  return JSON.stringify(sortKeys ? sortDeep(value) : value, null, 2) ?? '';
}

/** One changed path of two JSON values. */
export interface OgeJsonChange {
  /** JSONPath-like: `$.items[2].price`. */
  readonly path: string;
  readonly kind: 'added' | 'removed' | 'changed';
  readonly before?: unknown;
  readonly after?: unknown;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** The paths where two JSON values differ: added, removed and changed leaves. */
export function ogeJsonChanges(
  before: unknown,
  after: unknown,
  path = '$',
): OgeJsonChange[] {
  const isObject = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === 'object' && !Array.isArray(v);
  if (Array.isArray(before) && Array.isArray(after)) {
    const out: OgeJsonChange[] = [];
    for (let i = 0; i < Math.max(before.length, after.length); i++) {
      const at = `${path}[${i}]`;
      if (i >= before.length)
        out.push({ path: at, kind: 'added', after: after[i] });
      else if (i >= after.length)
        out.push({ path: at, kind: 'removed', before: before[i] });
      else out.push(...ogeJsonChanges(before[i], after[i], at));
    }
    return out;
  }
  if (isObject(before) && isObject(after)) {
    const out: OgeJsonChange[] = [];
    const keys = [
      ...new Set([...Object.keys(before), ...Object.keys(after)]),
    ].sort();
    for (const key of keys) {
      const at = IDENTIFIER.test(key)
        ? `${path}.${key}`
        : `${path}[${JSON.stringify(key)}]`;
      if (!(key in before))
        out.push({ path: at, kind: 'added', after: after[key] });
      else if (!(key in after))
        out.push({ path: at, kind: 'removed', before: before[key] });
      else out.push(...ogeJsonChanges(before[key], after[key], at));
    }
    return out;
  }
  return Object.is(before, after) ||
    JSON.stringify(before) === JSON.stringify(after)
    ? []
    : [{ path, kind: 'changed', before, after }];
}

/** Parses JSON text; `ok: false` with the parser's message when it is not JSON. */
export function ogeParseJson(
  text: string,
):
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// --- messages and config --------------------------------------------------------

export interface OgeDiffViewerMessages {
  /** Accessible name of the viewer. */
  readonly label: string;
  /** Heading of the old side. */
  readonly oldLabel: string;
  /** Heading of the new side. */
  readonly newLabel: string;
  readonly split: string;
  readonly inline: string;
  readonly previousChange: string;
  readonly nextChange: string;
  /** ICU plural over `{count}`: the label of a fold's button. */
  readonly expand: string;
  /** `{added}` / `{removed}` line counts. */
  readonly stats: string;
  /** Announced on next / previous; `{index}` / `{count}`. */
  readonly changePosition: string;
  readonly noChanges: string;
  /** `{side}` (the old or new label) and the parser's `{error}`. */
  readonly invalidJson: string;
  /** Screen-reader prefixes of a line. */
  readonly added: string;
  readonly removed: string;
}

export const OGE_DEFAULT_DIFF_VIEWER_MESSAGES: OgeDiffViewerMessages = {
  label: 'Comparison',
  oldLabel: 'Before',
  newLabel: 'After',
  split: 'Side by side',
  inline: 'Inline',
  previousChange: 'Previous change',
  nextChange: 'Next change',
  expand:
    '{count, plural, one {Show # unchanged line} other {Show # unchanged lines}}',
  stats: '+{added} −{removed}',
  changePosition: 'Change {index} of {count}',
  noChanges: 'No differences',
  invalidJson: '{side} is not valid JSON: {error}',
  added: 'Added',
  removed: 'Removed',
};

export interface OgeDiffViewerConfig {
  messages: OgeDiffViewerMessages;
  /** Unchanged lines kept around a change (default 3). */
  context?: number;
}

export type OgeDiffViewerConfigInput = Partial<
  Omit<OgeDiffViewerConfig, 'messages'>
> & { messages?: Partial<OgeDiffViewerMessages> };

export const OGE_DEFAULT_DIFF_VIEWER_CONFIG: OgeDiffViewerConfig = {
  messages: OGE_DEFAULT_DIFF_VIEWER_MESSAGES,
};

export function resolveOgeDiffViewerConfig(
  input: OgeDiffViewerConfigInput | undefined,
  base: OgeDiffViewerConfig = OGE_DEFAULT_DIFF_VIEWER_CONFIG,
): OgeDiffViewerConfig {
  return {
    ...base,
    ...input,
    messages: { ...base.messages, ...input?.messages },
  };
}

/** What a viewer compares: two texts, or two JSON documents. */
export type OgeDiffLanguage = 'text' | 'json';

/** Everything a render layer draws for two inputs. */
export interface OgeDiffModel {
  readonly rows: readonly OgeDiffRow[];
  readonly stats: {
    readonly added: number;
    readonly removed: number;
    readonly changes: number;
  };
  /** For JSON: the changed paths (empty for text or when a side is not JSON). */
  readonly changes: readonly OgeJsonChange[];
  /** For JSON: which side failed to parse, and why. */
  readonly error: {
    readonly side: 'old' | 'new';
    readonly message: string;
  } | null;
}

/** Builds a viewer's model: parse (JSON), diff, lay out rows. */
export function ogeDiffModel(
  oldValue: string | unknown,
  newValue: string | unknown,
  options: OgeDiffOptions &
    OgeDiffRowOptions & {
      readonly language?: OgeDiffLanguage;
      readonly sortKeys?: boolean;
    } = {},
): OgeDiffModel {
  let oldText: string;
  let newText: string;
  let changes: OgeJsonChange[] = [];
  if (options.language === 'json') {
    const parse = (value: unknown, side: 'old' | 'new') => {
      if (typeof value !== 'string') return { ok: true as const, value };
      const parsed = ogeParseJson(value);
      return parsed.ok ? parsed : { ...parsed, side };
    };
    const a = parse(oldValue, 'old');
    const b = parse(newValue, 'new');
    if (!a.ok || !b.ok) {
      const failed = (!a.ok ? a : b) as { side: 'old' | 'new'; error: string };
      return {
        rows: [],
        stats: { added: 0, removed: 0, changes: 0 },
        changes: [],
        error: { side: failed.side, message: failed.error },
      };
    }
    oldText = ogeJsonDiffText(a.value, options.sortKeys ?? true);
    newText = ogeJsonDiffText(b.value, options.sortKeys ?? true);
    changes = ogeJsonChanges(a.value, b.value);
  } else {
    oldText = String(oldValue ?? '');
    newText = String(newValue ?? '');
  }
  const oldLines = ogeDiffSplitLines(oldText);
  const newLines = ogeDiffSplitLines(newText);
  const ops = ogeDiffLines(oldLines, newLines, options);
  return {
    rows: ogeDiffRows(ops, oldLines, newLines, options),
    stats: ogeDiffStats(ops),
    changes,
    error: null,
  };
}
