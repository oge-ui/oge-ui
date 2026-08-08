import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  helpers: { '@oge-ui/overlay': ['OgeToastService'] },
  template: `<oge-button text="Save" (clicked)="save()" />`,
  body: `private readonly toasts = inject(OgeToastService);

protected save(): void {
  this.toasts.success('Saved');
  this.toasts.warning('Quota at 90%', { title: 'Heads up' });
  this.toasts.error('Save failed'); // announces assertively
  this.toasts.show({ message: 'Plain info toast' });
}`,
});

export const POSITION_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  helpers: {
    '@oge-ui/overlay': ['OgeToastService', 'provideOgeOverlayConfig'],
  },
  types: { '@angular/core': ['ApplicationConfig'] },
  template: `<oge-button text="Top center" (clicked)="notify()" />`,
  body: `private readonly toasts = inject(OgeToastService);

// 6 logical positions (RTL-aware); the default comes from config
protected notify(): void {
  this.toasts.info('Top center', { position: 'top-center' });
}`,
  after: `// extras beyond toastMaxVisible queue FIFO and promote as slots free up
export const appConfig: ApplicationConfig = {
  providers: [
    provideOgeOverlayConfig({ toastPosition: 'bottom-end', toastMaxVisible: 5 }),
  ],
};`,
});

export const ACTION_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  helpers: { '@oge-ui/overlay': ['OgeToastService'] },
  template: `<oge-button text="Delete row" severity="danger" (clicked)="deleteRow()" />`,
  body: `private readonly toasts = inject(OgeToastService);

protected async deleteRow(): Promise<void> {
  const ref = this.toasts.show({
    message: 'Row deleted',
    sticky: true, // action toasts should stick
    action: { text: 'Undo', handler: () => this.restore() },
  });
  const { reason } = await ref.closed; // 'action' | 'closeButton' | …
  console.log('closed because of', reason);
}

private restore(): void {
  console.log('restored');
}`,
});

export const PROMISE_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  helpers: { '@oge-ui/overlay': ['OgeToastService'] },
  template: `<oge-button text="Publish" (clicked)="publish()" />`,
  body: `private readonly toasts = inject(OgeToastService);

// spinner → severity morph in place; the timer starts on settle
protected publish(): void {
  this.toasts.promise(this.publishPages(), {
    loading: 'Publishing…',
    success: (result) => \`Published \${result.count} pages\`,
    error: (error) => ({ title: 'Publish failed', message: String(error) }),
  });
}

private publishPages(): Promise<{ count: number }> {
  return fetch('/api/publish').then((response) => response.json());
}`,
});

export const COALESCE_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  helpers: { '@oge-ui/overlay': ['OgeToastService'] },
  template: `<oge-button text="Import" (clicked)="report()" />`,
  body: `private readonly toasts = inject(OgeToastService);
private readonly failedRows = [3, 17, 42];

protected report(): void {
  // identical toasts merge into one with a live ×N badge
  for (const _row of this.failedRows) {
    this.toasts.error('Import row failed', { coalesce: true });
  }

  // remaining-time progress bar; pauses with the timer on hover/focus
  this.toasts.info('With progress', { progressBar: true, displayTime: 6000 });
}`,
});
