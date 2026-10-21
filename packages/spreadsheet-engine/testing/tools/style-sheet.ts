/**
 * Builds a `<styleSheet>` body from cell-format descriptions, deduplicating
 * fonts, fills, borders and number formats the way Excel's own tables are
 * laid out. Corpus tooling only.
 */

/** One cell format: raw SpreadsheetML for each part it sets. */
export interface CorpusXf {
  /** A custom code, or a built-in id. */
  readonly numFmt?: string | number;
  /** Inner XML of `<font>`; default the Normal font. */
  readonly font?: string;
  /** Inner XML of `<fill>`. */
  readonly fill?: string;
  /** Attributes + inner XML of `<border …>…</border>` (without the tag name). */
  readonly border?: string;
  /** Attributes of `<alignment …/>`. */
  readonly alignment?: string;
  /** Attributes of `<protection …/>`. */
  readonly protection?: string;
  readonly quotePrefix?: boolean;
}

/** The Normal font of every corpus workbook: Calibri 11 — installed with Windows, unlike Aptos. */
export const NORMAL_FONT =
  '<sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/>';

const EMPTY_BORDER = '><left/><right/><top/><bottom/><diagonal/>';

/** The style sheet; xf `i` of `xfs` gets cell style index `i + 1` (0 is the default). */
export function corpusStyleSheet(
  xfs: readonly CorpusXf[],
  dxfs: readonly string[] = [],
): string {
  const fonts = [NORMAL_FONT];
  const fills = [
    '<patternFill patternType="none"/>',
    '<patternFill patternType="gray125"/>',
  ];
  const borders = [EMPTY_BORDER];
  const numFmts = new Map<string, number>();
  const index = (list: string[], item: string) => {
    const at = list.indexOf(item);
    if (at >= 0) return at;
    list.push(item);
    return list.length - 1;
  };
  const xfXml = xfs.map((xf) => {
    let numFmtId = 0;
    if (typeof xf.numFmt === 'number') numFmtId = xf.numFmt;
    else if (xf.numFmt !== undefined) {
      if (!numFmts.has(xf.numFmt)) numFmts.set(xf.numFmt, 164 + numFmts.size);
      numFmtId = numFmts.get(xf.numFmt) as number;
    }
    const fontId = xf.font ? index(fonts, xf.font) : 0;
    const fillId = xf.fill ? index(fills, xf.fill) : 0;
    const borderId = xf.border ? index(borders, xf.border) : 0;
    const apply = [
      numFmtId ? ' applyNumberFormat="1"' : '',
      fontId ? ' applyFont="1"' : '',
      fillId ? ' applyFill="1"' : '',
      borderId ? ' applyBorder="1"' : '',
      xf.alignment ? ' applyAlignment="1"' : '',
      xf.protection ? ' applyProtection="1"' : '',
      xf.quotePrefix ? ' quotePrefix="1"' : '',
    ].join('');
    const children =
      (xf.alignment ? `<alignment ${xf.alignment}/>` : '') +
      (xf.protection ? `<protection ${xf.protection}/>` : '');
    const attributes = `numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"${apply}`;
    return children
      ? `<xf ${attributes}>${children}</xf>`
      : `<xf ${attributes}/>`;
  });
  const escape = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return (
    (numFmts.size
      ? `<numFmts count="${numFmts.size}">${[...numFmts]
          .map(
            ([code, id]) =>
              `<numFmt numFmtId="${id}" formatCode="${escape(code)}"/>`,
          )
          .join('')}</numFmts>`
      : '') +
    `<fonts count="${fonts.length}">${fonts.map((f) => `<font>${f}</font>`).join('')}</fonts>` +
    `<fills count="${fills.length}">${fills.map((f) => `<fill>${f}</fill>`).join('')}</fills>` +
    `<borders count="${borders.length}">${borders.map((b) => `<border${b}</border>`).join('')}</borders>` +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    `<cellXfs count="${xfXml.length + 1}"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>${xfXml.join('')}</cellXfs>` +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    `<dxfs count="${dxfs.length}">${dxfs.map((d) => `<dxf>${d}</dxf>`).join('')}</dxfs>`
  );
}

/** A solid fill. */
export const solid = (rgb: string) =>
  `<patternFill patternType="solid"><fgColor rgb="FF${rgb}"/><bgColor indexed="64"/></patternFill>`;

/** One border style on all four edges. */
export const box = (style: string, rgb = '000000') => {
  const edge = (name: string) =>
    `<${name} style="${style}"><color rgb="FF${rgb}"/></${name}>`;
  return `>${edge('left')}${edge('right')}${edge('top')}${edge('bottom')}<diagonal/>`;
};
