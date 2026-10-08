import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { compileString } from 'sass';

/**
 * Guards the token architecture described at the top of `_tokens.scss`:
 * defaults on a zero-specificity root scope (never on a component host), and
 * scoped theme files that re-declare every derived token so a themed subtree
 * re-resolves it.
 */
const stylesDir = __dirname;
const themesDir = join(stylesDir, 'themes');
// line endings normalized: a Windows checkout with core.autocrlf reads CRLF
const tokensSource = readFileSync(
  join(stylesDir, '_tokens.scss'),
  'utf8',
).replace(/\r\n/g, '\n');

/** `--name: value;` pairs of one SCSS mixin body. */
function mixinDeclarations(name: string): Map<string, string> {
  const start = tokensSource.indexOf(`@mixin ${name} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = tokensSource.indexOf('\n}\n', start);
  return declarations(tokensSource.slice(start, end));
}

function declarations(block: string): Map<string, string> {
  const withoutComments = block.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Map<string, string>();
  for (const match of withoutComments.matchAll(
    /(--oge-[a-z0-9-]+)\s*:\s*([^;]+);/g,
  )) {
    // formatting-insensitive: prettier wraps long values differently at
    // different indentation depths
    const value = match[2]
      .replace(/\s+/g, ' ')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .trim();
    out.set(match[1], value);
  }
  return out;
}

/**
 * The style rules of a plain CSS file with their selector text; at-rule
 * blocks (`@media`) are descended into transparently.
 */
function ruleBodies(css: string): { selector: string; body: string }[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: { selector: string; body: string }[] = [];
  const stack: { prelude: string; bodyStart: number }[] = [];
  let preludeStart = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      stack.push({
        // a statement before the prelude (`@charset …;`) is not part of it
        prelude: text.slice(preludeStart, i).split(';').pop()?.trim() ?? '',
        bodyStart: i + 1,
      });
      preludeStart = i + 1;
    } else if (text[i] === '}') {
      const frame = stack.pop();
      if (frame && !frame.prelude.startsWith('@')) {
        rules.push({
          selector: frame.prelude,
          body: text.slice(frame.bodyStart, i),
        });
      }
      preludeStart = i + 1;
    }
  }
  return rules;
}

const derived = mixinDeclarations('derived-tokens');
const literal = mixinDeclarations('literal-tokens');

describe('design tokens', () => {
  it('keeps literal and derived tokens apart', () => {
    for (const [name, value] of literal) {
      expect(value, `${name} is an expression`).not.toMatch(/var\(--oge-/);
    }
    for (const [name, value] of derived) {
      expect(value, `${name} is not derived`).toMatch(/var\(--oge-/);
      expect(literal.has(name), `${name} is declared twice`).toBe(false);
    }
  });

  it('emits the defaults at zero specificity, never on the component host', () => {
    const css = compileString(
      `@use 'tokens';\n.oge-probe { @include tokens.core-tokens; color: red; }`,
      { loadPaths: [stylesDir] },
    ).css;
    const host = ruleBodies(css).find((r) => r.selector === '.oge-probe');
    expect(host?.body).not.toMatch(/--oge-/);
    const root = ruleBodies(css).find((r) =>
      r.selector.replace(/\s+/g, ' ').startsWith(':where(:root,'),
    );
    expect(root).toBeDefined();
    const emitted = declarations(root?.body ?? '');
    expect(emitted.get('--oge-bg')).toBe('#ffffff');
    expect(emitted.get('--oge-accent-soft')).toBe(
      derived.get('--oge-accent-soft'),
    );
  });
});

describe('theme files', () => {
  const files = readdirSync(themesDir).filter((f) => f.endsWith('.css'));

  it('ships the four themes', () => {
    expect(files.sort()).toEqual([
      'bootstrap.css',
      'dark.css',
      'high-contrast.css',
      'tailwind.css',
    ]);
  });

  for (const file of files) {
    const css = readFileSync(join(themesDir, file), 'utf8');
    const rules = ruleBodies(css);

    it(`${file}: targets scopes, not component hosts`, () => {
      for (const rule of rules) {
        expect(rule.selector, file).not.toMatch(/\.oge-(?!theme-)[a-z-]+/);
      }
    });

    it(`${file}: re-declares every derived token in each scope (a theme may re-derive one differently, never drop it)`, () => {
      expect(rules.length).toBeGreaterThan(0);
      for (const rule of rules) {
        const scoped = declarations(rule.body);
        for (const name of derived.keys()) {
          expect(scoped.has(name), `${file} ${rule.selector}: ${name}`).toBe(
            true,
          );
        }
      }
    });
  }

  it('dark.css: the auto block is the explicit block, verbatim', () => {
    const rules = ruleBodies(readFileSync(join(themesDir, 'dark.css'), 'utf8'));
    expect(rules.map((r) => r.selector.replace(/\s+/g, ' '))).toEqual([
      ".oge-theme-dark, [data-oge-theme='dark']",
      ".oge-theme-auto, [data-oge-theme='auto']",
    ]);
    expect([...declarations(rules[1].body)]).toEqual([
      ...declarations(rules[0].body),
    ]);
  });
});

/** WCAG relative-luminance contrast ratio of two `#rrggbb` colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string): number => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, bl] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('high-contrast.css', () => {
  const rules = ruleBodies(
    readFileSync(join(themesDir, 'high-contrast.css'), 'utf8'),
  );
  const tokens = declarations(rules[0]?.body ?? '');
  const t = (name: string): string => {
    const value = tokens.get(name);
    expect(value, name).toMatch(/^#[0-9a-f]{6}$/i);
    return value as string;
  };

  it('is one scope block: class and attribute form', () => {
    expect(rules.map((r) => r.selector.replace(/\s+/g, ' '))).toEqual([
      ".oge-theme-high-contrast, [data-oge-theme='high-contrast']",
    ]);
  });

  it('keeps text at AAA contrast (>= 7:1) on every surface it sits on', () => {
    const text: [string, string][] = [
      ['--oge-text-color', '--oge-bg'],
      ['--oge-text-color', '--oge-header-bg'],
      ['--oge-text-color', '--oge-row-hover-bg'],
      ['--oge-text-color', '--oge-selected-bg'],
      ['--oge-text-color', '--oge-popup-bg'],
      ['--oge-header-color', '--oge-header-bg'],
      ['--oge-muted-color', '--oge-bg'],
      ['--oge-muted-color', '--oge-header-bg'],
      ['--oge-muted-color', '--oge-row-hover-bg'],
      // accent as text: selected tab, link, text / outlined button, active
      // pager page, menu item, toggle — on every surface it is drawn on
      ['--oge-accent', '--oge-bg'],
      ['--oge-accent', '--oge-header-bg'],
      ['--oge-accent', '--oge-selected-bg'],
      ['--oge-accent', '--oge-popup-bg'],
      ['--oge-accent', '--oge-row-hover-bg'],
      ['--oge-accent', '--oge-row-alt-bg'],
      ['--oge-accent', '--oge-detail-bg'],
      ['--oge-accent', '--oge-kanban-column-bg'],
      ['--oge-severity-contrast', '--oge-accent'],
      ['--oge-severity-contrast', '--oge-success'],
      ['--oge-severity-contrast', '--oge-warning'],
      ['--oge-severity-contrast', '--oge-danger'],
      ['--oge-success', '--oge-bg'],
      ['--oge-warning', '--oge-bg'],
      ['--oge-danger', '--oge-bg'],
      ['--oge-badge-color', '--oge-badge-bg'],
      ['--oge-tooltip-color', '--oge-tooltip-bg'],
      ['--oge-gantt-bar-fg', '--oge-accent'],
      ['--oge-scheduler-chip-fg', '--oge-accent'],
      ['--oge-kanban-avatar-fg', '--oge-kanban-avatar-bg'],
    ];
    for (const [fg, bg] of text) {
      expect(contrast(t(fg), t(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(
        7,
      );
    }
  });

  it('is a light-surface palette: accent text needs the light surface it is tuned for', () => {
    // Transparent components (tabs, text buttons, links) paint on the page,
    // not on --oge-bg. The palette's AAA pairs hold against its own light
    // surface only — on a near-black page the same accent falls under 3:1,
    // which is why the theme declares `color-scheme: light` and the docs
    // render light while it is active.
    expect(rules[0]?.body).toMatch(/(^|[;{\s])color-scheme:\s*light;/);
    expect(contrast(t('--oge-bg'), '#ffffff')).toBeLessThan(1.1);
    expect(contrast(t('--oge-popup-bg'), '#ffffff')).toBeLessThan(1.1);
  });

  it('keeps borders and other UI parts at >= 3:1', () => {
    for (const ui of [
      '--oge-border-color',
      '--oge-accent',
      '--oge-scrollbar-thumb',
      '--oge-gantt-arrow-color',
      '--oge-gantt-milestone-bg',
      '--oge-gantt-summary-bg',
    ]) {
      expect(contrast(t(ui), t('--oge-bg')), ui).toBeGreaterThanOrEqual(3);
    }
    // a solid focus ring: the 40%-tint default would fall under 3:1
    expect(tokens.get('--oge-focus-ring')).toBe('var(--oge-accent)');
  });
});

/**
 * WCAG AA for the default and the dark palette (the e2e contrast scan,
 * `contrast.spec.ts`, found `--oge-muted-color` at 2.6:1 and white on the
 * success / warning fills at 3.2:1): muted text and the severity colours
 * read at >= 4.5:1 on the surfaces they sit on, and the text on a filled
 * severity / accent control does too.
 */
describe.each([
  ['default tokens', () => mixinDeclarations('literal-tokens')],
  [
    'dark.css',
    () =>
      declarations(
        ruleBodies(readFileSync(join(themesDir, 'dark.css'), 'utf8'))[0]
          ?.body ?? '',
      ),
  ],
])('%s: AA text contrast', (_name, read) => {
  const tokens = read();
  const t = (name: string): string => {
    const value = tokens.get(name);
    expect(value, name).toMatch(/^#[0-9a-f]{6}$/i);
    return value as string;
  };

  it('muted text and severity colours read on every surface (>= 4.5:1)', () => {
    for (const fg of [
      '--oge-muted-color',
      '--oge-success',
      '--oge-warning',
      '--oge-danger',
    ]) {
      for (const bg of [
        '--oge-bg',
        '--oge-header-bg',
        '--oge-group-bg',
        '--oge-row-hover-bg',
      ]) {
        if (fg !== '--oge-muted-color' && bg !== '--oge-bg') continue;
        expect(contrast(t(fg), t(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });

  it('a colour on its own soft tint reads once deepened toward the text (>= 4.5:1)', () => {
    // the recipe the components use for a label on a soft fill (avatar
    // initials, pressed toolbar / gantt toggles, the active drawer item,
    // severity badges): `color-mix(in srgb, <colour> 80%, --oge-text-color)`
    // on the colour tinted over the surface — 16% is the strongest tint any
    // soft token or `--oge-avatar-bg` uses
    const mixHex = (a: string, b: string, p: number): string => {
      const rgb = (hex: string) => {
        const n = parseInt(hex.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      };
      const [x, y] = [rgb(a), rgb(b)];
      return `#${x
        .map((v, i) =>
          Math.round(v * p + y[i] * (1 - p))
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')}`;
    };
    for (const colour of [
      '--oge-accent',
      '--oge-success',
      '--oge-warning',
      '--oge-danger',
    ]) {
      const text = mixHex(t(colour), t('--oge-text-color'), 0.8);
      for (const tint of [0.08, 0.12, 0.16]) {
        const fill = mixHex(t(colour), t('--oge-bg'), tint);
        expect(
          contrast(text, fill),
          `${colour} (80% toward text) on its ${tint * 100}% tint`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(derived.get('--oge-avatar-fg')).toBe(
      'color-mix(in srgb, var(--oge-accent) 80%, var(--oge-text-color))',
    );
  });

  it('text on filled severity and accent controls reads (>= 4.5:1)', () => {
    for (const fill of [
      '--oge-accent',
      '--oge-success',
      '--oge-warning',
      '--oge-danger',
    ]) {
      expect(
        contrast(t('--oge-severity-contrast'), t(fill)),
        `--oge-severity-contrast on ${fill}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

/**
 * Consumer knobs a stylesheet reads with a fallback and nothing declares by
 * design — setting one is how an app opts in. Anything else a stylesheet
 * reads must be declared: a misspelt token with a literal fallback renders
 * the literal forever (`--oge-text-muted` did, on every theme).
 */
const OPTIONAL_HOOKS = new Set([
  '--oge-form-cols-xs',
  '--oge-form-cols-sm',
  '--oge-form-cols-md',
  '--oge-form-cols-lg',
  '--oge-form-cols-xl',
  '--oge-gantt-list-width',
  '--oge-gantt-row-height',
  '--oge-gantt-scale-bg',
  '--oge-input-width',
  '--oge-kanban-slot',
  '--oge-modal-transition',
  '--oge-toast-gap',
  '--oge-toast-offset',
  '--oge-toast-transition',
  '--oge-scheduler-slot-height',
]);

describe('token references', () => {
  const packagesDir = join(stylesDir, '../../../..');

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path, out);
      else if (
        /\.(scss|css|ts|tsx)$/.test(entry.name) &&
        !/\.spec\./.test(entry.name)
      )
        out.push(path);
    }
    return out;
  }

  it('every var(--oge-*) a stylesheet reads is declared somewhere', () => {
    const files = walk(packagesDir);
    const declared = new Set<string>();
    const read = new Map<string, string>();
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      // stylesheet declarations, and TS/TSX style bindings that set a
      // property at runtime (`[style.--oge-x]`, `'--oge-x': …`, setProperty)
      for (const m of text.matchAll(
        /(--oge-[a-z0-9-]+)(?:\.[a-z%]+)?\s*['"]?\s*[:\]]/g,
      ))
        declared.add(m[1]);
      for (const m of text.matchAll(/setProperty\(\s*['"`](--oge-[a-z0-9-]+)/g))
        declared.add(m[1]);
      if (/\.s?css$/.test(file)) {
        for (const m of text.matchAll(/var\(\s*(--oge-[a-z0-9-]+)/g))
          if (!read.has(m[1])) read.set(m[1], file);
      }
    }
    const unknown = [...read].filter(
      ([name]) => !declared.has(name) && !OPTIONAL_HOOKS.has(name),
    );
    expect(
      unknown.map(
        ([name, file]) => `${name} (${file.slice(packagesDir.length)})`,
      ),
    ).toEqual([]);
  });
});
