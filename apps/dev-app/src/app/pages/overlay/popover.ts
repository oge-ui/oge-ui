import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeButton } from '@oge-ui/buttons';
import {
  OgePopover,
  OgePopoverFooter,
  OgePopoverTrigger,
  type OgePopoverClosingEvent,
} from '@oge-ui/overlay';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_OVERLAY_POPOVER_SECTIONS,
  ReactOverlayPopoverDemos,
} from '../react-overlay/popover';
import {
  POPOVER_BASIC_SNIPPET,
  POPOVER_EVENTS_SNIPPET,
  POPOVER_MODAL_SNIPPET,
  POPOVER_PLACEMENT_SNIPPET,
  POPOVER_TRIGGERS_SNIPPET,
} from './popover-snippets';

const SECTIONS = [
  'Basics',
  'Triggers',
  'Placement & arrow',
  'Modal vs non-modal',
  'Events & imperative API',
] as const;

const FIELD_CLASS =
  'mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900';

@Component({
  selector: 'app-overlay-popover',
  imports: [
    OgeButton,
    OgePopover,
    OgePopoverFooter,
    OgePopoverTrigger,
    DemoCard,
    DocHeader,
    PageToc,
    ReactOverlayPopoverDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Popover"
      category="Overlay"
      categoryLink="/components/overlay"
      [chips]="
        fw.isReact()
          ? ['OgePopover', 'trigger', 'showOn', 'modal', 'arrow']
          : ['oge-popover', '[ogePopover]', 'showOn', 'modal', 'arrow']
      "
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgePopover&gt;</code> is an anchored, interactive panel — a
          title, rich body, footer actions, a close button and an optional
          callout arrow — opened from its <code>trigger</code> by click, hover,
          focus or code. It is a non-modal or modal <code>role="dialog"</code>
          rendered into the document body, and it runs the same popover and
          positioning machines as the Angular component.
        </p>
      } @else {
        <p>
          <code>&lt;oge-popover&gt;</code> is an anchored, interactive panel — a
          title, rich body, footer actions, a close button and an optional
          callout arrow — opened from any element carrying
          <code>[ogePopover]</code> by click, hover, focus or code. It is a
          non-modal or modal <code>role="dialog"</code> rendered into the
          document body.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-overlay-popover-demos />
    } @else {
      <app-demo-card
        [chips]="['[ogePopover]', 'title', '*ogePopoverFooter', 'arrow']"
        heading="Basics"
        description='Declare an <code>&amp;lt;oge-popover&amp;gt;</code> with a template reference and point <code>[ogePopover]</code> at it from any element. The trigger becomes an APG disclosure — <code>aria-haspopup="dialog"</code>, <code>aria-expanded</code> and <code>aria-controls</code> — and the panel is a <code>role="dialog"</code> labelled by its title. <code>*ogePopoverFooter</code> receives a close function for the action bar; Escape, an outside click and the ✕ close it too.'
        [code]="basicSnippet"
        language="ts"
      >
        <div
          class="flex flex-wrap items-center gap-3"
          data-testid="popover-basics"
        >
          <oge-button text="Share" [ogePopover]="share" />
          <oge-popover #share title="Share report" [arrow]="true">
            <p>Anyone with the link can view this report.</p>
            <div *ogePopoverFooter="let close">
              <oge-button text="Done" stylingMode="text" (clicked)="close()" />
              <oge-button
                text="Copy link"
                (clicked)="lastEvent.set('link copied'); close()"
              />
            </div>
          </oge-popover>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['showOn', 'click', 'hover', 'focus', 'manual']"
        heading="Triggers"
        description='<code>showOn</code> picks what opens it: <code>click</code> (the default disclosure), <code>hover</code> — a short dwell, then a grace period that lets the pointer travel into the panel, and keyboard focus opens it too so the content is never pointer-only — <code>focus</code>, or <code>manual</code> for popovers driven only from code (<code>#ref="ogePopover"</code> → <code>open()</code> / <code>close()</code> / <code>toggle()</code>).'
        [code]="triggersSnippet"
        language="ts"
      >
        <div
          class="flex flex-wrap items-center gap-3"
          data-testid="popover-triggers"
        >
          <oge-button
            text="Click"
            stylingMode="outlined"
            [ogePopover]="click"
          />
          <oge-popover #click title="Click">Toggles on activation.</oge-popover>

          <oge-button
            text="Hover"
            stylingMode="outlined"
            [ogePopover]="hover"
          />
          <oge-popover
            #hover
            showOn="hover"
            [showCloseButton]="false"
            ariaLabel="Hover help"
          >
            Move into me — I stay open.
            <a
              href="#hover"
              class="text-indigo-600 underline dark:text-indigo-400"
              >Links work</a
            >.
          </oge-popover>

          <input
            class="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            aria-label="Coupon"
            placeholder="Coupon code"
            [ogePopover]="focus"
          />
          <oge-popover
            #focus
            showOn="focus"
            [showCloseButton]="false"
            ariaLabel="Coupon help"
          >
            Codes are case-insensitive.
          </oge-popover>

          <oge-button
            text="Manual"
            stylingMode="outlined"
            [ogePopover]="manual"
            (clicked)="manual.toggle()"
          />
          <oge-popover #manual showOn="manual" title="Manual">
            Opened from code.
          </oge-popover>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['placement', 'arrow', 'width / maxWidth']"
        heading="Placement & arrow"
        description='<code>placement</code> prefers a side and alignment (<code>top</code>, <code>right-start</code>, <code>bottom-end</code>…) and flips when the viewport runs out of room, RTL-aware. <code>[arrow]="true"</code> draws a callout pointer on the edge facing the trigger; its geometry is shared with the tooltip and keeps pointing at the trigger after the viewport clamp shifted the panel. <code>width</code> / <code>maxWidth</code> size the content box.'
        [code]="placementSnippet"
        language="ts"
      >
        <div
          class="flex flex-wrap items-center gap-3"
          data-testid="popover-placement"
        >
          @for (p of placements; track p.placement) {
            <oge-button
              [text]="p.label"
              stylingMode="outlined"
              [ogePopover]="placed"
            />
            <oge-popover
              #placed
              [placement]="p.placement"
              [arrow]="true"
              [width]="220"
              [title]="p.label"
            >
              Prefers {{ p.placement }}; flips when there is no room.
            </oge-popover>
          }
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['modal', 'aria-modal', 'Tab order', 'initialFocus']"
        heading="Modal vs non-modal"
        description='Non-modal (the default) follows the APG disclosure: focus stays on the trigger, <kbd>Tab</kbd> moves into the panel and on past it — the panel is rendered into the body, yet focus order matches the visual order — and leaving it closes it. <code>[modal]="true"</code> makes it an <code>aria-modal</code> dialog: focus moves inside (<code>initialFocus</code>), <kbd>Tab</kbd> is trapped, and focus returns to the trigger on close.'
        [code]="modalSnippet"
        language="ts"
      >
        <div
          class="flex flex-wrap items-center gap-3"
          data-testid="popover-modal"
        >
          <oge-button
            text="Filter"
            stylingMode="outlined"
            [ogePopover]="filter"
          />
          <oge-popover #filter title="Filter">
            <label class="block text-sm"
              >Contains
              <input [class]="fieldClass" data-testid="filter-input" />
            </label>
          </oge-popover>
          <button
            type="button"
            class="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
            data-testid="after-filter"
          >
            Next control
          </button>

          <oge-button text="Rename" [ogePopover]="rename" />
          <oge-popover #rename title="Rename file" [modal]="true">
            <label class="block text-sm"
              >Name
              <input [class]="fieldClass" value="report.xlsx" />
            </label>
            <div *ogePopoverFooter="let close">
              <oge-button
                text="Cancel"
                stylingMode="text"
                (clicked)="close()"
              />
              <oge-button text="Save" (clicked)="close()" />
            </div>
          </oge-popover>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          '[(visible)]',
          'opening / closing',
          'opened / closed',
          'open() / close()',
        ]"
        heading="Events & imperative API"
        description="<code>[(visible)]</code> is the two-way open state; writes from code run the same pipeline. <code>opening</code> and <code>closing</code> are cancelable and carry the reason (<code>click</code>, <code>hover</code>, <code>focus</code>, <code>api</code> / <code>trigger</code>, <code>pointerLeave</code>, <code>focusOut</code>, <code>outside</code>, <code>escape</code>, <code>closeButton</code>); <code>opened</code> and <code>closed</code> follow. Here “Pin” vetoes every close except the ✕."
        [code]="eventsSnippet"
        language="ts"
      >
        <div
          class="flex flex-wrap items-center gap-3"
          data-testid="popover-events"
        >
          <oge-button text="Details" [ogePopover]="details" />
          <oge-button
            text="Open from code"
            stylingMode="outlined"
            (clicked)="details.open()"
          />
          <label class="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              [checked]="pinned()"
              (change)="pinned.set(!pinned())"
            />
            Pin
          </label>
          <oge-popover
            #details
            title="Order #1042"
            [(visible)]="visible"
            (opened)="lastEvent.set('opened: ' + $event.reason)"
            (closing)="guard($event)"
            (closed)="lastEvent.set('closed: ' + $event.reason)"
          >
            Shipped today — arrives Thursday.
          </oge-popover>
          <span class="text-sm opacity-70" data-testid="popover-last-event"
            >visible: {{ visible() }} · last: {{ lastEvent() }}</span
          >
        </div>
      </app-demo-card>
    }

    <h3>Notes</h3>
    <ul>
      <li>
        A popover is interactive; a tooltip is not. Use a tooltip for a short
        description of its trigger, a popover for content people act on.
      </li>
      <li>
        Escape goes through the shared overlay stack: a select box opened inside
        a popover closes first, then the popover.
      </li>
      @if (fw.isReact()) {
        <li>
          The <code>trigger</code> element's focusable control carries the ARIA
          (the inner <code>&lt;button&gt;</code> of an
          <code>&lt;OgeButton&gt;</code>); without a trigger, pass
          <code>anchor</code> for popovers opened from code.
        </li>
      } @else {
        <li>
          The trigger's focusable control carries the ARIA (the inner
          <code>&lt;button&gt;</code> of an <code>oge-button</code>); without a
          trigger, bind <code>[anchor]</code> for popovers opened from code.
        </li>
      }
    </ul>
  `,
})
export class OverlayPopoverPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_OVERLAY_POPOVER_SECTIONS;
  protected readonly fieldClass = FIELD_CLASS;
  protected readonly visible = signal(false);
  protected readonly pinned = signal(false);
  protected readonly lastEvent = signal('—');
  protected readonly placements = [
    { label: 'Top', placement: 'top' as const },
    { label: 'Right start', placement: 'right-start' as const },
    { label: 'Bottom end', placement: 'bottom-end' as const },
    { label: 'Left', placement: 'left' as const },
  ];

  protected guard(event: OgePopoverClosingEvent): void {
    event.cancel = this.pinned() && event.reason !== 'closeButton';
  }

  protected readonly basicSnippet = POPOVER_BASIC_SNIPPET;
  protected readonly triggersSnippet = POPOVER_TRIGGERS_SNIPPET;
  protected readonly placementSnippet = POPOVER_PLACEMENT_SNIPPET;
  protected readonly modalSnippet = POPOVER_MODAL_SNIPPET;
  protected readonly eventsSnippet = POPOVER_EVENTS_SNIPPET;
}
