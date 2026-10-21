/**
 * Find, as Excel's Find dialog searches: the text cells show (or their
 * formulas), `*` and `?` wildcards with `~` escaping them, optionally
 * matching case or the entire cell, by rows, on one sheet or all.
 */
import { formatOgeCellAddress } from '../address/address';
import { ogeDisplayFormula } from '../codec/formula-text';
import type { OgeFormatLocale } from '../format/format-locale';
import type { OgeWorkbook } from '../model/workbook';
import type { OgeStyleResolver } from '../paint/resolve-style';
import { ogeCellText } from './clipboard';

/** How to search. */
export interface OgeFindOptions {
  readonly matchCase?: boolean;
  /** The whole cell must match. */
  readonly entireCell?: boolean;
  /** Search formulas instead of what cells show. */
  readonly formulas?: boolean;
  /** Search every visible sheet, not just one. */
  readonly workbook?: boolean;
}

/** A match: sheet index and cell. */
export interface OgeFindMatch {
  readonly sheet: number;
  readonly row: number;
  readonly col: number;
}

/** A query as a regular expression (Excel wildcards; everything else literal). */
export function ogeFindPattern(
  query: string,
  options: OgeFindOptions = {},
): RegExp {
  let source = '';
  for (let i = 0; i < query.length; i++) {
    const ch = query[i];
    if (ch === '~' && i + 1 < query.length && '*?~'.includes(query[i + 1])) {
      source += `\\${query[++i]}`;
    } else if (ch === '*') source += '[\\s\\S]*';
    else if (ch === '?') source += '[\\s\\S]';
    else source += ch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  }
  return new RegExp(
    options.entireCell ? `^${source}$` : source,
    options.matchCase ? 'u' : 'iu',
  );
}

/** Every match, sheet by sheet (from `fromSheet` on) and row by row. */
export function ogeFindAll(
  workbook: OgeWorkbook,
  resolver: OgeStyleResolver,
  query: string,
  fromSheet: number,
  locale: OgeFormatLocale,
  options: OgeFindOptions = {},
): OgeFindMatch[] {
  if (query === '') return [];
  const pattern = ogeFindPattern(query, options);
  const order = options.workbook
    ? workbook.sheets.map((_, i) => (fromSheet + i) % workbook.sheets.length)
    : [fromSheet];
  const matches: OgeFindMatch[] = [];
  for (const index of order) {
    const sheet = workbook.sheets[index];
    if (!sheet || sheet.state !== 'visible') continue;
    sheet.forEachCell((cell, row, col) => {
      if (cell.value === undefined && cell.formula === undefined) return;
      const text =
        options.formulas && cell.formula !== undefined
          ? `=${ogeDisplayFormula(cell.formula)}`
          : ogeCellText(workbook, sheet, resolver, row, col, locale);
      if (pattern.test(text)) matches.push({ sheet: index, row, col });
    });
  }
  return matches;
}

/** `Sheet!A1` text of a match, for announcements. */
export function ogeFindMatchLabel(
  workbook: OgeWorkbook,
  match: OgeFindMatch,
): string {
  return `${workbook.sheets[match.sheet]?.name ?? ''}!${formatOgeCellAddress(match)}`;
}
