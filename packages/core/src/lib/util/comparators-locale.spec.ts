import { ArrayDataSource } from '../data/array-data-source';
import { ogeCollator, ogeValueComparer } from './comparators';

describe('locale-aware sorting', () => {
  const words = ['ılık', 'İnce', 'Işık', 'irmik', 'ozan', 'Ördek', 'çay'];

  it('sorts Turkish I/ı/İ the Turkish way', () => {
    const compare = ogeValueComparer({ locale: 'tr' });
    const sorted = [...words].sort((a, b) => compare(a, b, 'w'));
    expect(sorted).toEqual([
      'çay',
      'ılık',
      'Işık',
      'İnce',
      'irmik',
      'ozan',
      'Ördek',
    ]);
  });

  it('caches one collator per locale and survives a bad tag', () => {
    expect(ogeCollator('tr')).toBe(ogeCollator('tr'));
    expect(() => ogeCollator('not a locale!')).not.toThrow();
  });

  it('runs a host comparer with blanks kept last', () => {
    const compare = ogeValueComparer({
      compare: (a, b) => String(b).localeCompare(String(a)), // reversed
    });
    const sorted = ['a', null, 'c', 'b'].sort((a, b) => compare(a, b, 'x'));
    expect(sorted).toEqual(['c', 'b', 'a', null]);
  });

  it('sorts an ArrayDataSource and its value lists in its locale', async () => {
    const rows = words.map((w, id) => ({ id, w }));
    const source = new ArrayDataSource(rows, { key: 'id', locale: 'tr' });
    const loaded = source.loadSync({ sort: [{ field: 'w', dir: 'asc' }] });
    expect(loaded.data.map((r) => (r as { w: string }).w).slice(1, 5)).toEqual([
      'ılık',
      'Işık',
      'İnce',
      'irmik',
    ]);
    const distinct = await source.distinct('w');
    expect(distinct.slice(1, 3)).toEqual(['ılık', 'Işık']);
  });
});
