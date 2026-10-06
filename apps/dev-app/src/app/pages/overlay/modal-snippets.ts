import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton'],
    '@oge-ui/overlay': ['OgeModal', 'OgeModalFooter'],
  },
  template: `<oge-button text="Open" (clicked)="modal.open()" />

<oge-modal #modal title="Team settings" [(opened)]="opened">
  <p>Centered dialog with backdrop, focus trap and scroll lock.</p>
  <div *ogeModalFooter="let close">
    <oge-button text="Cancel" stylingMode="text" (clicked)="close()" />
    <oge-button text="Save" (clicked)="close()" />
  </div>
</oge-modal>

<!-- Escape and backdrop clicks close it (closeOnEscape /
     closeOnBackdropClick); focus returns to the opener. -->`,
  body: `protected readonly opened = signal(false);`,
});

export const FORM_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': ['OgeSelectBox'],
    '@oge-ui/overlay': ['OgeModal'],
  },
  template: `<oge-modal title="Edit record" [(opened)]="opened" [width]="420">
  <oge-select-box label="Status" [items]="statuses" [(value)]="status" />
  <!-- the select popup renders above the modal; the first Escape
       closes the popup, the second closes the modal -->
</oge-modal>`,
  body: `protected readonly opened = signal(false);
protected readonly statuses = ['Draft', 'In review', 'Published'];
protected readonly status = signal<unknown>('Draft');`,
});

export const SIZING_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeModal'] },
  template: `<!-- maximize/restore toggle in the title bar drives [(fullScreen)] -->
<oge-modal title="Report" [(opened)]="opened" [(fullScreen)]="max"
           [showMaximizeButton]="true"
           [width]="480" [minHeight]="240" [maxWidth]="'90vw'" />

<!-- pinned near the top edge, command-palette style -->
<oge-modal title="Search" [(opened)]="search" placement="top" />

<!-- transparent backdrop — still modal (focus trap + scroll lock) -->
<oge-modal title="Quiet" [(opened)]="quiet" [shading]="false" />`,
  body: `protected readonly opened = signal(false);
protected readonly search = signal(false);
protected readonly quiet = signal(false);
protected readonly max = signal(false);`,
});

export const WINDOW_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeModal'] },
  helpers: {
    '@angular/core': ['Injectable'],
    '@oge-ui/overlay': ['OGE_MODAL_DATA', 'OgeModalRef', 'OgeModalService'],
  },
  types: { '@oge-ui/overlay': ['OgeModalResizeEvent'] },
  template: `<!-- drag by the title bar, resize by the corner handle -->
<oge-modal title="Window" [(opened)]="opened"
           [dragEnabled]="true" [resizeEnabled]="true"
           (resized)="onResized($event)" />`,
  body: `protected readonly opened = signal(false);

protected onResized(event: OgeModalResizeEvent): void {
  console.log(event.width, event.height);
}

// imperative, body-appended — for transformed ancestors & prompt flows
private readonly modals = inject(OgeModalService);

protected async openPrompt(): Promise<void> {
  const ref = this.modals.open<string>(RenameDialog, {
    title: 'Rename file',
    width: 380,
    data: { name: 'report.xlsx' },
  });
  const { result } = await ref.closed;
  if (result) this.rename(result);
}

private rename(name: string): void {
  console.log('renamed to', name);
}`,
  after: `// content component: inject its data + the ref to close with a result
@Component({
  selector: 'demo-rename-dialog',
  template: \`<p>Renaming {{ data.name }}</p>\`,
})
export class RenameDialog {
  readonly data = inject<{ name: string }>(OGE_MODAL_DATA);
  readonly ref = inject<OgeModalRef<string>>(OgeModalRef);
}`,
});

export const GUARD_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeModal'] },
  template: `<oge-modal title="Draft" [(opened)]="opened" [closeGuard]="confirmDiscard">
  <p>Unsaved work lives here.</p>
</oge-modal>`,
  body: `protected readonly opened = signal(false);
protected readonly dirty = signal(true);

// runs for every close reason (Escape, backdrop, ✕, close());
// may be async: the modal stays open until the promise resolves
protected readonly confirmDiscard = (): boolean =>
  !this.dirty() || confirm('Discard unsaved changes?');`,
});

export const BUSY_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeModal'] },
  template: `<oge-modal title="Publishing…" [(opened)]="opened" [busy]="saving()">
  <!-- spinner veil + aria-busy; Escape/backdrop/✕ are blocked
       while busy — programmatic close() still works -->
</oge-modal>`,
  body: `protected readonly opened = signal(false);
protected readonly saving = signal(true);`,
});

export const RESULT_SNIPPET = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton'],
    '@oge-ui/overlay': ['OgeModal', 'OgeModalFooter'],
  },
  types: { '@oge-ui/overlay': ['OgeModalClosedEvent'] },
  template: `<oge-modal #confirm title="Delete file?" [(opened)]="opened"
           (closed)="onClosed($event)">
  <p>This cannot be undone.</p>
  <div *ogeModalFooter="let close">
    <oge-button text="Cancel" stylingMode="text" (clicked)="close()" />
    <oge-button text="Delete" severity="danger" (clicked)="close('delete')" />
  </div>
</oge-modal>`,
  body: `protected readonly opened = signal(false);

// $event: { reason: 'api' | 'escape' | 'backdrop' | 'closeButton', result? }
protected onClosed(event: OgeModalClosedEvent): void {
  if (event.result === 'delete') this.remove();
}

private remove(): void {
  console.log('deleted');
}`,
});

export const DIALOG_HELPERS_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  helpers: { '@oge-ui/overlay': ['OgeModalService'] },
  template: `<oge-button text="Delete…" severity="danger" (clicked)="remove()" />
<oge-button text="Rename…" (clicked)="rename()" />
<oge-button text="Show notice" (clicked)="notice()" />`,
  body: `private readonly modals = inject(OgeModalService);

// confirm → Promise<boolean>; danger = destructive OK + focus on Cancel
protected async remove(): Promise<void> {
  const ok = await this.modals.confirm({
    title: 'Delete file?',
    message: 'report.xlsx will be removed permanently.',
    severity: 'danger',
    okText: 'Delete',
  });
  if (ok) console.log('deleted');
}

// prompt → Promise<string | null>; validation blocks Enter / OK
protected async rename(): Promise<void> {
  const name = await this.modals.prompt({
    title: 'Rename file',
    label: 'File name',
    defaultValue: 'report.xlsx',
    required: true,
    validate: (value) =>
      value.endsWith('.xlsx') ? null : 'Keep the .xlsx extension.',
  });
  if (name !== null) console.log('renamed to', name);
}

// alert → Promise<void>; Escape acknowledges it too
protected async notice(): Promise<void> {
  await this.modals.alert({ message: 'Export finished.', severity: 'success' });
}`,
});

export const PLACEMENT_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeModal'] },
  types: { '@oge-ui/overlay': ['OgeModalPlacement'] },
  template: `<!-- edges and corners; start/end are logical and mirror in RTL -->
<oge-modal title="Filters" [(opened)]="opened" [placement]="placement()"
           [width]="320" />`,
  body: `protected readonly opened = signal(false);
protected readonly placement = signal<OgeModalPlacement>('bottom-end');
// 'center' | 'top' | 'bottom' | 'start' | 'end'
// | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'`,
});
