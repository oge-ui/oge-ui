/**
 * Builds small xlsx files from raw SpreadsheetML snippets — for the codec's
 * specs and for the golden-corpus tooling (`testing/`), which hands the
 * result to Excel. Test-only: not exported from the package entry.
 *
 * Everything is spelled out as XML on purpose. A codec spec states the exact
 * markup it reads, so a builder with an object API would hide what is under
 * test; this one only supplies the boilerplate every package needs (content
 * types, relationships, a minimal style sheet).
 */
import { writeOgeZipSync } from '../lib/zip/zip';

export const SPREADSHEET_NS =
  'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
export const RELATIONSHIP_NS =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export const PACKAGE_RELATIONSHIP_NS =
  'http://schemas.openxmlformats.org/package/2006/relationships';

/** A relationship of a fixture part. */
export interface XlsxFixtureRel {
  readonly id: string;
  /** The type's last segment (`hyperlink`, `comments`) or a full type URI. */
  readonly type: string;
  readonly target: string;
  readonly external?: boolean;
}

/** One worksheet. */
export interface XlsxFixtureSheet {
  readonly name: string;
  /** Inner XML of `<worksheet>` (`<sheetData>…</sheetData><mergeCells…>`), or a whole document. */
  readonly xml: string;
  readonly state?: 'hidden' | 'veryHidden';
  /** Relationships of the sheet part (hyperlinks, comments, drawings). */
  readonly rels?: readonly XlsxFixtureRel[];
}

/** Any other part, with its content type. */
export interface XlsxFixturePart {
  readonly path: string;
  readonly data: string | Uint8Array;
  /** Content type override; omitted for parts covered by an extension default. */
  readonly contentType?: string;
}

/** A whole workbook. */
export interface XlsxFixture {
  readonly sheets: readonly XlsxFixtureSheet[];
  /** Inner XML of `<styleSheet>`; default: one Calibri 11 font, the two required fills. */
  readonly styles?: string;
  /** Shared strings: plain texts, or the raw inner XML of `<sst>`. */
  readonly sharedStrings?: readonly string[] | string;
  /** Attributes of `<workbookPr>` (`date1904="1"`). */
  readonly workbookPr?: string;
  /** Attributes of `<workbookView>` (`activeTab="1"`). */
  readonly workbookView?: string;
  /** XML after `<sheets>` (`<definedNames>…</definedNames>`). */
  readonly workbookTail?: string;
  /** Theme part XML; `true` for the Office 2013–2022 theme. Default none. */
  readonly theme?: string | boolean;
  readonly extraParts?: readonly XlsxFixturePart[];
  /** Extra relationships of the workbook part (`sheetMetadata` → `metadata.xml`). */
  readonly workbookRels?: readonly {
    readonly type: string;
    readonly target: string;
  }[];
  /** Extra extension defaults (`vml` → its content type). */
  readonly defaults?: Readonly<Record<string, string>>;
}

/** The style sheet a fixture gets when it states none. */
export const FIXTURE_DEFAULT_STYLES =
  '<fonts count="1"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>';

/** The Office 2013–2022 theme, reduced to what a reader looks at. */
export const FIXTURE_OFFICE_THEME =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:themeElements>' +
  '<a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>' +
  '<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1>' +
  '<a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>' +
  '<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink>' +
  '<a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>' +
  '<a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light" panose="020F0302020204030204"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
  '<a:minorFont><a:latin typeface="Calibri" panose="020F0502020204030204"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>' +
  '<a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>' +
  '<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>' +
  '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
  '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>' +
  '</a:fmtScheme></a:themeElements></a:theme>';

const XML_DECLARATION =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const MAIN = 'application/vnd.openxmlformats-officedocument.spreadsheetml';

function escapeText(text: string): string {
  return text.replace(/[&<>]/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : '&gt;',
  );
}

function escapeAttribute(text: string): string {
  return escapeText(text).replace(/"/g, '&quot;');
}

function relsXml(rels: readonly XlsxFixtureRel[]): string {
  const items = rels
    .map((rel) => {
      const type = rel.type.includes('/')
        ? rel.type
        : `${RELATIONSHIP_NS}/${rel.type}`;
      const mode = rel.external ? ' TargetMode="External"' : '';
      return `<Relationship Id="${rel.id}" Type="${type}" Target="${escapeAttribute(rel.target)}"${mode}/>`;
    })
    .join('');
  return `${XML_DECLARATION}<Relationships xmlns="${PACKAGE_RELATIONSHIP_NS}">${items}</Relationships>`;
}

/** A shared-string table from plain texts (`xml:space` kept on every item). */
export function fixtureSharedStrings(texts: readonly string[]): string {
  return texts
    .map((text) => `<si><t xml:space="preserve">${escapeText(text)}</t></si>`)
    .join('');
}

/** Builds the package. Parts are stored, not deflated — specs read them back. */
export function buildXlsxFixture(fixture: XlsxFixture): Uint8Array {
  const encoder = new TextEncoder();
  const files: { name: string; data: Uint8Array }[] = [];
  const add = (name: string, data: string | Uint8Array) =>
    files.push({
      name,
      data: typeof data === 'string' ? encoder.encode(data) : data,
    });
  const overrides: [string, string][] = [
    ['/xl/workbook.xml', `${MAIN}.sheet.main+xml`],
    ['/xl/styles.xml', `${MAIN}.styles+xml`],
  ];
  const workbookRels: XlsxFixtureRel[] = [];
  const sheetEntries = fixture.sheets
    .map((sheet, index) => {
      const n = index + 1;
      const path = `xl/worksheets/sheet${n}.xml`;
      overrides.push([`/${path}`, `${MAIN}.worksheet+xml`]);
      workbookRels.push({
        id: `rId${n}`,
        type: 'worksheet',
        target: `worksheets/sheet${n}.xml`,
      });
      const xml = sheet.xml.startsWith('<?xml')
        ? sheet.xml
        : `${XML_DECLARATION}<worksheet xmlns="${SPREADSHEET_NS}" xmlns:r="${RELATIONSHIP_NS}">${sheet.xml}</worksheet>`;
      add(path, xml);
      if (sheet.rels?.length)
        add(`xl/worksheets/_rels/sheet${n}.xml.rels`, relsXml(sheet.rels));
      const state = sheet.state ? ` state="${sheet.state}"` : '';
      return `<sheet name="${escapeAttribute(sheet.name)}" sheetId="${n}"${state} r:id="rId${n}"/>`;
    })
    .join('');
  let next = fixture.sheets.length + 1;
  workbookRels.push({
    id: `rId${next++}`,
    type: 'styles',
    target: 'styles.xml',
  });
  add(
    'xl/styles.xml',
    `${XML_DECLARATION}<styleSheet xmlns="${SPREADSHEET_NS}">${fixture.styles ?? FIXTURE_DEFAULT_STYLES}</styleSheet>`,
  );
  if (fixture.sharedStrings !== undefined) {
    const inner =
      typeof fixture.sharedStrings === 'string'
        ? fixture.sharedStrings
        : fixtureSharedStrings(fixture.sharedStrings);
    add(
      'xl/sharedStrings.xml',
      `${XML_DECLARATION}<sst xmlns="${SPREADSHEET_NS}">${inner}</sst>`,
    );
    overrides.push(['/xl/sharedStrings.xml', `${MAIN}.sharedStrings+xml`]);
    workbookRels.push({
      id: `rId${next++}`,
      type: 'sharedStrings',
      target: 'sharedStrings.xml',
    });
  }
  if (fixture.theme) {
    add(
      'xl/theme/theme1.xml',
      fixture.theme === true ? FIXTURE_OFFICE_THEME : fixture.theme,
    );
    overrides.push([
      '/xl/theme/theme1.xml',
      'application/vnd.openxmlformats-officedocument.theme+xml',
    ]);
    workbookRels.push({
      id: `rId${next++}`,
      type: 'theme',
      target: 'theme/theme1.xml',
    });
  }
  for (const rel of fixture.workbookRels ?? []) {
    workbookRels.push({
      id: `rId${next++}`,
      type: rel.type,
      target: rel.target,
    });
  }
  for (const part of fixture.extraParts ?? []) {
    add(part.path, part.data);
    if (part.contentType) overrides.push([`/${part.path}`, part.contentType]);
  }
  const workbookPr = fixture.workbookPr
    ? `<workbookPr ${fixture.workbookPr}/>`
    : '';
  const view = `<bookViews><workbookView ${fixture.workbookView ?? ''}/></bookViews>`;
  add(
    'xl/workbook.xml',
    `${XML_DECLARATION}<workbook xmlns="${SPREADSHEET_NS}" xmlns:r="${RELATIONSHIP_NS}">${workbookPr}${view}<sheets>${sheetEntries}</sheets>${fixture.workbookTail ?? ''}</workbook>`,
  );
  add('xl/_rels/workbook.xml.rels', relsXml(workbookRels));
  add(
    '_rels/.rels',
    relsXml([
      { id: 'rId1', type: 'officeDocument', target: 'xl/workbook.xml' },
    ]),
  );
  const defaults: Record<string, string> = {
    rels: 'application/vnd.openxmlformats-package.relationships+xml',
    xml: 'application/xml',
    ...fixture.defaults,
  };
  const contentTypes =
    `${XML_DECLARATION}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    Object.entries(defaults)
      .map(
        ([ext, type]) => `<Default Extension="${ext}" ContentType="${type}"/>`,
      )
      .join('') +
    overrides
      .map(
        ([name, type]) =>
          `<Override PartName="${name}" ContentType="${type}"/>`,
      )
      .join('') +
    '</Types>';
  // [Content_Types].xml first, as Office writes it
  return writeOgeZipSync([
    { name: '[Content_Types].xml', data: encoder.encode(contentTypes) },
    ...files,
  ]);
}

/** A fixture cell value: number, boolean, inline text, shared index or error. */
export type XlsxFixtureValue =
  number | boolean | string | { shared: number } | { error: string };

/** `<c>` markup for a value (`t` chosen from its kind). */
export function fixtureCell(
  ref: string,
  value: XlsxFixtureValue,
  style?: number,
): string {
  const s = style ? ` s="${style}"` : '';
  if (typeof value === 'number') return `<c r="${ref}"${s}><v>${value}</v></c>`;
  if (typeof value === 'boolean')
    return `<c r="${ref}"${s} t="b"><v>${value ? 1 : 0}</v></c>`;
  if (typeof value === 'string')
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeText(value)}</t></is></c>`;
  if ('shared' in value)
    return `<c r="${ref}"${s} t="s"><v>${value.shared}</v></c>`;
  return `<c r="${ref}"${s} t="e"><v>${escapeText(value.error)}</v></c>`;
}
