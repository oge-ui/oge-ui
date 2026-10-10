/**
 * The docs `ApiEntry.description` fields carry inline HTML (`<code>`, `&lt;`,
 * `&#64;`) because they are rendered through `[innerHTML]`. LLM-facing output is
 * markdown, so those need to travel back the other way.
 */

const ENTITIES = [
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&quot;/g, '"'],
  [/&#39;/g, "'"],
  [/&#64;/g, '@'],
  [/&nbsp;/g, ' '],
  // last: an entity's own text may contain `&`
  [/&amp;/g, '&'],
];

/** Decodes the handful of entities the docs pages use. */
export function decodeEntities(text) {
  let out = text;
  for (const [pattern, replacement] of ENTITIES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Drops every tag. Repeats until nothing changes, so input such as
 * `<scr<b>ipt>` cannot reassemble a tag out of the pieces one pass leaves.
 */
export function stripTags(text) {
  let out = text;
  let previous;
  do {
    previous = out;
    out = out.replace(/<[^>]+>/g, '');
  } while (out !== previous);
  return out;
}

/**
 * Sentinel wrapping a lifted-out code span. A private-use code point rather
 * than the NUL byte it used to be: NUL cannot appear in the docs sources
 * either, but it makes every regex holding it a `no-control-regex` lint
 * error, and a suppression comment would be a worse trade than one character.
 */
const MARK = '\uE000';

/**
 * Inline HTML → markdown. `<code>x</code>` becomes `` `x` ``, emphasis becomes
 * `**`/`_`, every other tag is dropped, entities are decoded and whitespace is
 * collapsed so the result is safe inside a one-line table cell.
 */
export function htmlToMarkdown(html) {
  // Code spans are lifted out first and restored last: a decoded
  // `<code>&lt;OgeButton&gt;</code>` would otherwise read as a tag to the
  // strip step below and vanish into an empty ``.
  const spans = [];
  let out = html
    .replace(/<code>([\s\S]*?)<\/code>/g, (_, inner) => {
      spans.push('`' + decodeEntities(inner).trim() + '`');
      return `${MARK}${spans.length - 1}${MARK}`;
    })
    .replace(/<\/?(?:strong|b)>/g, '**')
    .replace(/<\/?(?:em|i)>/g, '_')
    .replace(/<br\s*\/?>/g, ' ');
  out = stripTags(out);
  out = decodeEntities(out).replace(
    new RegExp(`${MARK}(\\d+)${MARK}`, 'g'),
    (_, index) => spans[Number(index)],
  );
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Escapes the characters that break a markdown table cell. Backslashes go
 * first, so a literal `\|` in the source cannot turn into an escaped pipe.
 */
export function cell(text) {
  return text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/** Wraps a type/signature in backticks, decoding entities first. */
export function code(text) {
  const decoded = decodeEntities(text).replace(/\s+/g, ' ').trim();
  if (!decoded) return '';
  // A backtick inside the value needs a longer fence.
  const fence = decoded.includes('`') ? '``' : '`';
  return `${fence}${decoded}${fence}`;
}

/**
 * Renders one `ApiSections` object as markdown.
 *
 * @param {string} title component or API name, e.g. `OgeGrid`
 * @param {string | undefined} selector element selector, e.g. `oge-grid`
 * @param {import('./api-data.mjs').ApiSections} sections
 * @returns {string}
 */
export function sectionsToMarkdown(title, selector, sections) {
  const lines = [];
  lines.push(selector ? `### ${title} — \`<${selector}>\`` : `### ${title}`);
  lines.push('');
  for (const { key, label } of SECTION_ORDER) {
    const groups = sections[key];
    if (!groups?.length) continue;
    lines.push(`#### ${label}`);
    lines.push('');
    for (const group of groups) {
      if (!group.entries?.length) continue;
      if (group.title) {
        lines.push(`_${group.title}_`);
        lines.push('');
      }
      const showDefault = group.entries.some(
        (entry) => entry.default !== undefined,
      );
      lines.push(
        showDefault
          ? '| Name | Type | Default | Description |'
          : '| Name | Type | Description |',
      );
      lines.push(
        showDefault ? '| --- | --- | --- | --- |' : '| --- | --- | --- |',
      );
      for (const entry of group.entries) {
        const row = [
          cell(code(entry.name)),
          cell(code(entry.type)),
          ...(showDefault ? [cell(code(entry.default ?? '—'))] : []),
          cell(htmlToMarkdown(entry.description)),
        ];
        lines.push(`| ${row.join(' | ')} |`);
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

const SECTION_ORDER = [
  { key: 'properties', label: 'Properties' },
  { key: 'methods', label: 'Methods' },
  { key: 'events', label: 'Events' },
  { key: 'types', label: 'Types' },
];
