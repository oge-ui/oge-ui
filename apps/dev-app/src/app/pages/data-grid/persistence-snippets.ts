import { demoSource } from '../../shared/demo-source';

export const STATE_KEY_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  dataset: 'employees',
  template: `<!-- everything the user changes — sort, filters, grouping, column
     widths/order/pins/visibility — is saved under this key and restored
     on the next visit. Default backend: localStorage. -->
<oge-grid [data]="employees" keyField="id" stateKey="orders-grid"
          [groupPanel]="true" [filterRow]="true" [columnChooser]="true">
  <oge-column field="firstName" />
  <oge-column field="department" />
  <oge-column field="salary" dataType="number" />
</oge-grid>`,
});

export const CUSTOM_STORAGE_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  helpers: {
    '@angular/common/http': ['HttpClient'],
    '@oge-ui/grid': ['OGE_STATE_STORAGE'],
    rxjs: ['firstValueFrom'],
  },
  types: {
    '@angular/core': ['ApplicationConfig'],
    '@oge-ui/grid': ['OgeStateStorage'],
  },
  dataset: 'employees',
  template: `<oge-grid [data]="employees" keyField="id" stateKey="orders-grid">
  <oge-column field="firstName" />
</oge-grid>`,
  after: `// Persist wherever you want — the backend may be fully async.
export function provideRemoteGridState(http: HttpClient): ApplicationConfig {
  return {
    providers: [
      {
        provide: OGE_STATE_STORAGE,
        useValue: {
          get: (key: string) =>
            firstValueFrom(
              http.get(\`/api/grid-state/\${key}\`, { responseType: 'text' }),
            ),
          set: (key: string, value: string) =>
            firstValueFrom(http.put(\`/api/grid-state/\${key}\`, value)).then(
              () => undefined,
            ),
        } satisfies OgeStateStorage,
      },
    ],
  };
}`,
});

export const IMPERATIVE_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  types: { '@oge-ui/core': ['GridStateSnapshot'] },
  dataset: 'employees',
  template: `<!-- full control, no token needed -->
<oge-grid #grid [data]="employees" keyField="id"
          (stateChange)="saveToBackend($event)">
  <oge-column field="firstName" />
</oge-grid>
<button type="button" (click)="capture(grid.state())">Capture</button>`,
  body: `private snapshot: GridStateSnapshot | null = null;

// capture / restore programmatically — the snapshot is serializable
protected capture(snapshot: GridStateSnapshot): void {
  this.snapshot = snapshot;
}

// stateChange fires debounced on every user-driven change
protected saveToBackend(snapshot: GridStateSnapshot): void {
  void fetch('/api/me/grid-state', {
    method: 'PUT',
    body: JSON.stringify(snapshot),
  });
}`,
});
