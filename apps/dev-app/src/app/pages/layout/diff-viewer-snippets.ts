import { demoSource } from '../../shared/demo-source';

export const DIFF_TEXT_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeDiffViewer'] },
  template: `<!-- Changed words are highlighted inside changed lines; unchanged runs fold
     to [context] lines around each change. -->
<oge-diff-viewer [oldValue]="before" [newValue]="after" [context]="1" [(mode)]="mode" />`,
  body: `protected readonly mode = signal<'split' | 'inline'>('split');
protected readonly before = 'server:\\n  port: 8080\\n  workers: 4\\nlogging:\\n  level: info';
protected readonly after = 'server:\\n  port: 8443\\n  workers: 8\\n  tls: true\\nlogging:\\n  level: warn';`,
});

export const DIFF_JSON_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeDiffViewer'] },
  template: `<!-- JSON text or values, compared as canonical key-sorted text: the key
     order is not a change. diff().changes lists the changed paths. -->
<oge-diff-viewer #viewer language="json" [oldValue]="before" [newValue]="after" mode="inline" />
<ul>
  @for (change of viewer.diff().changes; track change.path) {
    <li>{{ change.kind }} {{ change.path }}</li>
  }
</ul>`,
  body: `protected readonly before = '{"sku": "SKU-2041", "price": 39.9, "tags": ["lighting"]}';
protected readonly after = { price: 34.9, sku: 'SKU-2041', tags: ['lighting', 'sale'] };`,
});
