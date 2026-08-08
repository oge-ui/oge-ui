import { demoSource } from '../../shared/demo-source';

export const PANEL_SNIPPET = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton'],
    '@oge-ui/overlay': ['OgePopup'],
  },
  helpers: { '@oge-ui/overlay': ['OgeAnchoredPanel'] },
  types: { '@oge-ui/overlay': ['OgePopupPlacement'] },
  template: `<span #anchor class="inline-flex">
  <oge-button text="Toggle panel" ariaHasPopup="dialog"
    [ariaExpanded]="open()" [ariaControls]="panel.panelId"
    (clicked)="open.set(!open())" />
</span>
@if (open()) {
  <oge-popup [panel]="panel">
    <div class="w-56 p-3">Anchored content…</div>
  </oge-popup>
}`,
  body: `readonly open = signal(false);
readonly placement = signal<OgePopupPlacement>('bottom-start');

private readonly anchorRef = viewChild.required<ElementRef<HTMLElement>>('anchor');
private readonly popupRef = viewChild(OgePopup, { read: ElementRef });

readonly panel = new OgeAnchoredPanel({
  anchor: () => this.anchorRef().nativeElement,
  panel: () => this.popupRef()?.nativeElement ?? null,
  placement: () => this.placement(),
  onClosed: () => this.open.set(false),
});`,
});

export const MENU_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeMenuList'] },
  types: { '@oge-ui/overlay': ['OgeMenuItem'] },
  template: `<oge-menu-list
  [items]="items"
  ariaLabel="Demo actions"
  (itemClick)="last.set($event.item.text)"
/>`,
  body: `protected readonly last = signal('');

protected readonly items: OgeMenuItem[] = [
  { text: 'Duplicate', checked: false },
  { text: 'Move to…' },
  { text: '', separator: true },
  { text: 'Delete', severity: 'danger' },
];`,
});
