/**
 * The token reference's data model. The rows come from
 * `generated/design-tokens.json`, written by `docs-tools:llms`
 * (`tools/docs-tools/lib/tokens.mjs`) from `_tokens.scss` and `themes/*.css`
 * — never edit the JSON, change the tokens and regenerate.
 */

/** A theme column: the default set, the scoped themes and the bridges. */
export type TokenThemeId = 'light' | 'dark' | 'hc' | 'tailwind' | 'bootstrap';

export type TokenCategory =
  | 'color'
  | 'spacing'
  | 'radius'
  | 'typography'
  | 'elevation'
  | 'z-index'
  | 'motion'
  | 'component';

/** One row of `design-tokens.json`. */
export interface TokenRow {
  /** `--oge-…` */
  readonly n: string;
  readonly c: TokenCategory;
  /** `'d'` — derived: an expression over other tokens. */
  readonly k?: 'd';
  /** The comment above the declaration in the source. */
  readonly d?: string;
  /** Raw values; a theme's value only when it differs from the default. */
  readonly v: Readonly<Partial<Record<TokenThemeId, string>>>;
  /** Resolved swatch colours (colour tokens only). */
  readonly s?: Readonly<Partial<Record<TokenThemeId, string>>>;
  /** npm packages whose stylesheets or scripts read the token. */
  readonly u: readonly string[];
}

export interface TokenFile {
  readonly version: 1;
  readonly source: string;
  readonly themes: readonly {
    readonly id: TokenThemeId;
    readonly label: string;
  }[];
  readonly categories: readonly {
    readonly id: TokenCategory;
    readonly label: string;
  }[];
  readonly tokens: readonly TokenRow[];
}

export type CategoryFilter = 'all' | TokenCategory;

/** The id a row renders with (and the search index anchors at). */
export function tokenAnchor(name: string): string {
  return name.replace(/^--/, '');
}

/** `@oge-ui/grid` → `grid`. */
export function shortPackage(name: string): string {
  return name.replace(/^@oge-ui\//, '');
}

/**
 * Rows matching a free-text query (every word must occur in the name, a
 * value, the note or a package) and a category.
 */
export function filterTokens(
  rows: readonly TokenRow[],
  query: string,
  category: CategoryFilter,
): TokenRow[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (category !== 'all' && row.c !== category) return false;
    if (!terms.length) return true;
    const haystack = [row.n, ...Object.values(row.v), row.d ?? '', ...row.u]
      .join(' ')
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export interface TokenGroup {
  readonly id: TokenCategory;
  readonly label: string;
  readonly rows: readonly TokenRow[];
}

/** Rows grouped by category, in the file's category order; empty groups dropped. */
export function groupTokens(
  rows: readonly TokenRow[],
  categories: TokenFile['categories'],
): TokenGroup[] {
  return categories
    .map((category) => ({
      id: category.id,
      label: category.label,
      rows: rows.filter((row) => row.c === category.id),
    }))
    .filter((group) => group.rows.length > 0);
}
