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
