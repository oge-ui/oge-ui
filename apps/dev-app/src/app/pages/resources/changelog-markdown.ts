/**
 * A deliberately small Markdown reader for `CHANGELOG.md` — the subset that
 * file is written in: `##` releases, `###` sections, paragraphs, `-` bullet
 * lists (nested by indentation, with continuation lines), and inline
 * `` `code` ``, `**strong**`, `_em_` / `*em*` and `[links](url)`.
 *
 * It parses into data, then serializes that data itself (`blocksToHtml`):
 * every text run is escaped, the only tags are `p`, `ul`, `li`, `code`,
 * `strong`, `em` and `a`, and links are limited to http(s), mailto and
 * in-page anchors (repo-relative paths become GitHub links) — so nothing in
 * the file can inject markup. The page still binds the result through
 * Angular's sanitizer.
 */

export type Inline =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'strong'; readonly children: readonly Inline[] }
  | { readonly kind: 'em'; readonly children: readonly Inline[] }
  | {
      readonly kind: 'link';
      readonly href: string;
      readonly external: boolean;
      readonly children: readonly Inline[];
    };

export interface ListItem {
  readonly content: readonly Inline[];
  readonly children: readonly ListItem[];
}

export type Block =
  | { readonly kind: 'paragraph'; readonly content: readonly Inline[] }
  | { readonly kind: 'list'; readonly items: readonly ListItem[] };

export interface ChangelogSection {
  readonly id: string;
  readonly title: readonly Inline[];
  /** Plain-text title, for the anchor's accessible name. */
  readonly label: string;
  readonly blocks: readonly Block[];
}

export interface ChangelogRelease {
  readonly id: string;
  /** `1.1.2`, or `Unreleased`. */
  readonly version: string;
  /** ISO date after the em dash, when the heading carries one. */
  readonly date: string | null;
  readonly blocks: readonly Block[];
  readonly sections: readonly ChangelogSection[];
}

export interface Changelog {
  /** Paragraphs before the first release. */
  readonly intro: readonly Block[];
  readonly releases: readonly ChangelogRelease[];
}

const REPO_BLOB = 'https://github.com/oge-ui/oge-ui/blob/main/';

/** "1.1.2" → "1-1-2" — the same slugifier the demo cards use. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * `1.1.2` → `v1-1-2`, `Unreleased` → `unreleased`. The `v` keeps the id a
 * valid CSS identifier (`#1-1-2` is not), and `releaseLabel` gives the
 * "On this page" rail the text that slugifies to it.
 */
export function releaseId(version: string): string {
  return slugify(releaseLabel(version));
}

/** `1.1.2` → `v1.1.2`; a non-numeric heading is kept as written. */
export function releaseLabel(version: string): string {
  return /^\d/.test(version) ? `v${version}` : version;
}

/** A slug cut at a word boundary, so section anchors stay readable. */
function shortSlug(text: string, max = 60): string {
  const slug = slugify(text);
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max);
  const dash = cut.lastIndexOf('-');
  return dash > 20 ? cut.slice(0, dash) : cut;
}

export function parseChangelog(source: string): Changelog {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const intro: Block[] = [];
  const releases: {
    id: string;
    version: string;
    date: string | null;
    blocks: Block[];
    sections: { id: string; title: Inline[]; label: string; blocks: Block[] }[];
  }[] = [];
  const usedIds = new Set<string>();
  const unique = (id: string): string => {
    let candidate = id || 'section';
    for (let n = 2; usedIds.has(candidate); n++) candidate = `${id}-${n}`;
    usedIds.add(candidate);
    return candidate;
  };

  let target: Block[] = intro;
  let chunk: string[] = [];
  const flush = (): void => {
    if (chunk.length) target.push(...parseBlocks(chunk));
    chunk = [];
  };

  for (const line of lines) {
    const release = /^## (.+)$/.exec(line);
    if (release) {
      flush();
      const [version, date] = release[1].split(/\s+—\s+/);
      const entry = {
        id: unique(releaseId(version.trim())),
        version: version.trim(),
        date: date?.trim() || null,
        blocks: [] as Block[],
        sections: [],
      };
      releases.push(entry);
      target = entry.blocks;
      continue;
    }
    const section = /^### (.+)$/.exec(line);
    const current = releases[releases.length - 1];
    if (section && current) {
      flush();
      const title = parseInline(section[1].trim());
      const label = plainText(title);
      const entry = {
        id: unique(`${current.id}-${shortSlug(label)}`),
        title,
        label,
        blocks: [] as Block[],
      };
      current.sections.push(entry);
      target = entry.blocks;
      continue;
    }
    if (/^# /.test(line)) continue; // the document title
    chunk.push(line);
  }
  flush();
  return { intro, releases };
}

/** Paragraphs and (nested) bullet lists out of one run of lines. */
function parseBlocks(lines: readonly string[]): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let listLines: string[] = [];
  const endParagraph = (): void => {
    if (paragraph.length) {
      blocks.push({
        kind: 'paragraph',
        content: parseInline(paragraph.join(' ')),
      });
    }
    paragraph = [];
  };
  const endList = (): void => {
    if (listLines.length)
      blocks.push({ kind: 'list', items: parseList(listLines) });
    listLines = [];
  };
  for (const line of lines) {
    if (!line.trim()) {
      endParagraph();
      // a blank line inside a list keeps the list open; the next bullet or
      // indented line continues it
      if (listLines.length) listLines.push('');
      continue;
    }
    if (/^\s*[-*] /.test(line)) {
      endParagraph();
      listLines.push(line);
      continue;
    }
    if (listLines.length && /^\s+\S/.test(line)) {
      listLines.push(line);
      continue;
    }
    if (listLines.length && listLines[listLines.length - 1] !== '') {
      // a lazy continuation line of the last bullet
      listLines.push(line);
      continue;
    }
    endList();
    paragraph.push(line.trim());
  }
  endParagraph();
  endList();
  return blocks;
}

/** Bullet lines → items, nesting by the bullet's indentation. */
function parseList(lines: readonly string[]): ListItem[] {
  interface Draft {
    indent: number;
    text: string[];
    children: Draft[];
  }
  const root: Draft = { indent: -1, text: [], children: [] };
  const stack: Draft[] = [root];
  let last: Draft | null = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    const bullet = /^(\s*)[-*] (.*)$/.exec(line);
    if (bullet) {
      const indent = bullet[1].length;
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      const item: Draft = { indent, text: [bullet[2].trim()], children: [] };
      stack[stack.length - 1].children.push(item);
      stack.push(item);
      last = item;
      continue;
    }
    last?.text.push(line.trim());
  }
  const finish = (draft: Draft): ListItem => ({
    content: parseInline(draft.text.join(' ')),
    children: draft.children.map(finish),
  });
  return root.children.map(finish);
}

/** Inline markup → tokens. Unclosed markers are kept as literal text. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let buffer = '';
  const pushText = (): void => {
    if (buffer) out.push({ kind: 'text', text: buffer });
    buffer = '';
  };
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === '`') {
      const fence = /^`+/.exec(text.slice(i))?.[0] ?? '`';
      const end = text.indexOf(fence, i + fence.length);
      if (end > i) {
        pushText();
        out.push({
          kind: 'code',
          text: text.slice(i + fence.length, end).trim() || ' ',
        });
        i = end + fence.length;
        continue;
      }
    }
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end > i + 2) {
        pushText();
        out.push({
          kind: 'strong',
          children: parseInline(text.slice(i + 2, end)),
        });
        i = end + 2;
        continue;
      }
    }
    if ((char === '_' || char === '*') && isEmphasisStart(text, i)) {
      const end = findEmphasisEnd(text, i);
      if (end > 0) {
        pushText();
        out.push({ kind: 'em', children: parseInline(text.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    if (char === '[') {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(text.slice(i));
      if (link) {
        const href = safeHref(link[2]);
        pushText();
        if (href) {
          out.push({
            kind: 'link',
            href,
            external: !href.startsWith('#'),
            children: parseInline(link[1]),
          });
        } else {
          out.push(...parseInline(link[1]));
        }
        i += link[0].length;
        continue;
      }
    }
    buffer += char;
    i++;
  }
  pushText();
  return out;
}

/** `_x_` opens only at a word boundary — `snake_case` is not emphasis. */
function isEmphasisStart(text: string, at: number): boolean {
  const before = at === 0 ? ' ' : text[at - 1];
  const after = text[at + 1] ?? ' ';
  return !/[\w*]/.test(before) && /\S/.test(after) && after !== text[at];
}

function findEmphasisEnd(text: string, at: number): number {
  const marker = text[at];
  for (let j = at + 2; j < text.length; j++) {
    if (text[j] === '`') {
      const close = text.indexOf('`', j + 1);
      if (close < 0) return -1;
      j = close;
      continue;
    }
    if (text[j] !== marker) continue;
    const after = text[j + 1] ?? ' ';
    if (/\S/.test(text[j - 1]) && !/\w/.test(after)) return j;
  }
  return -1;
}

/**
 * Only links a reader can safely follow: http(s), mailto, in-page anchors;
 * a repo-relative path (`docs/ARCHITECTURE.md`) opens on GitHub. Anything
 * else (`javascript:`, `data:`) is dropped and its text kept.
 */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) return href;
  if (href.startsWith('#')) return href;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null;
  if (href.startsWith('//')) return null;
  return REPO_BLOB + href.replace(/^\.?\//, '');
}

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes text for an HTML text node or a double-quoted attribute. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/**
 * Serializes an inline run. Every text is escaped and the only tags are the
 * four this module emits — the page then binds the string through Angular's
 * sanitizer as a second line of defence.
 */
export function inlineToHtml(inlines: readonly Inline[]): string {
  return inlines
    .map((inline) => {
      switch (inline.kind) {
        case 'text':
          return escapeHtml(inline.text);
        case 'code':
          return `<code>${escapeHtml(inline.text)}</code>`;
        case 'strong':
          return `<strong>${inlineToHtml(inline.children)}</strong>`;
        case 'em':
          return `<em>${inlineToHtml(inline.children)}</em>`;
        case 'link':
          return inline.external
            ? `<a href="${escapeHtml(inline.href)}" target="_blank" rel="noopener">${inlineToHtml(inline.children)}</a>`
            : `<a href="${escapeHtml(inline.href)}">${inlineToHtml(inline.children)}</a>`;
      }
    })
    .join('');
}

function listToHtml(items: readonly ListItem[]): string {
  return `<ul>${items
    .map(
      (item) =>
        `<li>${inlineToHtml(item.content)}${item.children.length ? listToHtml(item.children) : ''}</li>`,
    )
    .join('')}</ul>`;
}

/**
 * Serializes blocks. A string bound once per section, rather than a template
 * tree per bullet: the recursive-template version made the prerendered page
 * 1.6 MB, most of it hydration bookkeeping for ~40 000 comment anchors.
 */
export function blocksToHtml(blocks: readonly Block[]): string {
  return blocks
    .map((block) =>
      block.kind === 'paragraph'
        ? `<p>${inlineToHtml(block.content)}</p>`
        : listToHtml(block.items),
    )
    .join('');
}

/** Plain text of an inline run. */
export function plainText(inlines: readonly Inline[]): string {
  return inlines
    .map((inline) =>
      inline.kind === 'text' || inline.kind === 'code'
        ? inline.text
        : plainText(inline.children),
    )
    .join('');
}
