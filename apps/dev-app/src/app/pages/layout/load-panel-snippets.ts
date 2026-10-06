import { demoSource } from '../../shared/demo-source';

export const CONTAINER_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeLoadPanel'] },
  template: `<!-- The panel covers its own parent by default. While shown the parent
     is aria-busy="true" (its previous value comes back after), the message
     is announced once through the shared live announcer, and the shade
     swallows pointer input. Focus is never taken or trapped. -->
<section class="orders">
  <oge-load-panel [visible]="loading()" />
  <h3>Orders</h3>
  <button type="button" (click)="reload()">Reload</button>
</section>`,
  body: `protected readonly loading = signal(false);

protected reload(): void {
  this.loading.set(true);
  setTimeout(() => this.loading.set(false), 2000);
}`,
});

export const TIMING_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeLoadPanel'] },
  template: `<!-- showDelay: a load that ends sooner never flashes a panel.
     minDisplayTime: once shown, the panel stays long enough to read.
     (shown) / (hidden) fire when it actually appears / disappears. -->
<section>
  <oge-load-panel
    [visible]="loading()"
    [showDelay]="300"
    [minDisplayTime]="800"
    (shown)="log('shown')"
    (hidden)="log('hidden')"
  />
  <button type="button" (click)="load(100)">Fast load (100 ms)</button>
  <button type="button" (click)="load(1500)">Slow load (1.5 s)</button>
</section>`,
  body: `protected readonly loading = signal(false);

protected load(ms: number): void {
  this.loading.set(true);
  setTimeout(() => this.loading.set(false), ms);
}

protected log(what: string): void {
  console.log(what);
}`,
});

export const TARGET_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeLoadPanel'] },
  template: `<!-- target: an element or a selector anywhere on the page. fullScreen
     covers the viewport instead; without a target it marks nothing busy
     (aria-busy on <body> would mute the live regions too). -->
<div id="report-chart">…</div>
<oge-load-panel target="#report-chart" [visible]="chartLoading()" message="Rendering chart…" />

<oge-load-panel [fullScreen]="true" [visible]="saving()" message="Saving the report…" />`,
  body: `protected readonly chartLoading = signal(false);
protected readonly saving = signal(false);`,
});

export const APPEARANCE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeLoadPanel'] },
  template: `<!-- showPane drops the raised card, shading the dim layer, position
     moves the pane; showIndicator: false leaves only the message (which is
     then the readable text). The default message is the localized
     loadPanelMessage of the load-indicator config. -->
<oge-load-panel
  [visible]="true"
  [showPane]="false"
  [shading]="false"
  position="top"
  message="Refreshing…"
/>

<oge-load-panel [visible]="true" [showIndicator]="false" message="Waiting for the server…" />`,
});
