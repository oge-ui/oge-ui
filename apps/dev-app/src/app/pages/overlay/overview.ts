import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { OgeButton, OgeButtonGroup } from '@oge-ui/buttons';
import {
  OgeAnchoredPanel,
  OgeMenuList,
  OgePopup,
  type OgeMenuItem,
  type OgePopupPlacement,
} from '@oge-ui/overlay';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { MENU_SNIPPET, PANEL_SNIPPET } from './overview-snippets';

const SECTIONS = ['Anchored panel', 'Menu list'] as const;

@Component({
  selector: 'app-overlay-overview',
  imports: [
    OgeButton,
    OgeButtonGroup,
    OgeMenuList,
    OgePopup,
    DemoCard,
    DocHeader,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Overlay"
      category="Overlay"
      [chips]="[
        'resolvePopupPosition',
        'OgeAnchoredPanel',
        'oge-popup',
        'oge-menu-list',
      ]"
    >
      <p>
        <code>&#64;oge-ui/overlay</code> is the suite's anchored-popup
        foundation: pure placement math with flip and viewport clamping, a
        DI-free panel behavior model, minimal popup chrome and a WAI-ARIA menu
        list. Panels render inline in the owner's template — there is no portal,
        and the package renders no user-facing strings of its own.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['OgeAnchoredPanel', 'oge-popup', 'flip + clamp']"
      heading="Anchored panel"
      description="An <code>OgeAnchoredPanel</code> pairs an anchor element with a panel element and keeps the panel positioned: preferred placement, main-axis flip when the opposite side has more room, viewport clamping, repositioning on scroll/resize and panel growth. <code>&lt;oge-popup&gt;</code> supplies the fixed-position chrome and stays transparent until the first measure. Outside pointer-down and Escape close it by default."
      [code]="panelSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-center gap-4">
        <span #anchor class="inline-flex">
          <oge-button
            text="Toggle panel"
            ariaHasPopup="dialog"
            [ariaExpanded]="open()"
            [ariaControls]="panel.panelId"
            (clicked)="open.set(!open())"
          />
        </span>
        <oge-button-group
          selectionMode="single"
          size="sm"
          stylingMode="outlined"
          [(selectedKeys)]="placementKeys"
          ariaLabel="Panel placement"
        >
          <oge-button value="bottom-start" text="bottom-start" />
          <oge-button value="bottom-end" text="bottom-end" />
          <oge-button value="top-start" text="top-start" />
          <oge-button value="right-start" text="right-start" />
        </oge-button-group>
        @if (open()) {
          <oge-popup [panel]="panel">
            <div class="w-60 p-3 text-sm">
              <p class="!my-0 font-medium">Anchored content</p>
              <p class="!mb-0 !mt-1 text-gray-500 dark:text-gray-400">
                Placement <code>{{ placement() }}</code> — scroll or resize to
                watch it reposition; Escape or an outside click closes it.
              </p>
            </div>
          </oge-popup>
        }
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['role=menu', 'activedescendant', 'type-ahead']"
      heading="Menu list"
      description="<code>&lt;oge-menu-list&gt;</code> implements the WAI-ARIA menu pattern with <code>aria-activedescendant</code>: the container holds real focus, arrows wrap and skip disabled items and separators, Home/End jump, printable keys type-ahead, Enter/Space activate. It is presentation-only — closing is delegated to the owner via <code>closeRequest</code>. Here it renders standalone (no popup) so the keyboard behavior is easy to try."
      [code]="menuSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-start gap-6">
        <div
          class="w-56 rounded-lg border border-gray-200 py-1 shadow-sm dark:border-gray-800"
        >
          <oge-menu-list
            [items]="menuItems"
            ariaLabel="Demo actions"
            (itemClick)="lastAction.set($event.item.text)"
          />
        </div>
        <span class="text-sm opacity-70"
          >last action: {{ lastAction() || '—' }}</span
        >
      </div>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        <code>resolvePopupPosition</code> is a pure function — unit-test your
        own overlay placement without any DOM.
      </li>
      <li>
        Render the popup subtree behind
        <code>&#64;if (panel.isOpen())</code> and call
        <code>panel.destroy()</code> from <code>DestroyRef</code>; stacked
        overlays share a stack so Escape only closes the topmost.
      </li>
      <li>
        <code>OgeMenuItem</code> is the canonical menu item of the suite — the
        same type drives <code>oge-drop-down-button</code>.
      </li>
    </ul>
  `,
})
export class OverlayOverviewPage {
  protected readonly sections = SECTIONS;
  protected readonly panelSnippet = PANEL_SNIPPET;
  protected readonly menuSnippet = MENU_SNIPPET;

  protected readonly open = signal(false);
  protected readonly placementKeys = signal<readonly string[]>([
    'bottom-start',
  ]);
  protected readonly lastAction = signal('');

  protected readonly menuItems: OgeMenuItem[] = [
    { text: 'Duplicate' },
    { text: 'Move to…', hint: 'Pick a destination' },
    { text: 'Pin', checked: true },
    { text: '', separator: true },
    { text: 'Archive', disabled: true },
    { text: 'Delete', severity: 'danger' },
  ];

  private readonly anchorRef =
    viewChild.required<ElementRef<HTMLElement>>('anchor');
  private readonly popupRef = viewChild(OgePopup, { read: ElementRef });

  protected placement(): OgePopupPlacement {
    return (this.placementKeys()[0] ?? 'bottom-start') as OgePopupPlacement;
  }

  readonly panel = new OgeAnchoredPanel({
    anchor: () => this.anchorRef().nativeElement,
    panel: () => this.popupRef()?.nativeElement ?? null,
    placement: () => this.placement(),
    onClosed: () => {
      if (this.open()) this.open.set(false);
    },
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.panel.destroy());
    // `open` signal ↔ panel model, loop-guarded by comparing states first.
    effect(() => {
      const shouldOpen = this.open();
      untracked(() => {
        if (shouldOpen && !this.panel.isOpen()) this.panel.open();
        else if (!shouldOpen && this.panel.isOpen()) this.panel.close('api');
      });
    });
    // Reposition in place when the placement selection changes while open.
    effect(() => {
      this.placementKeys();
      untracked(() => {
        if (this.panel.isOpen()) this.panel.updatePosition();
      });
    });
  }
}
