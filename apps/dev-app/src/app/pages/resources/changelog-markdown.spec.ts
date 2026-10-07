import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  blocksToHtml,
  inlineToHtml,
  parseChangelog,
  parseInline,
  plainText,
  safeHref,
} from './changelog-markdown';

const SAMPLE = `# Changelog

Intro paragraph.

## Unreleased

### Docs site — search (W6a)

- **Bold lead.** Text with \`code\` and a [link](https://example.com).
  A continuation line.
  - nested item
- second item

## 1.1.2 — 2026-10-04

Release note paragraph.

### Fixes

- one
`;

describe('parseChangelog', () => {
  const changelog = parseChangelog(SAMPLE);

  it('splits releases with version, date and slug ids', () => {
    expect(changelog.releases.map((release) => release.id)).toEqual([
      'unreleased',
      'v1-1-2',
    ]);
    expect(changelog.releases[1].version).toBe('1.1.2');
    expect(changelog.releases[1].date).toBe('2026-10-04');
    expect(changelog.releases[0].date).toBeNull();
  });

  it('prefixes section ids with their release', () => {
    expect(changelog.releases[0].sections[0].id).toBe(
      'unreleased-docs-site-search-w6a',
    );
    expect(changelog.releases[1].sections[0].id).toBe('v1-1-2-fixes');
  });

  it('nests bullets and folds continuation lines into their item', () => {
    const list = changelog.releases[0].sections[0].blocks[0];
    expect(list.kind).toBe('list');
    if (list.kind !== 'list') return;
    expect(list.items).toHaveLength(2);
    expect(plainText(list.items[0].content)).toBe(
      'Bold lead. Text with code and a link. A continuation line.',
    );
    expect(plainText(list.items[0].children[0].content)).toBe('nested item');
  });

  it('keeps a release-level paragraph', () => {
    expect(changelog.releases[1].blocks[0]).toEqual({
      kind: 'paragraph',
      content: [{ kind: 'text', text: 'Release note paragraph.' }],
    });
  });

  it('parses the real CHANGELOG.md with unique anchors', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../../../../CHANGELOG.md'),
      'utf8',
    );
    const real = parseChangelog(source);
    expect(real.releases.length).toBeGreaterThan(5);
    const ids = real.releases.flatMap((release) => [
      release.id,
      ...release.sections.map((section) => section.id),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('blocksToHtml', () => {
  it('escapes text and emits only its own tags', () => {
    const html = blocksToHtml(
      parseChangelog(
        '## 1.0.0\n\n- `<oge-grid>` & **<img src=x onerror=alert(1)>** [a](javascript:x)\n',
      ).releases[0].blocks,
    );
    expect(html).toBe(
      '<ul><li><code>&lt;oge-grid&gt;</code> &amp; <strong>&lt;img src=x onerror=alert(1)&gt;</strong> a</li></ul>',
    );
  });

  it('opens external links in a new tab', () => {
    expect(inlineToHtml(parseInline('[docs](https://x.dev/?a=1&b="2")'))).toBe(
      '<a href="https://x.dev/?a=1&amp;b=&quot;2&quot;" target="_blank" rel="noopener">docs</a>',
    );
  });
});

describe('parseInline', () => {
  it('reads code, strong, emphasis and links', () => {
    expect(parseInline('a `b` **c** _d_ [e](#f)')).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'code', text: 'b' },
      { kind: 'text', text: ' ' },
      { kind: 'strong', children: [{ kind: 'text', text: 'c' }] },
      { kind: 'text', text: ' ' },
      { kind: 'em', children: [{ kind: 'text', text: 'd' }] },
      { kind: 'text', text: ' ' },
      {
        kind: 'link',
        href: '#f',
        external: false,
        children: [{ kind: 'text', text: 'e' }],
      },
    ]);
  });

  it('leaves snake_case and unclosed markers alone', () => {
    expect(plainText(parseInline('snake_case_name and **open'))).toBe(
      'snake_case_name and **open',
    );
  });

  it('drops unsafe link targets but keeps their text', () => {
    expect(parseInline('[x](javascript:alert(1))')).not.toContainEqual(
      expect.objectContaining({ kind: 'link' }),
    );
    expect(safeHref('data:text/html,hi')).toBeNull();
    expect(safeHref('docs/ARCHITECTURE.md')).toBe(
      'https://github.com/oge-ui/oge-ui/blob/main/docs/ARCHITECTURE.md',
    );
  });
});
