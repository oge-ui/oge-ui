/** Code samples rendered on the filter contract guide. */

export const SERVER_VECTORS = `// a server test suite, run against your own FilterExpr → SQL translation
import vectors from '@oge-ui/core/filter-vectors.json' with { type: 'json' };

for (const c of vectors.cases) {
  test(c.name, async () => {
    await seed(vectors.rows); // revive vectors.dateFields as timestamps
    const ids = await query(translate(c.filter)); // your translation
    expect(ids.sort()).toEqual([...c.expect].sort());
  });
}`;

export const DISTINCT_ENDPOINT = `import { CustomDataSource, type DistinctOptions } from '@oge-ui/core';

const orders = new CustomDataSource<Order>({
  key: 'id',
  load: (options) => api.post('/orders/query', options),
  // the header filter's value list: other columns' filters + search text,
  // never the column's own filter; \`search\` is the popup's typed text
  distinct: (field, options: DistinctOptions = {}) =>
    api.post(\`/orders/distinct/\${field}\`, {
      filter: options.filter,
      searchText: options.searchText,
      search: options.search,
      take: options.take,
    }, { signal: options.signal }),
});`;
