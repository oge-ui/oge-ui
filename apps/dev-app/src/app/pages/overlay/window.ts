import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeButton } from '@oge-ui/buttons';
import { OgeSelectBox } from '@oge-ui/inputs';
import {
  OgeWindow,
  type OgeWindowClosedEvent,
  type OgeWindowClosingEvent,
  type OgeWindowMovedEvent,
  type OgeWindowPlacement,
  type OgeWindowResizedEvent,
  type OgeWindowState,
  type OgeWindowStateChangingEvent,
} from '@oge-ui/overlay';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_OVERLAY_WINDOW_SECTIONS,
  ReactOverlayWindowDemos,
} from '../react-overlay/window';
import {
  WINDOW_BASIC_SNIPPET,
  WINDOW_DRAG_SNIPPET,
  WINDOW_EVENTS_SNIPPET,
  WINDOW_PLACEMENT_SNIPPET,
  WINDOW_STACKING_SNIPPET,
  WINDOW_STATE_SNIPPET,
} from './window-snippets';

const SECTIONS = [
  'Basics',
  'Multiple windows & stacking',
  'Drag & resize (keyboard too)',
  'Minimize / maximize',
  'Placement & constraints',
  'Events',
] as const;

/** The placements the demo offers, in reading order. */
export const WINDOW_PLACEMENTS: readonly OgeWindowPlacement[] = [
  'top-start',
  'top',
  'top-end',
  'start',
  'center',
  'end',
  'bottom-start',
  'bottom',
  'bottom-end',
];

@Component({
  selector: 'app-overlay-window',
  imports: [
    OgeButton,
    OgeSelectBox,
    OgeWindow,
    DemoCard,
    DocHeader,
    PageToc,
    ReactOverlayWindowDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Window"
      category="Overlay"
      categoryLink="/components/overlay"
      [chips]="
        fw.isReact()
          ? ['OgeWindow', 'opened / onOpenedChange', 'state', 'onMoved']
          : ['oge-window', '[(opened)]', '[(state)]', '(moved)']
      "
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeWindow&gt;</code> is a non-modal floating window: no
          backdrop, no focus trap and no scroll lock, so the page stays usable
          and several windows can be open at once. A press or focus brings a
          window to the front, the title bar drags it, eight edge handles resize
          it and the title-bar buttons minimize, maximize and restore it — every
          gesture has a keyboard twin. For a blocking dialog use
          <code>&lt;OgeModal&gt;</code>.
        </p>
      } @else {
        <p>
          <code>oge-window</code> is a non-modal floating window: no backdrop,
          no focus trap and no scroll lock, so the page stays usable and several
          windows can be open at once. A press or focus brings a window to the
          front, the title bar drags it, eight edge handles resize it and the
          title-bar buttons minimize, maximize and restore it — every gesture
          has a keyboard twin. For a blocking dialog use <code>oge-modal</code>.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-overlay-window-demos />
    } @else {
      <app-demo-card
        [chips]="['[(opened)]', 'non-modal', 'role=dialog']"
        heading="Basics"
        description='Open it through the two-way <code>opened</code> model or <code>open()</code> / <code>close()</code> / <code>toggle()</code>. The window is a <code>role="dialog"</code> without <code>aria-modal</code>, labelled by its title: nothing behind it is blocked, focus moves into it on open (<code>autoFocus</code>) and back to the opener when it closes. <kbd>Escape</kbd> closes it only while focus is inside and no popup is open — a window never joins the modal Escape stack.'
        [code]="basicSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <oge-button text="Open window" (clicked)="basicOpen.set(true)" />
          <span class="text-sm opacity-70"
            >The page behind stays interactive.</span
          >
        </div>
        <oge-window title="Quick notes" [(opened)]="basicOpen" [width]="360">
          <label class="flex flex-col gap-1 text-sm">
            <span>Notes</span>
            <textarea
              class="min-h-24 rounded-md border border-gray-300 p-2 dark:border-gray-700 dark:bg-transparent"
            ></textarea>
          </label>
        </oge-window>
      </app-demo-card>

      <app-demo-card
        [chips]="['z-order', 'bringToFront()', '(activated)', 'zIndex']"
        heading="Multiple windows & stacking"
        description="Any number of windows can be open. They share one z-order — across component trees and both render layers — on top of the <code>--oge-z-window</code> token (below anchored popups, so a select opened inside a window still shows above it). A press or focus brings a window to the front and fires <code>activated</code>; the frontmost window's title bar carries the active accent. <code>zIndex</code> sets a base of your own."
        [code]="stackingSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <oge-button
            text="Open three windows"
            stylingMode="outlined"
            (clicked)="openStack()"
          />
          <span class="text-sm opacity-70" data-testid="active-window"
            >active: {{ activeWindow() }}</span
          >
        </div>
        <oge-window
          title="Inspector"
          [(opened)]="inspectorOpen"
          placement="top-start"
          [width]="280"
          (activated)="activeWindow.set('Inspector')"
        >
          <oge-select-box
            label="Align"
            [items]="alignments"
            [(value)]="alignment"
          />
        </oge-window>
        <oge-window
          title="Layers"
          [(opened)]="layersOpen"
          placement="top-end"
          [width]="260"
          (activated)="activeWindow.set('Layers')"
        >
          <ul class="m-0 list-none p-0 text-sm">
            <li>Background</li>
            <li>Shapes</li>
            <li>Labels</li>
          </ul>
        </oge-window>
        <oge-window
          title="Console"
          [(opened)]="consoleOpen"
          placement="bottom"
          [width]="420"
          (activated)="activeWindow.set('Console')"
        >
          <p class="m-0 font-mono text-sm">&gt; ready</p>
        </oge-window>
      </app-demo-card>

      <app-demo-card
        [chips]="['draggable', 'resizable', 'min/max', 'keyboard twin']"
        heading="Drag & resize (keyboard too)"
        description="The title bar drags the window and eight edge and corner handles resize it — both through the shared pointer gesture (3px threshold, touch-safe, <kbd>Escape</kbd> mid-gesture puts the window back). The keyboard twin works on the focused frame (Tab reaches it, a title-bar press focuses it): arrows move by 10px, <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + arrows resize, <kbd>Shift</kbd> makes either step 1px, and the result is announced. <code>minWidth</code>/<code>minHeight</code>/<code>maxWidth</code>/<code>maxHeight</code> bound the size; <code>moved</code> and <code>resized</code> report the new box and the <code>source</code>."
        [code]="dragSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <oge-button
            text="Open draggable window"
            stylingMode="outlined"
            (clicked)="dragOpen.set(true)"
          />
          <span class="text-sm opacity-70" data-testid="drag-status">{{
            dragStatus()
          }}</span>
        </div>
        <oge-window
          title="Drag me"
          [(opened)]="dragOpen"
          [width]="320"
          [minWidth]="260"
          [minHeight]="160"
          [maxWidth]="640"
          (moved)="onMoved($event)"
          (resized)="onResized($event)"
        >
          <p class="m-0">
            Drag the title bar, or pull any edge. Focus the frame and use the
            arrow keys.
          </p>
        </oge-window>
      </app-demo-card>

      <app-demo-card
        [chips]="['[(state)]', 'stateChanging', 'minimize()', 'maximize()']"
        heading="Minimize / maximize"
        description="Minimize collapses the window to its title bar, maximize fills the viewport (inside the safe-area insets), restore brings the previous box back. Title-bar buttons (labels from the overlay messages), a title-bar double-click, <kbd>Alt</kbd>+<kbd>↑</kbd> / <kbd>Alt</kbd>+<kbd>↓</kbd>, the two-way <code>state</code> model and <code>minimize()</code> / <code>maximize()</code> / <code>restore()</code> all run the cancelable <code>stateChanging</code> → <code>stateChanged</code> pipeline."
        [code]="stateSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <oge-button
            text="Open report"
            stylingMode="outlined"
            (clicked)="stateOpen.set(true)"
          />
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              [checked]="lockMaximize()"
              (change)="lockMaximize.set($any($event.target).checked)"
            />
            Veto maximize
          </label>
          <span class="text-sm opacity-70" data-testid="window-state"
            >state: {{ windowState() }}</span
          >
        </div>
        <oge-window
          title="Report"
          [(opened)]="stateOpen"
          [(state)]="windowState"
          [width]="380"
          (stateChanging)="onStateChanging($event)"
        >
          <p class="m-0">Quarterly figures, ready for review.</p>
        </oge-window>
      </app-demo-card>

      <app-demo-card
        [chips]="['placement', 'position', 'keepInViewport', 'RTL']"
        heading="Placement & constraints"
        description="Without a <code>position</code> the window opens at its <code>placement</code> — the centre, an edge (<code>top</code>, <code>bottom</code>, logical <code>start</code> / <code>end</code>) or a corner — and a new placement re-places an open window. <code>position</code> (<code>&#123; x, y &#125;</code> in viewport px) wins and moves the window when it changes. <code>keepInViewport</code> (default) keeps the whole window on screen; with <code>false</code> it may hang off the sides and bottom, but its title bar always stays reachable. A viewport resize re-clamps open windows."
        [code]="placementSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-2">
          @for (p of placements; track p) {
            <oge-button
              [text]="p"
              size="sm"
              stylingMode="outlined"
              (clicked)="openPlaced(p)"
            />
          }
          <label class="ms-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              [checked]="!contained()"
              (change)="contained.set(!$any($event.target).checked)"
            />
            Allow off-screen (title bar stays reachable)
          </label>
        </div>
        <oge-window
          title="Placed window"
          [(opened)]="placedOpen"
          [placement]="placement()"
          [keepInViewport]="contained()"
          [width]="300"
        >
          <p class="m-0">
            Placement: <code>{{ placement() }}</code>
          </p>
        </oge-window>
      </app-demo-card>

      <app-demo-card
        [chips]="['opening', 'closing', 'moved', 'stateChanged', 'activated']"
        heading="Events"
        description="Every interaction reports through an event: cancelable <code>opening</code>, <code>closing</code> (with the <code>reason</code> — <code>'escape'</code>, <code>'closeButton'</code>, <code>'api'</code>) and <code>stateChanging</code>; past-tense <code>closed</code>, <code>moved</code>, <code>resized</code>, <code>stateChanged</code> and <code>activated</code>. Interact with the window and watch the log."
        [code]="eventsSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-4">
          <oge-button
            text="Open event log window"
            stylingMode="outlined"
            (clicked)="eventsOpen.set(true)"
          />
          <ol
            class="m-0 min-w-56 list-decimal ps-5 font-mono text-xs"
            aria-label="Window events"
            data-testid="window-events"
          >
            @for (entry of events(); track $index) {
              <li>{{ entry }}</li>
            }
          </ol>
        </div>
        <oge-window
          title="Event log"
          [(opened)]="eventsOpen"
          placement="end"
          [width]="300"
          (opening)="log('opening')"
          (closing)="onClosing($event)"
          (closed)="onClosed($event)"
          (moved)="log('moved (' + $event.source + ')')"
          (resized)="log('resized (' + $event.source + ')')"
          (stateChanged)="log('stateChanged → ' + $event.state)"
          (activated)="log('activated')"
        >
          <p class="m-0">Move, resize, minimize or close me.</p>
        </oge-window>
      </app-demo-card>
    }

    <h3>Notes</h3>
    <ul>
      <li>
        Window or modal? A window never blocks the page: use it for tool
        palettes, inspectors and side-by-side work. A decision the user must
        take before going on belongs in a modal (or the
        <code>confirm()</code> helper).
      </li>
      <li>
        Coordinates are viewport pixels (<code>x</code> is the left edge, like
        <code>clientX</code>) in both reading directions; only placements name
        logical edges.
      </li>
      <li>
        The title-bar button labels localize through the overlay messages
        (<code>windowMinimize</code>, <code>modalMaximize</code>,
        <code>modalRestore</code>, <code>modalClose</code>) and the keyboard
        announcements through <code>windowMoved</code> /
        <code>windowResized</code>.
      </li>
    </ul>
  `,
})
export class OverlayWindowPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_OVERLAY_WINDOW_SECTIONS;
  protected readonly placements = WINDOW_PLACEMENTS;

  protected readonly basicOpen = signal(false);
  protected readonly inspectorOpen = signal(false);
  protected readonly layersOpen = signal(false);
  protected readonly consoleOpen = signal(false);
  protected readonly activeWindow = signal('—');
  protected readonly alignments = ['Start', 'Center', 'End'];
  protected readonly alignment = signal<string | undefined>('Start');
  protected readonly dragOpen = signal(false);
  protected readonly dragStatus = signal('not moved yet');
  protected readonly stateOpen = signal(false);
  protected readonly windowState = signal<OgeWindowState>('normal');
  protected readonly lockMaximize = signal(false);
  protected readonly placedOpen = signal(false);
  protected readonly placement = signal<OgeWindowPlacement>('bottom-end');
  protected readonly contained = signal(true);
  protected readonly eventsOpen = signal(false);
  protected readonly events = signal<readonly string[]>([]);

  protected openStack(): void {
    this.inspectorOpen.set(true);
    this.layersOpen.set(true);
    this.consoleOpen.set(true);
  }

  protected onMoved(event: OgeWindowMovedEvent): void {
    this.dragStatus.set(`moved to ${event.x}, ${event.y} (${event.source})`);
  }

  protected onResized(event: OgeWindowResizedEvent): void {
    this.dragStatus.set(
      `resized to ${event.width} × ${event.height} (${event.source})`,
    );
  }

  protected onStateChanging(event: OgeWindowStateChangingEvent): void {
    if (event.state === 'maximized' && this.lockMaximize()) event.cancel = true;
  }

  protected openPlaced(placement: OgeWindowPlacement): void {
    this.placement.set(placement);
    this.placedOpen.set(true);
  }

  protected onClosing(event: OgeWindowClosingEvent): void {
    this.log(`closing (${event.reason})`);
  }

  protected onClosed(event: OgeWindowClosedEvent): void {
    this.log(`closed (${event.reason})`);
  }

  protected log(entry: string): void {
    this.events.set([...this.events(), entry].slice(-8));
  }

  protected readonly basicSnippet = WINDOW_BASIC_SNIPPET;
  protected readonly stackingSnippet = WINDOW_STACKING_SNIPPET;
  protected readonly dragSnippet = WINDOW_DRAG_SNIPPET;
  protected readonly stateSnippet = WINDOW_STATE_SNIPPET;
  protected readonly placementSnippet = WINDOW_PLACEMENT_SNIPPET;
  protected readonly eventsSnippet = WINDOW_EVENTS_SNIPPET;
}
