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
 * Inline HTML → markdown. `<code>x</code>` becomes `` `x` ``, emphasis becomes
 * `**`/`_`, every other tag is dropped, entities are decoded and whitespace is
 * collapsed so the result is safe inside a one-line table cell.
 */
export function htmlToMarkdown(html) {
  let out = html
    .replace(
      /<code>([\s\S]*?)<\/code>/g,
      (_, inner) => '`' + decodeEntities(inner).trim() + '`',
    )
    .replace(/<\/?(?:strong|b)>/g, '**')
    .replace(/<\/?(?:em|i)>/g, '_')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<[^>]+>/g, '');
  out = decodeEntities(out);
  return out.replace(/\s+/g, ' ').trim();
}

/** Escapes the two characters that break a markdown table cell. */
export function cell(text) {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
