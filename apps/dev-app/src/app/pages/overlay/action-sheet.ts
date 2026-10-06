import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  OgeActionSheet,
  OgeActionSheetItemTemplate,
  type OgeActionSheetClosingEvent,
  type OgeActionSheetItemClickEvent,
} from '@oge-ui/overlay';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_OVERLAY_ACTION_SHEET_SECTIONS,
  ReactOverlayActionSheetDemos,
} from '../react-overlay/action-sheet';
import {
  ACTION_SHEET_FILE_ACTIONS,
  ACTION_SHEET_PHOTO_ACTIONS,
} from './action-sheet-demo-data';
import {
  ACTION_SHEET_BASIC_SNIPPET,
  ACTION_SHEET_GROUPS_SNIPPET,
  ACTION_SHEET_PROMISE_SNIPPET,
} from './action-sheet-snippets';

const SECTIONS = [
  'Basics',
  'Groups, disabled actions & templates',
  'Promise API & events',
] as const;

const BUTTON =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700';

@Component({
  selector: 'app-overlay-action-sheet',
  imports: [
    OgeActionSheet,
    OgeActionSheetItemTemplate,
    DemoCard,
    DocHeader,
    PageToc,
    ReactOverlayActionSheetDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Action Sheet"
      category="Overlay"
      categoryLink="/components/overlay"
      [chips]="['bottom sheet', 'APG menu', 'swipe to close', 'safe areas']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeActionSheet&gt;</code> from
          <code>&#64;oge-ui/react-overlay</code> is the mobile list of actions
          that slides up from the bottom edge — the same markup, stylesheet and
          modal machine as the Angular component.
        </p>
      } @else {
        <p>
          <code>oge-action-sheet</code> is the mobile list of actions that
          slides up from the bottom edge — "Share, Edit, Delete, Cancel".
        </p>
      }
      <p>
        It is a modal <code>role="dialog"</code> labelled by its title and moved
        to <code>&lt;body&gt;</code> while open, with the overlay family's
        shared behaviour: focus trap, ref-counted scroll lock, an inert
        background, the Escape stack, backdrop and swipe-down dismissal and
        focus restore. The actions are a WAI-ARIA APG <strong>menu</strong> with
        one tab stop; Cancel is a separate button. On phones the sheet spans the
        screen and pads its bottom edge with
        <code>env(safe-area-inset-bottom)</code>; on wider screens it floats.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-overlay-action-sheet-demos />
    } @else {
      <app-demo-card
        [chips]="['open()', 'title', 'description', 'items', 'itemClick']"
        heading="Basics"
        description="Each action has a label, an optional icon (SVG path data) and an optional description; <code>destructive</code> paints it in the danger colour — say it in the text too. ↑/↓ wrap, Home / End jump, Enter or Space choose. Choosing an action closes the sheet and focus returns to the button that opened it."
        [code]="basicSnippet"
        language="ts"
      >
        <button type="button" [class]="button" (click)="photo.open()">
          Photo actions
        </button>
        <oge-action-sheet
          #photo
          title="Photo"
          description="Taken on 3 October in Göreme"
          [items]="photoActions"
          (itemClick)="last.set($event.item.text)"
        />
        <p class="mt-2 text-sm" data-testid="action-sheet-last">
          Last action: {{ last() }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['group: bottom', 'disabled', 'ogeActionSheetItemTemplate']"
        heading="Groups, disabled actions & templates"
        description="<code>group: 'bottom'</code> actions render after a divider. Disabled actions stay focusable, so a screen reader user learns they exist, but never run. <code>[ogeActionSheetItemTemplate]</code> replaces the icon and text; the menu item button, its keyboard and its state stay with the sheet."
        [code]="groupsSnippet"
        language="ts"
      >
        <button type="button" [class]="button" (click)="file.toggle()">
          File actions
        </button>
        <oge-action-sheet
          #file
          title="Quarterly report.pdf"
          [items]="fileActions"
        >
          <ng-template ogeActionSheetItemTemplate let-item>
            <span class="grid">
              <strong class="font-medium">{{ item.text }}</strong>
              @if (item.description) {
                <small class="text-xs opacity-80">{{ item.description }}</small>
              }
            </span>
          </ng-template>
        </oge-action-sheet>
      </app-demo-card>

      <app-demo-card
        [chips]="['await open()', 'keepOpen', 'closing', 'cancel']"
        heading="Promise API & events"
        description="<code>open()</code> resolves with the chosen action, or <code>null</code> when the sheet was dismissed. <code>itemClick</code> can set <code>keepOpen</code>, and the cancelable <code>closing</code> event — with its <code>reason</code>: action, cancel, escape, backdrop, swipe or api — can veto a close."
        [code]="promiseSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <button type="button" [class]="button" (click)="choose()">
            Choose a layout
          </button>
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              [checked]="lock()"
              (change)="lock.set(!lock())"
            />
            Veto backdrop closing
          </label>
        </div>
        <oge-action-sheet
          #layout
          title="Layout"
          [items]="layouts"
          (itemClick)="onItem($event)"
          (closing)="onClosing($event)"
        />
        <p class="mt-2 text-sm" data-testid="action-sheet-result">
          {{ result() }}
        </p>
      </app-demo-card>
    }
  `,
})
export class OverlayActionSheetPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_OVERLAY_ACTION_SHEET_SECTIONS;
  protected readonly basicSnippet = ACTION_SHEET_BASIC_SNIPPET;
  protected readonly groupsSnippet = ACTION_SHEET_GROUPS_SNIPPET;
  protected readonly promiseSnippet = ACTION_SHEET_PROMISE_SNIPPET;
  protected readonly button = BUTTON;

  protected readonly photoActions = ACTION_SHEET_PHOTO_ACTIONS;
  protected readonly fileActions = ACTION_SHEET_FILE_ACTIONS;
  protected readonly layouts = [
    { key: 'grid', text: 'Grid' },
    { key: 'list', text: 'List' },
    { key: 'preview', text: 'Preview (keeps the sheet open)' },
  ];
  protected readonly last = signal('none');
  protected readonly result = signal('Nothing chosen yet');
  protected readonly lock = signal(false);
  private readonly layout = viewChild.required<OgeActionSheet>('layout');

  protected async choose(): Promise<void> {
    const chosen = await this.layout().open();
    this.result.set(chosen ? `Chose ${chosen.text}` : 'Dismissed');
  }

  protected onItem(event: OgeActionSheetItemClickEvent): void {
    event.keepOpen = event.item.key === 'preview';
  }

  protected onClosing(event: OgeActionSheetClosingEvent): void {
    event.cancel = this.lock() && event.reason === 'backdrop';
  }
}
