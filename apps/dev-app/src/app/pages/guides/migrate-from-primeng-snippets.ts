/** Code samples rendered on the PrimeNG migration guide. */

export const MENU_ADAPTER = `import { Component, computed, input } from '@angular/core';
import { Router } from '@angular/router';
import {
  OgeContextMenu,
  ogeFromPrimeMenuItems,
  type OgeMenuListItemClickEvent,
  type OgePrimeMenuItem, // your PrimeNG MenuItem[] fits this shape as is
} from '@oge-ui/overlay';

@Component({
  selector: 'app-row-actions',
  imports: [OgeContextMenu],
  template: \`<div [ogeContextMenu]="items()" (contextMenuItemClick)="go($event)">…</div>\`,
})
export class RowActions {
  // the PrimeNG model you already have, unchanged
  readonly model = input.required<OgePrimeMenuItem[]>();
  // label → text, command → action, icon → iconClass, routerLink → url,
  // styleClass → cssClass, title / tooltip → hint; separators and submenus stay
  protected readonly items = computed(() => ogeFromPrimeMenuItems(this.model()));

  constructor(private readonly router: Router) {}

  // a routerLink became a real href: let the router take it
  protected go(event: OgeMenuListItemClickEvent): void {
    const url = event.item.url;
    if (url?.startsWith('/')) {
      event.event.preventDefault();
      void this.router.navigateByUrl(url);
    }
  }
}`;

export const MENU_ADAPTER_REACT = `import {
  OgeContextMenu,
  ogeFromPrimeMenuItems,
  type OgePrimeMenuItem, // your PrimeNG MenuItem[] fits this shape as is
} from '@oge-ui/react-overlay';

declare const model: OgePrimeMenuItem[];
const items = ogeFromPrimeMenuItems(model);

<OgeContextMenu items={items}>
  <div tabIndex={0}>Right-click me</div>
</OgeContextMenu>;`;

export const CONFIRM = `// PrimeNG: ConfirmationService with accept / reject callbacks
this.confirmation.confirm({
  header: 'Delete file?',
  message: 'report.xlsx will be removed permanently.',
  accept: () => this.remove(),
});

// OGE: a promise — true for the primary button, false otherwise
const ok = await this.modals.confirm({
  title: 'Delete file?',
  message: 'report.xlsx will be removed permanently.',
  severity: 'danger',
});
if (ok) this.remove();`;

export const TOAST = `// PrimeNG: MessageService + <p-toast>; severity 'warn', life in ms
this.messages.add({ severity: 'warn', summary: 'Quota', detail: '90% used', life: 3000 });

// OGE: OgeToastService (no host element to place); severity 'warning'
this.toasts.warning('90% used', { title: 'Quota', displayTime: 3000 });`;

export const BUTTON = `<!-- PrimeNG -->
<p-button label="Save" icon="pi pi-save" severity="secondary" [outlined]="true"
          [rounded]="true" [loading]="saving" (onClick)="save()" />

<!-- OGE: the label is text, an icon class is iconClass, styles are one input -->
<oge-button text="Save" iconClass="pi pi-save" stylingMode="outlined"
            shape="pill" [loading]="saving" (clicked)="save()" />`;

export const DARK = `/* PrimeNG: providePrimeNG({ theme: { options: { darkModeSelector: '.app-dark' } } }) */

/* OGE, Tailwind-style .dark or [data-theme="dark"]: one import */
@import '@oge-ui/core/themes/dark-class.css';

/* OGE, any other selector (.app-dark here): the Sass mixin */
@use '@oge-ui/core/themes/dark.scss' as oge-dark;
@include oge-dark.theme('.app-dark');`;

export const DIALOG = `<!-- PrimeNG: non-modal, draggable and resizable unless told otherwise -->
<p-dialog header="Edit" [(visible)]="open" [modal]="true" [dismissableMask]="true">…</p-dialog>

<!-- OGE: modal, fixed, closes on a backdrop click — opt in to the rest -->
<oge-modal title="Edit" [(opened)]="open">…</oge-modal>
<oge-modal title="Edit" [(opened)]="open"
           [closeOnBackdropClick]="false" [dragEnabled]="true" [resizeEnabled]="true">…</oge-modal>`;

export const TREE = `// PrimeNG: TreeNode[] with label / children / key
const nodes: TreeNode[] = [{ key: '1', label: 'Documents', children: [/* … */] }];

// OGE: your own objects — say which fields to read
<oge-tree-view [items]="nodes" keyExpr="key" displayExpr="label" itemsExpr="children"
               [allowDragging]="true" (itemReordered)="move($event)" />`;

export const CODEMOD = `# from the workspace root, on a clean working tree
ng generate @oge-ui/buttons:migrate-primeng            # src/ by default
ng generate @oge-ui/overlay:migrate-primeng --path=src/app/admin

# before → after
<p-button label="Save" icon="pi pi-save" [outlined]="true" (onClick)="save()" />
<oge-button text="Save" iconClass="pi pi-save" (clicked)="save()" stylingMode="outlined" />

<p-dialog header="Edit" [(visible)]="open" [modal]="true">…</p-dialog>
<!-- TODO(oge-migrate): p-dialog relied on PrimeNG defaults (draggable, resizable, dismissableMask); … -->
<oge-modal title="Edit" [(opened)]="open">…</oge-modal>`;
