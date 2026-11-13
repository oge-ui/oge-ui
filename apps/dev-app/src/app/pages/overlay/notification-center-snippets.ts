import { demoSource } from '../../shared/demo-source';

export const NOTIFICATION_CENTER_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeNotificationCenter'] },
  types: { '@oge-ui/overlay': ['OgeNotification'] },
  template: `<!-- The bell shows the unread count; the panel is a feed (Page Down /
     Page Up between items). Scrolling to the end asks for older ones. -->
<oge-notification-center
  [(items)]="items"
  [hasMore]="page() < 3"
  [loading]="loading()"
  (loadMore)="loadOlder()"
  (readChange)="saveRead($event.item.id, $event.read)"
/>
<button type="button" (click)="arrive()">Simulate a new notification</button>`,
  body: `protected readonly items = signal<readonly OgeNotification[]>([
  { id: 'n1', title: 'Build passed', time: Date.now() - 120_000, severity: 'success' },
  { id: 'n2', title: 'Invoice #1042 paid', time: Date.now() - 90_000_000, read: true },
]);
protected readonly page = signal(0);
protected readonly loading = signal(false);

protected loadOlder(): void {
  this.loading.set(true);
  // fetch the next page from your API, then append it
  setTimeout(() => {
    const page = this.page();
    const older = Array.from({ length: 5 }, (_, i) => ({
      id: \`old-\${page}-\${i}\`,
      title: 'Weekly report is ready',
      time: Date.now() - (3 + page * 5 + i) * 86_400_000,
      read: true,
    }));
    this.items.update((items) => [...items, ...older]);
    this.page.set(page + 1);
    this.loading.set(false);
  }, 400);
}

protected arrive(): void {
  this.items.update((items) => [
    { id: crypto.randomUUID(), title: 'New order received', time: Date.now() },
    ...items,
  ]);
}

protected saveRead(id: string, read: boolean): void {
  // persist the read state on your server
}`,
});
