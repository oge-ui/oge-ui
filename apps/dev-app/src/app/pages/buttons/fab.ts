import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeFab,
  OgeSpeedDial,
  type OgeFabPosition,
  type OgeSpeedDialItem,
  type OgeSpeedDialItemClickEvent,
} from '@oge-ui/buttons';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_BUTTONS_FAB_SECTIONS,
  ReactButtonsFabDemos,
} from '../react-buttons/fab';
import {
  DIRECTIONS_SNIPPET,
  EXTENDED_SNIPPET,
  FAB_ICONS,
  FAB_SNIPPET,
  HOVER_SNIPPET,
  POSITIONS_SNIPPET,
  SPEED_DIAL_SNIPPET,
} from './fab-snippets';

const SECTIONS = [
  'Floating action button',
  'Extended FAB',
  'Positions & safe areas',
  'Speed dial',
  'Directions & label modes',
  'Hover mode',
] as const;

@Component({
  selector: 'app-buttons-fab',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeFab,
    OgeSpeedDial,
    ReactButtonsFabDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      category="Buttons"
      title="FAB & Speed Dial"
      [chips]="['position', 'safe areas', 'APG menu button', '[(opened)]']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeFab&gt;</code> is the screen's one primary action, pinned
          to a viewport corner or edge with the safe-area insets as a floor;
          <code>&lt;OgeSpeedDial&gt;</code> unfolds a short list of related
          actions from it, following the WAI-ARIA APG
          <strong>menu button</strong> pattern — over the same keyboard map and
          stylesheet as the Angular components.
        </p>
      } @else {
        <p>
          <code>oge-fab</code> is the screen's one primary action, pinned to a
          viewport corner or edge with the safe-area insets as a floor;
          <code>oge-speed-dial</code> unfolds a short list of related actions
          from it, following the WAI-ARIA APG
          <strong>menu button</strong> pattern: the FAB is a
          <code>aria-haspopup="menu"</code> button, the actions are menu items,
          opening moves focus to the nearest one.
        </p>
      }
      <p>
        The demos pin their FABs inside a box
        (<code>positionMode="absolute"</code>); in an app the default
        <code>fixed</code> pins them to the viewport.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-buttons-fab-demos />
    } @else {
      <app-demo-card
        [chips]="['label', 'icon', 'clicked']"
        heading="Floating action button"
        description="An icon-only FAB takes its accessible name from <code>label</code>. Pass the icon as SVG path data, or project your own <code>aria-hidden</code> icon. <code>clicked</code> reports the press."
        [code]="fabSnippet"
        language="ts"
      >
        <div class="demo-fab-box" style="height: 224px">
          <oge-fab
            label="Compose"
            [icon]="icons.pencil"
            positionMode="absolute"
            (clicked)="clicks.set(clicks() + 1)"
          />
          <p class="p-3 text-sm" data-testid="fab-clicks">
            Pressed {{ clicks() }} times
          </p>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['extended', 'size', 'severity']"
        heading="Extended FAB"
        description="<code>extended</code> shows the label as text beside the icon in a pill. Sizes are 40 / 56 / 72 px; <code>severity</code> uses the button vocabulary (<code>normal</code> is the page surface)."
        [code]="extendedSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-4">
          <oge-fab
            label="Compose"
            [icon]="icons.pencil"
            [extended]="true"
            positionMode="static"
          />
          <oge-fab
            label="Share"
            [icon]="icons.share"
            size="sm"
            severity="normal"
            positionMode="static"
          />
          <oge-fab
            label="Share"
            [icon]="icons.share"
            severity="success"
            positionMode="static"
          />
          <oge-fab
            label="Share"
            [icon]="icons.share"
            size="lg"
            severity="danger"
            positionMode="static"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['position', 'offset', 'env(safe-area-inset-*)']"
        heading="Positions & safe areas"
        description="Six logical positions — <code>start</code>/<code>end</code> mirror in RTL. Pinned edges use <code>max(offset, env(safe-area-inset-*))</code>, so a fixed FAB clears the home indicator and the notch once the app opts into <code>viewport-fit=cover</code>, and keeps the plain gap everywhere else."
        [code]="positionsSnippet"
        language="ts"
      >
        <div class="demo-fab-box" style="height: 256px">
          @for (position of positions; track position) {
            <oge-fab
              [label]="position"
              [icon]="icons.pencil"
              size="sm"
              positionMode="absolute"
              [position]="position"
              offset="12px"
            />
          }
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['items', '[(opened)]', 'itemClick', 'APG menu button']"
        heading="Speed dial"
        description="Enter, Space, a click or the arrow pointing along the dial opens it with focus on the nearest action (the arrow back opens it on the last). The arrows move and wrap, Home/End jump, Escape closes and returns focus to the FAB, Tab closes and moves on, a press outside closes it."
        [code]="speedDialSnippet"
        language="ts"
      >
        <div class="demo-fab-box" style="height: 288px">
          <oge-speed-dial
            label="Share options"
            positionMode="absolute"
            [items]="shareActions"
            [(opened)]="opened"
            (itemClick)="onAction($event)"
          />
        </div>
        <p class="mt-2 text-sm" data-testid="speed-dial-last">
          Last action: {{ last() }} · opened: {{ opened() }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['direction', 'labelMode', 'disabled item']"
        heading="Directions & label modes"
        description="<code>direction</code> overrides the default (up from a bottom FAB, down from a top one). <code>labelMode</code> is <code>hover</code> (beside the hovered or focused action, always on touch screens), <code>always</code>, or <code>none</code> — the label then stays the accessible name only. A disabled action is <code>aria-disabled</code> and skipped by the arrows."
        [code]="directionsSnippet"
        language="ts"
      >
        <div class="demo-fab-box" style="height: 240px">
          <oge-speed-dial
            label="New file"
            positionMode="absolute"
            position="bottom-end"
            direction="start"
            labelMode="none"
            [items]="fileActions"
          />
          <oge-speed-dial
            label="Insert"
            positionMode="absolute"
            position="top-start"
            labelMode="always"
            size="sm"
            [items]="fileActions"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['openMode: hover']"
        heading="Hover mode"
        description='<code>openMode="hover"</code> also opens the dial while a mouse hovers it — never on touch, where a tap is the only gesture. Hover does not move focus; a click still opens it with focus on the first action.'
        [code]="hoverSnippet"
        language="ts"
      >
        <div class="demo-fab-box" style="height: 224px">
          <oge-speed-dial
            label="Quick actions"
            openMode="hover"
            positionMode="absolute"
            severity="normal"
            [items]="quickActions"
          />
        </div>
      </app-demo-card>
    }
  `,
  styles: `
    .demo-fab-box {
      position: relative;
      overflow: hidden;
      border: 1px dashed var(--oge-border-color);
      border-radius: var(--oge-radius-lg);
    }
  `,
})
export class ButtonsFabPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_BUTTONS_FAB_SECTIONS;
  protected readonly fabSnippet = FAB_SNIPPET;
  protected readonly extendedSnippet = EXTENDED_SNIPPET;
  protected readonly positionsSnippet = POSITIONS_SNIPPET;
  protected readonly speedDialSnippet = SPEED_DIAL_SNIPPET;
  protected readonly directionsSnippet = DIRECTIONS_SNIPPET;
  protected readonly hoverSnippet = HOVER_SNIPPET;

  protected readonly icons = FAB_ICONS;
  protected readonly clicks = signal(0);
  protected readonly opened = signal(false);
  protected readonly last = signal('none');

  protected readonly positions: OgeFabPosition[] = [
    'top-start',
    'top-center',
    'top-end',
    'bottom-start',
    'bottom-center',
    'bottom-end',
  ];
  protected readonly shareActions: OgeSpeedDialItem[] = [
    { key: 'mail', label: 'Email', icon: FAB_ICONS.mail },
    { key: 'print', label: 'Print', icon: FAB_ICONS.print },
    { key: 'share', label: 'Copy link', icon: FAB_ICONS.share },
    {
      key: 'delete',
      label: 'Delete',
      icon: FAB_ICONS.trash,
      severity: 'danger',
    },
  ];
  protected readonly fileActions: OgeSpeedDialItem[] = [
    { key: 'doc', label: 'Document', icon: FAB_ICONS.doc },
    { key: 'image', label: 'Image', icon: FAB_ICONS.image },
    { key: 'mail', label: 'Email draft', icon: FAB_ICONS.mail, disabled: true },
  ];
  protected readonly quickActions: OgeSpeedDialItem[] = [
    { key: 'share', label: 'Share', icon: FAB_ICONS.share },
    { key: 'mail', label: 'Email', icon: FAB_ICONS.mail },
  ];

  protected onAction(event: OgeSpeedDialItemClickEvent): void {
    this.last.set(event.item.label);
  }
}
