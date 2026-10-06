import { demoSource } from '../../shared/demo-source';

const PHOTO_ACTIONS = `protected readonly actions: OgeActionSheetItem[] = [
  { key: 'share', text: 'Share', icon: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13' },
  { key: 'link', text: 'Copy link' },
  { key: 'edit', text: 'Edit', icon: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z' },
  { key: 'delete', text: 'Delete photo', icon: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', destructive: true },
];`;

export const ACTION_SHEET_BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeActionSheet'] },
  types: { '@oge-ui/overlay': ['OgeActionSheetItem'] },
  template: `<!-- A modal role="dialog" labelled by its title, pinned to the bottom
     edge and moved to <body> while open. The actions are an APG menu (one
     Tab stop, ↑/↓, Home/End); Cancel is a separate button. Escape, the
     backdrop and a swipe down on the handle close it, and focus returns to
     the button that opened it. -->
<button type="button" (click)="sheet.open()">Photo actions</button>
<oge-action-sheet
  #sheet
  title="Photo"
  description="Taken on 3 October in Göreme"
  [items]="actions"
  (itemClick)="last.set($event.item.text)"
/>
<p>Last action: {{ last() }}</p>`,
  body: `protected readonly last = signal('none');
${PHOTO_ACTIONS}`,
});

export const ACTION_SHEET_GROUPS_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeActionSheet', 'OgeActionSheetItemTemplate'] },
  types: { '@oge-ui/overlay': ['OgeActionSheetItem'] },
  template: `<!-- group: 'bottom' actions render after a divider; disabled actions
     stay focusable (so they are discoverable) but do nothing. The item
     template replaces the icon and text; the menuitem button stays. -->
<button type="button" (click)="sheet.toggle()">File actions</button>
<oge-action-sheet #sheet title="Quarterly report.pdf" [items]="actions">
  <ng-template ogeActionSheetItemTemplate let-item>
    <span>
      <strong>{{ item.text }}</strong>
      @if (item.description) {
        <small> — {{ item.description }}</small>
      }
    </span>
  </ng-template>
</oge-action-sheet>`,
  body: `protected readonly actions: OgeActionSheetItem[] = [
  { key: 'download', text: 'Download', description: 'PDF, 2.4 MB' },
  { key: 'share', text: 'Share with team', description: 'Only owners can share this file', disabled: true },
  { key: 'report', text: 'Report a problem', group: 'bottom' },
  { key: 'delete', text: 'Move to trash', destructive: true, group: 'bottom' },
];`,
});

export const ACTION_SHEET_PROMISE_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeActionSheet'] },
  types: {
    '@oge-ui/overlay': [
      'OgeActionSheetClosingEvent',
      'OgeActionSheetItem',
      'OgeActionSheetItemClickEvent',
    ],
  },
  template: `<!-- open() resolves with the chosen action, or null when the sheet was
     dismissed. itemClick can keep the sheet open (keepOpen), and the
     cancelable closing event can veto a close. -->
<button type="button" (click)="choose()">Choose a layout</button>
<label>
  <input type="checkbox" [checked]="lock()" (change)="lock.set(!lock())" />
  Veto backdrop closing
</label>
<oge-action-sheet
  #sheet
  title="Layout"
  [items]="layouts"
  (itemClick)="onItem($event)"
  (closing)="onClosing($event)"
/>
<p>{{ result() }}</p>`,
  body: `private readonly sheet = viewChild.required<OgeActionSheet>('sheet');
protected readonly result = signal('Nothing chosen yet');
protected readonly lock = signal(false);
protected readonly layouts: OgeActionSheetItem[] = [
  { key: 'grid', text: 'Grid' },
  { key: 'list', text: 'List' },
  { key: 'preview', text: 'Preview (keeps the sheet open)' },
];

protected async choose(): Promise<void> {
  const chosen = await this.sheet().open();
  this.result.set(chosen ? 'Chose ' + chosen.text : 'Dismissed');
}

protected onItem(event: OgeActionSheetItemClickEvent): void {
  event.keepOpen = event.item.key === 'preview';
}

protected onClosing(event: OgeActionSheetClosingEvent): void {
  event.cancel = this.lock() && event.reason === 'backdrop';
}`,
});
