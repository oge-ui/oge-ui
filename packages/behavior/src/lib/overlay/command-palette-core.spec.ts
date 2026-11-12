import {
  ogeCommandPaletteFirstActive,
  ogeCommandPaletteKeyIntent,
  ogeCommandPaletteOptions,
  ogeCommandPaletteRecent,
  ogeCommandPaletteSections,
  ogeFormatShortcut,
  ogeFuzzyHighlight,
  ogeFuzzyMatch,
  ogeIsApplePlatform,
  ogeMatchesShortcut,
  ogeParseShortcut,
  type OgeCommand,
} from './command-palette-core';

const COMMANDS: OgeCommand[] = [
  { id: 'new', label: 'New file', group: 'File', shortcut: 'Mod+N' },
  { id: 'open', label: 'Open file…', group: 'File' },
  { id: 'save', label: 'Save', group: 'File', disabled: true },
  {
    id: 'settings',
    label: 'Go to settings',
    group: 'Navigation',
    keywords: ['preferences'],
  },
  { id: 'theme', label: 'Toggle dark theme', description: 'Appearance' },
  { id: 'şehir', label: 'Şehir seç', group: 'Navigation' },
];

const key = (k: string, mods: Partial<KeyboardEvent> = {}) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

describe('ogeFuzzyMatch', () => {
  it('ranks prefixes over word starts over subsequences', () => {
    const prefix = ogeFuzzyMatch('go', 'Go to settings')!;
    const word = ogeFuzzyMatch('set', 'Go to settings')!;
    const sub = ogeFuzzyMatch('gtst', 'Go to settings')!;
    expect(prefix.ranges).toEqual([[0, 2]]);
    expect(word.ranges).toEqual([[6, 9]]);
    expect(sub.ranges).toEqual([
      [0, 1],
      [3, 4],
      [6, 7],
      [8, 9],
    ]);
    expect(prefix.score).toBeGreaterThan(word.score);
    expect(word.score).toBeGreaterThan(sub.score);
    expect(ogeFuzzyMatch('xyz', 'Go to settings')).toBeNull();
    expect(ogeFuzzyMatch('  ', 'anything')).toEqual({ score: 0, ranges: [] });
  });

  it('folds accents and case, maps ranges to the source, and prefers word starts', () => {
    expect(ogeFuzzyMatch('sehir', 'Şehir seç')!.ranges).toEqual([[0, 5]]);
    // the "t" of "theme" beats the earlier mid-word "t" of "Toggle" only as a run
    expect(ogeFuzzyMatch('dt', 'Toggle dark theme')!.ranges).toEqual([
      [7, 8],
      [12, 13],
    ]);
    // camelCase boundaries are word starts
    expect(ogeFuzzyMatch('fn', 'fileName')!.ranges).toEqual([
      [0, 1],
      [4, 5],
    ]);
    // a contiguous mid-word hit when no word start has it
    expect(ogeFuzzyMatch('ttin', 'Go to settings')!.ranges).toEqual([[8, 12]]);
    expect(ogeFuzzyHighlight('Save', [[0, 2]])).toEqual([
      { text: 'Sa', match: true },
      { text: 've', match: false },
    ]);
    expect(ogeFuzzyHighlight('Save', [[1, 2]])).toEqual([
      { text: 'S', match: false },
      { text: 'a', match: true },
      { text: 've', match: false },
    ]);
  });
});

describe('ogeCommandPaletteSections', () => {
  it('lists recent commands, then the groups, for an empty query', () => {
    const sections = ogeCommandPaletteSections(COMMANDS, '', {
      recent: ['theme', 'missing', 'new'],
    });
    expect(
      sections.map((s) => [s.key, s.options.map((o) => o.command.id)]),
    ).toEqual([
      ['recent', ['theme', 'new']],
      ['group:File', ['open', 'save']],
      ['group:Navigation', ['settings', 'şehir']],
    ]);
    expect(sections[0].recent).toBe(true);
    const options = ogeCommandPaletteOptions(sections);
    expect(options.map((o) => o.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(ogeCommandPaletteSections(COMMANDS, '').map((s) => s.key)).toEqual([
      'group:File',
      'group:Navigation',
      'group:',
    ]);
  });

  it('ranks matches by label, then keywords and description, within groups', () => {
    const sections = ogeCommandPaletteSections(COMMANDS, 'pref');
    expect(ogeCommandPaletteOptions(sections).map((o) => o.command.id)).toEqual(
      ['settings'],
    );
    // found by a keyword: no label highlight
    expect(sections[0].options[0].segments).toEqual([
      { text: 'Go to settings', match: false },
    ]);
    const appearance = ogeCommandPaletteSections(COMMANDS, 'appear');
    expect(appearance[0].options[0].command.id).toBe('theme');
    const file = ogeCommandPaletteSections(COMMANDS, 'file');
    expect(file[0].options.map((o) => o.command.id)).toEqual(['new', 'open']);
    expect(file[0].options[0].segments).toEqual([
      { text: 'New ', match: false },
      { text: 'file', match: true },
    ]);
    expect(
      ogeCommandPaletteSections(COMMANDS, 'e', { limit: 2 }).flatMap(
        (s) => s.options,
      ),
    ).toHaveLength(2);
    expect(ogeCommandPaletteSections(COMMANDS, 'qqq')).toEqual([]);
  });
});

describe('keys and the recent list', () => {
  const options = ogeCommandPaletteOptions(
    ogeCommandPaletteSections(COMMANDS, ''),
  );
  // order: new, open, save (disabled), settings, şehir, theme

  it('moves, wraps, skips disabled options and runs the active one', () => {
    expect(ogeCommandPaletteFirstActive(options)).toBe(0);
    expect(ogeCommandPaletteFirstActive([])).toBe(-1);
    expect(ogeCommandPaletteKeyIntent(key('ArrowDown'), 1, options)).toEqual({
      kind: 'move',
      index: 3,
    });
    expect(ogeCommandPaletteKeyIntent(key('ArrowUp'), 3, options)).toEqual({
      kind: 'move',
      index: 1,
    });
    expect(ogeCommandPaletteKeyIntent(key('ArrowDown'), 5, options)).toEqual({
      kind: 'move',
      index: 0,
    });
    expect(ogeCommandPaletteKeyIntent(key('ArrowUp'), 0, options)).toEqual({
      kind: 'move',
      index: 5,
    });
    expect(ogeCommandPaletteKeyIntent(key('ArrowUp'), -1, options)).toEqual({
      kind: 'move',
      index: 5,
    });
    expect(ogeCommandPaletteKeyIntent(key('PageDown'), 0, options, 2)).toEqual({
      kind: 'move',
      index: 1,
    });
    expect(ogeCommandPaletteKeyIntent(key('PageUp'), 5, options, 3)).toEqual({
      kind: 'move',
      index: 3,
    });
    expect(ogeCommandPaletteKeyIntent(key('Home'), 4, options)).toBeNull();
    expect(
      ogeCommandPaletteKeyIntent(key('Home', { ctrlKey: true }), 4, options),
    ).toEqual({ kind: 'move', index: 0 });
    expect(
      ogeCommandPaletteKeyIntent(key('End', { metaKey: true }), 0, options),
    ).toEqual({ kind: 'move', index: 5 });
    expect(ogeCommandPaletteKeyIntent(key('End'), 0, options)).toBeNull();
    expect(ogeCommandPaletteKeyIntent(key('Enter'), 3, options)).toEqual({
      kind: 'run',
      index: 3,
    });
    expect(ogeCommandPaletteKeyIntent(key('Enter'), 2, options)).toBeNull();
    expect(ogeCommandPaletteKeyIntent(key('Enter'), -1, options)).toBeNull();
    expect(ogeCommandPaletteKeyIntent(key('x'), 0, options)).toBeNull();
    expect(ogeCommandPaletteKeyIntent(key('ArrowDown'), 0, [])).toBeNull();
    const allDisabled = options.map((o) => ({
      ...o,
      command: { ...o.command, disabled: true },
    }));
    expect(ogeCommandPaletteFirstActive(allDisabled)).toBe(-1);
  });

  it('keeps a de-duplicated, bounded recent list', () => {
    expect(ogeCommandPaletteRecent(['a', 'b', 'c'], 'b', 3)).toEqual([
      'b',
      'a',
      'c',
    ]);
    expect(ogeCommandPaletteRecent(['a', 'b'], 'c', 2)).toEqual(['c', 'a']);
    expect(ogeCommandPaletteRecent(['a'], 'b', 0)).toEqual([]);
  });
});

describe('shortcuts', () => {
  it('parses modifiers and the key', () => {
    expect(ogeParseShortcut('Mod+Shift+P')).toEqual({
      key: 'P',
      mod: true,
      ctrl: false,
      meta: false,
      shift: true,
      alt: false,
    });
    expect(ogeParseShortcut('Ctrl++').key).toBe('+');
    expect(ogeParseShortcut('Ctrl++').ctrl).toBe(true);
    expect(ogeParseShortcut('Cmd+Option+K')).toMatchObject({
      meta: true,
      alt: true,
    });
  });

  it('matches keydowns with Mod as Ctrl or ⌘', () => {
    expect(
      ogeMatchesShortcut(key('k', { ctrlKey: true }), 'Mod+K', false),
    ).toBe(true);
    expect(
      ogeMatchesShortcut(key('k', { metaKey: true }), 'Mod+K', false),
    ).toBe(false);
    expect(ogeMatchesShortcut(key('K', { metaKey: true }), 'Mod+K', true)).toBe(
      true,
    );
    expect(
      ogeMatchesShortcut(
        key('k', { ctrlKey: true, shiftKey: true }),
        'Mod+K',
        false,
      ),
    ).toBe(false);
    expect(
      ogeMatchesShortcut(
        key('k', { ctrlKey: true, altKey: true }),
        'Mod+K',
        false,
      ),
    ).toBe(false);
    // shifted characters imply Shift
    expect(ogeMatchesShortcut(key('?', { shiftKey: true }), '?', false)).toBe(
      true,
    );
    expect(ogeMatchesShortcut(key('/'), 'Shift+/', false)).toBe(false);
    expect(
      ogeMatchesShortcut(key('j', { ctrlKey: true }), 'Mod+K', false),
    ).toBe(false);
  });

  it('formats for Apple and other platforms', () => {
    expect(ogeFormatShortcut('Mod+Shift+P', true)).toBe('⇧⌘P');
    expect(ogeFormatShortcut('Ctrl+Alt+Delete', true)).toBe('⌃⌥Delete');
    expect(ogeFormatShortcut('Mod+Shift+P', false)).toBe('Ctrl+Shift+P');
    expect(ogeFormatShortcut('Meta+k', false)).toBe('Win+K');
    expect(typeof ogeIsApplePlatform()).toBe('boolean');
  });
});
