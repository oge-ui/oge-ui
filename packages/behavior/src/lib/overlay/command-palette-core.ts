import { foldTextWithMap, type SearchHighlightSegment } from '@oge-ui/core';

/**
 * The command palette's framework-free half: the fuzzy matcher, the grouped
 * result list, the key map, the recent list and the shortcut parser. Both
 * render layers hold the query / active index themselves and drive the modal
 * surface through `OgeActionSheetCore` (the shared dialog shell: focus trap,
 * scroll lock, inert background, Escape stack, backdrop, focus restore).
 */

/** One command of the palette. */
export interface OgeCommand {
  /** Unique id — tracked in the recent list and reported on run. */
  readonly id: string;
  /** What the option shows and the matcher scores first. */
  readonly label: string;
  /** Heading the command is listed under (first-seen order). */
  readonly group?: string;
  /** Extra words that find the command but are not shown ("settings" → "preferences"). */
  readonly keywords?: readonly string[];
  /** Secondary text after the label; matched with a lower weight. */
  readonly description?: string;
  /** Shortcut shown on the right, e.g. `'Mod+Shift+P'` (`Mod` = ⌘ on Apple, Ctrl elsewhere). */
  readonly shortcut?: string;
  /** SVG path data (24×24 viewBox) drawn before the label. */
  readonly icon?: string;
  /** Listed but not runnable (`aria-disabled`). */
  readonly disabled?: boolean;
  /** Called when the command runs, before the `commandExecute` event. */
  readonly run?: () => void;
}

/** A fuzzy match: higher scores rank first; ranges are `[start, end)` in the source text. */
export interface OgeFuzzyMatch {
  readonly score: number;
  readonly ranges: readonly (readonly [number, number])[];
}

const SEPARATORS = new Set([' ', '-', '_', '.', '/', ':', '(', '[', ',']);

function isWordStart(source: string, index: number): boolean {
  if (index === 0) return true;
  const previous = source[index - 1];
  if (SEPARATORS.has(previous)) return true;
  const char = source[index];
  // camelCase: a capital after a lower-case letter
  return (
    char !== char.toLowerCase() &&
    previous === previous.toLowerCase() &&
    previous !== previous.toUpperCase()
  );
}

function toRanges(positions: readonly number[]): [number, number][] {
  const ranges: [number, number][] = [];
  for (const position of positions) {
    const last = ranges.at(-1);
    if (last && last[1] === position) last[1] = position + 1;
    else ranges.push([position, position + 1]);
  }
  return ranges;
}

/**
 * Scores `text` against `query` — accent- and case-insensitive, the query's
 * characters in order but not necessarily adjacent ("gtst" finds "Go to
 * settings"). Word starts and runs of adjacent characters score higher; a
 * contiguous hit scores higher still, a prefix highest. `null` when some
 * query character is missing. An empty query matches with score 0.
 */
export function ogeFuzzyMatch(
  query: string,
  text: string,
): OgeFuzzyMatch | null {
  const q = foldTextWithMap(query.trim()).folded.replace(/\s+/g, ' ');
  if (!q) return { score: 0, ranges: [] };
  const { folded, sourceIndex } = foldTextWithMap(text);
  const toSource = (from: number, to: number): [number, number] => [
    sourceIndex[from],
    (sourceIndex[to - 1] ?? sourceIndex[from]) + 1,
  ];

  let best: OgeFuzzyMatch | null = null;
  // a contiguous hit — preferring one that starts a word
  let at = folded.indexOf(q);
  let contiguous = -1;
  while (at >= 0) {
    if (contiguous < 0 || isWordStart(text, sourceIndex[at])) {
      contiguous = at;
      if (isWordStart(text, sourceIndex[at])) break;
    }
    at = folded.indexOf(q, at + 1);
  }
  if (contiguous >= 0) {
    const wordStart = isWordStart(text, sourceIndex[contiguous]);
    best = {
      score:
        100 +
        q.length * 4 +
        (contiguous === 0 ? 60 : wordStart ? 30 : 0) -
        folded.length * 0.1,
      ranges: [toSource(contiguous, contiguous + q.length)],
    };
  }

  // a subsequence, taking a word start over an earlier mid-word character
  const chars = q.replace(/ /g, '');
  const positions: number[] = [];
  let score = 0;
  let from = 0;
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    let pick = -1;
    for (let k = from; k < folded.length; k++) {
      if (folded[k] !== char) continue;
      if (pick < 0) pick = k;
      // the next character continues a run: keep it
      if (positions.length && k === positions.at(-1)! + 1) {
        pick = k;
        break;
      }
      if (isWordStart(text, sourceIndex[k])) {
        pick = k;
        break;
      }
    }
    if (pick < 0) return best;
    const adjacent = positions.length > 0 && pick === positions.at(-1)! + 1;
    score +=
      1 +
      (isWordStart(text, sourceIndex[pick]) ? 8 : 0) +
      (adjacent ? 5 : 0) -
      Math.min(pick - from, 10) * 0.2;
    positions.push(pick);
    from = pick + 1;
  }
  if (positions[0] === 0) score += 10;
  score -= folded.length * 0.1;
  if (!best || score > best.score) {
    best = {
      score,
      ranges: toRanges(positions).map(([s, e]) => toSource(s, e)),
    };
  }
  return best;
}

/** Splits `text` into plain and matched runs (for `<mark>`). */
export function ogeFuzzyHighlight(
  text: string,
  ranges: readonly (readonly [number, number])[],
): SearchHighlightSegment[] {
  const segments: SearchHighlightSegment[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor)
      segments.push({ text: text.slice(cursor, start), match: false });
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length)
    segments.push({ text: text.slice(cursor), match: false });
  return segments;
}

/** One listed option. `index` is its position in the flat, keyboard order. */
export interface OgeCommandPaletteOption {
  readonly command: OgeCommand;
  readonly index: number;
  readonly score: number;
  /** The label split into plain and matched runs. */
  readonly segments: readonly SearchHighlightSegment[];
}

/** A heading and its options; `group` is `undefined` for ungrouped commands. */
export interface OgeCommandPaletteSection {
  readonly key: string;
  readonly group: string | undefined;
  /** `true` for the "Recent" section shown above an empty query. */
  readonly recent: boolean;
  readonly options: readonly OgeCommandPaletteOption[];
}

export interface OgeCommandPaletteFilterOptions {
  /** Ids of recently run commands, newest first. */
  readonly recent?: readonly string[];
  /** Upper bound of listed matches (default 50; the empty query lists everything). */
  readonly limit?: number;
}

/**
 * The palette's result list. An empty query lists the recent commands first
 * (a "Recent" section), then every other command by group in first-seen
 * order. A query ranks matches by score — the label first, then the
 * keywords and the description at a discount — and keeps the groups, each
 * ordered by its best match.
 */
export function ogeCommandPaletteSections(
  commands: readonly OgeCommand[],
  query: string,
  options: OgeCommandPaletteFilterOptions = {},
): OgeCommandPaletteSection[] {
  const plain = (command: OgeCommand) => ({
    command,
    score: 0,
    segments: [{ text: command.label, match: false }],
  });
  type Hit = ReturnType<typeof plain>;
  const sections: {
    group: string | undefined;
    recent: boolean;
    hits: Hit[];
  }[] = [];
  const sectionOf = (group: string | undefined, recent = false) => {
    let section = sections.find(
      (s) => s.group === group && s.recent === recent,
    );
    if (!section) {
      section = { group, recent, hits: [] };
      sections.push(section);
    }
    return section;
  };

  if (!query.trim()) {
    const byId = new Map(commands.map((c) => [c.id, c]));
    const recent = (options.recent ?? [])
      .map((id) => byId.get(id))
      .filter((c): c is OgeCommand => !!c);
    const recentIds = new Set(recent.map((c) => c.id));
    if (recent.length)
      sectionOf(undefined, true).hits.push(...recent.map(plain));
    for (const command of commands) {
      if (!recentIds.has(command.id))
        sectionOf(command.group).hits.push(plain(command));
    }
  } else {
    const hits: { hit: Hit; order: number }[] = [];
    commands.forEach((command, order) => {
      const label = ogeFuzzyMatch(query, command.label);
      let score = label?.score ?? -Infinity;
      for (const keyword of command.keywords ?? []) {
        const m = ogeFuzzyMatch(query, keyword);
        if (m) score = Math.max(score, m.score * 0.8);
      }
      if (command.description) {
        const m = ogeFuzzyMatch(query, command.description);
        if (m) score = Math.max(score, m.score * 0.6);
      }
      if (score === -Infinity) return;
      hits.push({
        order,
        hit: {
          command,
          score,
          segments: ogeFuzzyHighlight(command.label, label?.ranges ?? []),
        },
      });
    });
    hits.sort((a, b) => b.hit.score - a.hit.score || a.order - b.order);
    for (const { hit } of hits.slice(0, options.limit ?? 50)) {
      sectionOf(hit.command.group).hits.push(hit);
    }
  }

  let index = 0;
  return sections.map((section) => ({
    key: section.recent ? 'recent' : `group:${section.group ?? ''}`,
    group: section.group,
    recent: section.recent,
    options: section.hits.map((hit) => ({ ...hit, index: index++ })),
  }));
}

/** The sections' options in keyboard order. */
export function ogeCommandPaletteOptions(
  sections: readonly OgeCommandPaletteSection[],
): OgeCommandPaletteOption[] {
  return sections.flatMap((s) => s.options);
}

/** The first runnable option at or after `from` going `step`, wrapping; `-1` when none. */
function nextEnabled(
  options: readonly OgeCommandPaletteOption[],
  from: number,
  step: 1 | -1,
): number {
  const n = options.length;
  for (let i = 0; i < n; i++) {
    const index = (((from + step * i) % n) + n) % n;
    if (!options[index].command.disabled) return index;
  }
  return -1;
}

/** The option made active when the list changes: the first runnable one. */
export function ogeCommandPaletteFirstActive(
  options: readonly OgeCommandPaletteOption[],
): number {
  return options.length ? nextEnabled(options, 0, 1) : -1;
}

export type OgeCommandPaletteKeyIntent =
  { kind: 'move'; index: number } | { kind: 'run'; index: number };

/**
 * The combobox keys: ↑ / ↓ move (wrapping, skipping disabled commands),
 * Page Up / Page Down move by `page`, Ctrl+Home / Ctrl+End jump (plain Home /
 * End stay with the text box), Enter runs the active option. `null` for
 * anything else.
 */
export function ogeCommandPaletteKeyIntent(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>,
  active: number,
  options: readonly OgeCommandPaletteOption[],
  page = 8,
): OgeCommandPaletteKeyIntent | null {
  if (!options.length) return null;
  const last = options.length - 1;
  switch (event.key) {
    case 'ArrowDown':
      return { kind: 'move', index: nextEnabled(options, active + 1, 1) };
    case 'ArrowUp':
      return {
        kind: 'move',
        index: nextEnabled(options, active < 0 ? last : active - 1, -1),
      };
    case 'PageDown':
      return {
        kind: 'move',
        index: nextEnabled(options, Math.min(last, active + page), -1),
      };
    case 'PageUp':
      return {
        kind: 'move',
        index: nextEnabled(options, Math.max(0, active - page), 1),
      };
    case 'Home':
      return event.ctrlKey || event.metaKey
        ? { kind: 'move', index: nextEnabled(options, 0, 1) }
        : null;
    case 'End':
      return event.ctrlKey || event.metaKey
        ? { kind: 'move', index: nextEnabled(options, last, -1) }
        : null;
    case 'Enter':
      return active >= 0 && !options[active]?.command.disabled
        ? { kind: 'run', index: active }
        : null;
    default:
      return null;
  }
}

/** The recent list after running `id`: newest first, de-duplicated, `limit` long. */
export function ogeCommandPaletteRecent(
  recent: readonly string[],
  id: string,
  limit: number,
): string[] {
  if (limit <= 0) return [];
  return [id, ...recent.filter((r) => r !== id)].slice(0, limit);
}

/** A parsed shortcut such as `Mod+Shift+P`. */
export interface OgeShortcut {
  readonly key: string;
  readonly mod: boolean;
  readonly ctrl: boolean;
  readonly meta: boolean;
  readonly shift: boolean;
  readonly alt: boolean;
}

/** Parses `'Mod+K'`, `'Ctrl+Shift+P'`, `'Alt+/'` … (case-insensitive modifiers). */
export function ogeParseShortcut(shortcut: string): OgeShortcut {
  const parts = shortcut.split('+').map((p) => p.trim());
  // 'Mod++' → the key is '+'
  const key =
    parts.at(-1) === '' && parts.length > 1 ? '+' : (parts.pop() ?? '');
  if (key === '+') parts.splice(-2);
  const has = (name: string) =>
    parts.some((p) => p.toLowerCase() === name.toLowerCase());
  return {
    key,
    mod: has('mod'),
    ctrl: has('ctrl') || has('control'),
    meta: has('meta') || has('cmd') || has('command'),
    shift: has('shift'),
    alt: has('alt') || has('option'),
  };
}

/** Whether the platform's primary modifier is ⌘ (Apple) rather than Ctrl. */
export function ogeIsApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ??
    navigator.platform ??
    '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** Whether a keydown is `shortcut`. `Mod` is ⌘ on Apple platforms, Ctrl elsewhere. */
export function ogeMatchesShortcut(
  event: Pick<
    KeyboardEvent,
    'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'
  >,
  shortcut: string,
  apple = ogeIsApplePlatform(),
): boolean {
  const s = ogeParseShortcut(shortcut);
  const ctrl = s.ctrl || (s.mod && !apple);
  const meta = s.meta || (s.mod && apple);
  if (event.ctrlKey !== ctrl || event.metaKey !== meta) return false;
  if (event.altKey !== s.alt) return false;
  // Shift is implied by shifted characters ('?', '+') — only enforce it for letters
  const letter = /^[a-z]$/i.test(s.key);
  if (letter && event.shiftKey !== s.shift) return false;
  if (!letter && s.shift && !event.shiftKey) return false;
  return event.key.toLowerCase() === s.key.toLowerCase();
}

/** A shortcut for display: `⌘⇧P` on Apple platforms, `Ctrl+Shift+P` elsewhere. */
export function ogeFormatShortcut(
  shortcut: string,
  apple = ogeIsApplePlatform(),
): string {
  const s = ogeParseShortcut(shortcut);
  const key = s.key.length === 1 ? s.key.toUpperCase() : s.key;
  if (apple) {
    return (
      (s.ctrl ? '⌃' : '') +
      (s.alt ? '⌥' : '') +
      (s.shift ? '⇧' : '') +
      (s.meta || s.mod ? '⌘' : '') +
      key
    );
  }
  return [
    s.ctrl || s.mod ? 'Ctrl' : '',
    s.meta ? 'Win' : '',
    s.alt ? 'Alt' : '',
    s.shift ? 'Shift' : '',
    key,
  ]
    .filter(Boolean)
    .join('+');
}
