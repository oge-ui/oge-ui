import {
  OGE_GRID_ROWS_MIME,
  ogeRowDragOutRows,
  ogeWriteRowDragData,
} from './grid-row-drag-out';

class FakeTransfer {
  readonly data = new Map<string, string>();
  effectAllowed = 'all';
  setData(type: string, value: string): void {
    this.data.set(type, value);
  }
}

interface Row {
  id: number;
  name: string;
}
const rows: Row[] = [
  { id: 1, name: 'Ada' },
  { id: 2, name: '=SUM(A1)' },
  { id: 3, name: 'Can\tÖz' },
];

describe('rows dragged out', () => {
  it('drags the selection when the grabbed row is in it', () => {
    const keyOf = (row: Row) => row.id;
    expect(ogeRowDragOutRows(rows[0], 1, new Set([1, 3]), rows, keyOf)).toEqual(
      [rows[0], rows[2]],
    );
    expect(ogeRowDragOutRows(rows[1], 2, new Set([1, 3]), rows, keyOf)).toEqual(
      [rows[1]],
    );
    expect(ogeRowDragOutRows(rows[0], 1, new Set([1]), rows, keyOf)).toEqual([
      rows[0],
    ]);
  });

  it('writes guarded TSV under captions and the rows as JSON', () => {
    const transfer = new FakeTransfer();
    ogeWriteRowDragData(transfer as unknown as DataTransfer, rows, [
      { caption: 'Id', text: (row) => String(row.id) },
      { caption: 'Name', text: (row) => row.name },
    ]);
    expect(transfer.effectAllowed).toBe('copy');
    expect(transfer.data.get('text/plain')).toBe(
      ['Id\tName', '1\tAda', "2\t'=SUM(A1)", '3\t"Can\tÖz"'].join('\r\n'),
    );
    expect(JSON.parse(transfer.data.get(OGE_GRID_ROWS_MIME) ?? 'null')).toEqual(
      rows,
    );
    expect(transfer.data.get('application/json')).toBe(
      transfer.data.get(OGE_GRID_ROWS_MIME),
    );
  });

  it('serializes the given rows, and skips JSON that cannot be', () => {
    const transfer = new FakeTransfer();
    ogeWriteRowDragData(
      transfer as unknown as DataTransfer,
      [{ node: 1 }],
      [{ caption: 'N', text: () => 'x' }],
      [{ id: 9 }],
    );
    expect(transfer.data.get('application/json')).toBe('[{"id":9}]');
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    const other = new FakeTransfer();
    ogeWriteRowDragData(other as unknown as DataTransfer, [cyclic], []);
    expect(other.data.has('application/json')).toBe(false);
    expect(other.data.get('text/plain')).toBe('\r\n');
  });
});
