import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  helpers: {
    '@angular/common/http': ['HttpClient'],
    '@oge-ui/core': ['CustomDataSource'],
    rxjs: ['firstValueFrom'],
  },
  types: { '@oge-ui/core': ['LoadResult'] },
  before: `interface Employee {
  id: number;
  firstName: string;
  department: string;
}`,
  template: `<oge-grid [data]="source" keyField="id" [filterRow]="true" [searchPanel]="true">
  <oge-column field="firstName" />
  <oge-column field="department" />
</oge-grid>`,
  body: `private readonly http = inject(HttpClient);

protected readonly source = new CustomDataSource<Employee>({
  key: 'id',
  load: (options) =>
    // options = { skip, take, sort, filter, searchText, … } — serialize as-is
    firstValueFrom(
      this.http.post<LoadResult<Employee>>('/api/employees/query', options),
    ),
});`,
});

export const CURSOR_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  helpers: {
    '@angular/common/http': ['HttpClient'],
    '@oge-ui/core': ['CursorDataSource'],
    rxjs: ['firstValueFrom'],
  },
  types: { '@oge-ui/core': ['CursorPage'] },
  before: `interface Account {
  id: string;
  email: string;
  createdAt: string;
}`,
  template: `<oge-grid
  [data]="source"
  keyField="id"
  [scrolling]="{ mode: 'infinite' }"
  style="height: 420px"
>
  <oge-column field="email" />
  <oge-column field="createdAt" dataType="date" />
</oge-grid>`,
  body: `private readonly http = inject(HttpClient);

// The endpoint pages with a cursor (\`?after=…&limit=50\` → { items, nextCursor }),
// not with an offset. The source walks the chain as the grid scrolls, fetches
// every page once per query and restarts from the first page when the sort,
// filter or search changes.
protected readonly source = new CursorDataSource<Account, string>({
  key: 'id',
  pageSize: 50,
  fetchPage: ({ cursor, pageSize, sort, filter, searchText }) =>
    firstValueFrom(
      this.http.post<CursorPage<Account, string>>('/api/accounts/page', {
        after: cursor,
        limit: pageSize,
        sort,
        filter,
        searchText,
      }),
    ),
});`,
});
