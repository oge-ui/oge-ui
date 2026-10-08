import {
  ogeDateTimeFormat,
  ogeNumberFormat,
  ogePluralRules,
  type OgeLocaleInput,
} from './intl-cache';

/** A value a message argument can take. */
export type OgeMessageValue =
  string | number | bigint | boolean | Date | null | undefined;

/** Arguments of {@link ogeFormatMessage}, by placeholder name. */
export type OgeMessageValues = Readonly<Record<string, OgeMessageValue>>;

type Part =
  | string
  | {
      kind: 'arg';
      name: string;
      style: string | undefined;
      type: string | undefined;
    }
  | { kind: 'pound' }
  | {
      kind: 'plural';
      name: string;
      ordinal: boolean;
      offset: number;
      options: ReadonlyMap<string, readonly Part[]>;
    }
  | {
      kind: 'select';
      name: string;
      options: ReadonlyMap<string, readonly Part[]>;
    };

class MessageSyntaxError extends Error {}

/**
 * A small ICU MessageFormat parser — the subset the catalogs use:
 * `{name}`, `{name, number|date|time[, style]}`,
 * `{name, plural|selectordinal, [offset:n] =0 {…} one {…} other {…}}` with
 * `#`, and `{name, select, a {…} other {…}}`; apostrophe quoting as in ICU
 * (`'{'` is a literal brace, `''` an apostrophe, any other `'` is plain text).
 */
class Parser {
  private index = 0;

  constructor(private readonly text: string) {}

  parse(): Part[] {
    const parts = this.message(0, false);
    if (this.index < this.text.length)
      throw new MessageSyntaxError('unexpected }');
    return parts;
  }

  private message(depth: number, inPlural: boolean): Part[] {
    const parts: Part[] = [];
    let literal = '';
    const text = this.text;
    while (this.index < text.length) {
      const char = text[this.index];
      if (char === "'") {
        const next = text[this.index + 1];
        if (next === "'") {
          literal += "'";
          this.index += 2;
          continue;
        }
        if (next === '{' || next === '}' || (inPlural && next === '#')) {
          const end = this.quotedEnd(this.index + 1);
          literal += text.slice(this.index + 1, end).replace(/''/g, "'");
          this.index = end + 1;
          continue;
        }
        literal += char;
        this.index++;
        continue;
      }
      if (char === '{') {
        if (literal) parts.push(literal);
        literal = '';
        parts.push(this.argument(depth));
        continue;
      }
      if (char === '}') {
        if (depth === 0) throw new MessageSyntaxError('unbalanced }');
        break;
      }
      if (char === '#' && inPlural) {
        if (literal) parts.push(literal);
        literal = '';
        parts.push({ kind: 'pound' });
        this.index++;
        continue;
      }
      literal += char;
      this.index++;
    }
    if (literal) parts.push(literal);
    return parts;
  }

  /** Index of the apostrophe closing a quote opened before `from`. */
  private quotedEnd(from: number): number {
    let index = from;
    while (index < this.text.length) {
      if (this.text[index] === "'") {
        if (this.text[index + 1] === "'") {
          index += 2;
          continue;
        }
        return index;
      }
      index++;
    }
    return this.text.length; // an unterminated quote runs to the end
  }

  private argument(depth: number): Part {
    this.index++; // {
    const name = this.word();
    if (!name) throw new MessageSyntaxError('missing argument name');
    this.space();
    if (this.text[this.index] === '}') {
      this.index++;
      return { kind: 'arg', name, type: undefined, style: undefined };
    }
    this.expect(',');
    const type = this.word();
    this.space();
    if (type === 'plural' || type === 'selectordinal' || type === 'select') {
      this.expect(',');
      return this.choice(name, type, depth);
    }
    let style: string | undefined;
    if (this.text[this.index] === ',') {
      this.index++;
      this.space();
      style = this.word();
      this.space();
    }
    this.expect('}');
    return { kind: 'arg', name, type, style };
  }

  private choice(name: string, type: string, depth: number): Part {
    const options = new Map<string, readonly Part[]>();
    let offset = 0;
    const plural = type !== 'select';
    for (;;) {
      this.space();
      if (this.text[this.index] === '}') {
        this.index++;
        break;
      }
      let selector = this.word();
      if (plural && selector === 'offset' && this.text[this.index] === ':') {
        this.index++;
        this.space();
        offset = Number(this.word());
        continue;
      }
      if (!selector) {
        if (this.text[this.index] === '=') {
          this.index++;
          selector = `=${this.word()}`;
        } else throw new MessageSyntaxError('missing selector');
      }
      this.space();
      this.expect('{');
      const body = this.message(depth + 1, plural || depth > 0);
      this.expect('}');
      options.set(selector, body);
    }
    if (!options.has('other')) throw new MessageSyntaxError('missing other');
    return plural
      ? {
          kind: 'plural',
          name,
          ordinal: type === 'selectordinal',
          offset,
          options,
        }
      : { kind: 'select', name, options };
  }

  private word(): string {
    this.space();
    const match = /^[^\s{},:=#']+/.exec(this.text.slice(this.index));
    if (!match) return '';
    this.index += match[0].length;
    return match[0];
  }

  private space(): void {
    while (/\s/.test(this.text[this.index] ?? '')) this.index++;
  }

  private expect(char: string): void {
    this.space();
    if (this.text[this.index] !== char)
      throw new MessageSyntaxError(`expected ${char}`);
    this.index++;
  }
}

/** Parsed templates; catalogs are small and fixed, so this stays bounded. */
const templates = new Map<string, readonly Part[] | null>();
const MAX_TEMPLATES = 512;

function parseTemplate(template: string): readonly Part[] | null {
  let parts = templates.get(template);
  if (parts !== undefined) return parts;
  try {
    parts = new Parser(template).parse();
  } catch {
    parts = null; // malformed: rendered with plain `{name}` substitution
  }
  if (templates.size >= MAX_TEMPLATES) templates.clear();
  templates.set(template, parts);
  return parts;
}

function formatValue(
  value: OgeMessageValue,
  locale: OgeLocaleInput,
  type?: string,
  style?: string,
): string {
  if (value == null) return '';
  if (value instanceof Date || type === 'date' || type === 'time') {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    const length = (style ?? 'medium') as 'short' | 'medium' | 'long' | 'full';
    return ogeDateTimeFormat(
      locale,
      type === 'time' ? { timeStyle: length } : { dateStyle: length },
    ).format(date);
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    if (type === 'number' && style === 'percent')
      return ogeNumberFormat(locale, { style: 'percent' }).format(value);
    if (type === 'number' && style === 'integer')
      return ogeNumberFormat(locale, { maximumFractionDigits: 0 }).format(
        value,
      );
    return ogeNumberFormat(locale).format(value);
  }
  return String(value);
}

function render(
  parts: readonly Part[],
  values: OgeMessageValues,
  locale: OgeLocaleInput,
  pound: string | undefined,
): string {
  let out = '';
  for (const part of parts) {
    if (typeof part === 'string') {
      out += part;
      continue;
    }
    switch (part.kind) {
      case 'pound':
        out += pound ?? '#';
        break;
      case 'arg':
        out +=
          part.name in values
            ? formatValue(values[part.name], locale, part.type, part.style)
            : `{${part.name}}`; // unknown placeholders stay visible
        break;
      case 'select': {
        const key = String(values[part.name] ?? 'other');
        const branch = part.options.get(key) ?? part.options.get('other') ?? [];
        out += render(branch, values, locale, pound);
        break;
      }
      case 'plural': {
        const raw = values[part.name];
        const count = typeof raw === 'number' ? raw : Number(raw);
        let branch = Number.isNaN(count)
          ? undefined
          : part.options.get(`=${count}`);
        const shifted = count - part.offset;
        if (!branch && !Number.isNaN(count)) {
          const category = ogePluralRules(locale, {
            type: part.ordinal ? 'ordinal' : 'cardinal',
          }).select(shifted);
          branch = part.options.get(category);
        }
        branch ??= part.options.get('other') ?? [];
        const text = Number.isNaN(shifted)
          ? String(raw ?? '')
          : ogeNumberFormat(locale).format(shifted);
        out += render(branch, values, locale, text);
        break;
      }
    }
  }
  return out;
}

/**
 * Formats a catalog message: ICU-lite, backed by `Intl.PluralRules`.
 *
 * - `{name}` interpolates a value — numbers and dates in `locale`'s format,
 *   unknown placeholders stay as written (like the old `{name}` patterns, so
 *   every existing catalog string keeps rendering);
 * - `{count, plural, =0 {No rows} one {# row} few {# rows} other {# rows}}`
 *   picks an exact `=n` branch first, then the locale's plural category
 *   (`zero one two few many other`), `other` as the fallback; `#` is the
 *   count in the locale's digits; `offset:n` is honoured;
 * - `{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}`;
 * - `{gender, select, female {…} male {…} other {…}}`;
 * - quoting as in ICU: `'{'` is a literal brace, `''` an apostrophe.
 *
 * A malformed template never throws: it falls back to plain `{name}`
 * substitution. Parsed templates and formatters are cached.
 *
 * ```ts
 * ogeFormatMessage('{count, plural, one {# row} other {# rows}}', { count: 1 }); // '1 row'
 * ogeFormatMessage('{n, plural, one {# plik} few {# pliki} many {# plików} other {# pliku}}',
 *   { n: 5 }, 'pl'); // '5 plików'
 * ```
 */
export function ogeFormatMessage(
  template: string,
  values: OgeMessageValues = {},
  locale?: OgeLocaleInput,
): string {
  // the common case: a template without any braces at all
  if (!template.includes('{') && !template.includes("'")) return template;
  const parts = parseTemplate(template);
  if (!parts) {
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in values ? formatValue(values[name], locale) : match,
    );
  }
  return render(parts, values, locale, undefined);
}

/** Whether a template uses ICU `plural` / `selectordinal` / `select` syntax. */
export function isOgeIcuMessage(template: string): boolean {
  const parts = parseTemplate(template);
  return (
    !!parts &&
    parts.some(
      (part) =>
        typeof part !== 'string' &&
        (part.kind === 'plural' || part.kind === 'select'),
    )
  );
}

declare const ngDevMode: boolean | undefined;
const warnedKeys = new Set<string>();

/**
 * Dev-mode console warning for a deprecated message key a consumer still
 * supplies — once per key per page. Silent in production Angular builds.
 * `advice` is the key's own migration hint (a singular branch moves into an
 * ICU plural, a suffix into a `{count}` template…); without it the warning
 * only names the replacement key, which is correct for every key.
 */
export function warnOgeDeprecatedMessage(
  key: string,
  replacement: string,
  advice?: string,
): void {
  if (typeof ngDevMode !== 'undefined' && !ngDevMode) return;
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(
    `[oge] the "${key}" message is deprecated and will be removed in the next minor; ` +
      `supply "${replacement}" instead` +
      (advice ? ` — ${advice}` : '.'),
  );
}
