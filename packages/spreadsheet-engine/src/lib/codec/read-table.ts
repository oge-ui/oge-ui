/**
 * A table part (`xl/tables/tableN.xml`): the table's range, its header and
 * totals rows, columns, style and filter buttons. The part itself stays an
 * opaque part — the writer puts it back as it was.
 */
import type { OgeTable, OgeTableColumn } from '../model/table';
import { ogeReadAutoFilter, ogeReadSqref } from './read-worksheet';
import {
  ogeXmlBool,
  ogeXmlChild,
  ogeXmlChildren,
  ogeXmlIndex,
  parseOgeXmlTree,
} from './xml-tree';

/**
 * Reads a table part; `undefined` when its range is unreadable. Throws
 * `OgeXmlError` for a part that is not well-formed.
 */
export function readOgeTable(xml: string, part: string): OgeTable | undefined {
  const root = parseOgeXmlTree(xml);
  const a = root.attributes;
  const range = ogeReadSqref(a['ref'])[0];
  if (!range) return undefined;
  const columns: OgeTableColumn[] = ogeXmlChildren(
    ogeXmlChild(root, 'tableColumns'),
    'tableColumn',
  ).map((column, index) => {
    const c = column.attributes;
    return {
      id: ogeXmlIndex(c['id']) ?? index + 1,
      name: c['name'] ?? '',
      ...(c['totalsRowFunction'] && c['totalsRowFunction'] !== 'none'
        ? { totalsRowFunction: c['totalsRowFunction'] }
        : {}),
      ...(c['totalsRowLabel'] !== undefined
        ? { totalsRowLabel: c['totalsRowLabel'] }
        : {}),
    };
  });
  const info = ogeXmlChild(root, 'tableStyleInfo');
  const filter = ogeXmlChild(root, 'autoFilter');
  const autoFilter = filter ? ogeReadAutoFilter(filter, xml) : undefined;
  const name = a['name'] ?? a['displayName'] ?? '';
  return {
    id: ogeXmlIndex(a['id']) ?? 0,
    name,
    displayName: a['displayName'] ?? name,
    range,
    headerRowCount: Math.min(1, ogeXmlIndex(a['headerRowCount']) ?? 1),
    totalsRowCount: Math.min(1, ogeXmlIndex(a['totalsRowCount']) ?? 0),
    columns,
    ...(info
      ? {
          style: {
            ...(info.attributes['name']
              ? { name: info.attributes['name'] }
              : {}),
            showFirstColumn: ogeXmlBool(
              info.attributes['showFirstColumn'],
              false,
            ),
            showLastColumn: ogeXmlBool(
              info.attributes['showLastColumn'],
              false,
            ),
            showRowStripes: ogeXmlBool(
              info.attributes['showRowStripes'],
              false,
            ),
            showColumnStripes: ogeXmlBool(
              info.attributes['showColumnStripes'],
              false,
            ),
          },
        }
      : {}),
    ...(autoFilter ? { autoFilter } : {}),
    part,
  };
}
