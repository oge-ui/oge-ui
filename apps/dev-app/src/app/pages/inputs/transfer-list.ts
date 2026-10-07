import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  OgeListBoxItemTemplate,
  OgeTransferList,
  type OgeTransferListMovingEvent,
} from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_INPUTS_TRANSFER_LIST_SECTIONS,
  ReactInputsTransferListDemos,
} from '../react-inputs/transfer-list';
import { DEMO_PERMISSIONS, type DemoPermission } from './list-box-data';
import {
  BASIC_SNIPPET,
  CANCEL_SNIPPET,
  FORMS_SNIPPET,
  REORDER_SNIPPET,
  SEARCH_SNIPPET,
  TEMPLATES_SNIPPET,
} from './transfer-list-snippets';

const SECTIONS = [
  'Getting started',
  'Search and check boxes',
  'Groups and templates',
  'Cancelable moves',
  'Inside a form',
  'Reordering',
] as const;

@Component({
  selector: 'app-inputs-transfer-list',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeTransferList,
    OgeListBoxItemTemplate,
    ReactiveFormsModule,
    ReactInputsTransferListDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Transfer List"
      category="Inputs"
      categoryLink="/components/inputs"
      [chips]="['dual list box', 'drag & drop', 'keyboard moves', 'forms']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeTransferList /&gt;</code> from
          <code>&#64;oge-ui/react-inputs</code> is a dual list box: an
          "available" and a "selected" <code>&lt;OgeListBox&gt;</code> with four
          move buttons between them. Buttons, Ctrl+arrow shortcuts and a pointer
          drag between the lists all run one move —
          <code>onMoving</code> (cancelable), the commit, a polite announcement
          and <code>onMoved</code>. The value is the target side's values in
          arrival order.
        </p>
      } @else {
        <p>
          A dual list box — Kendo's ListBox toolbar, PrimeNG's PickList — as one
          form editor. Both sides are multiple-selection
          <code>oge-list-box</code>es with every listbox key; the four buttons
          move the selection or everything a side shows, <kbd>Ctrl</kbd>+<kbd
            >→</kbd
          >
          / <kbd>←</kbd> on a focused list moves its selection toward the other
          list (with <kbd>Shift</kbd>: everything — mirrored in RTL, advertised
          with <code>aria-keyshortcuts</code>), and options drag between the
          lists with mouse, pen or touch.
        </p>
        <p>
          Every path runs one move: the cancelable <code>moving</code>
          pre-event, the commit, a polite live announcement, then
          <code>moved</code>. The value is the target side's
          <code>valueExpr</code> results in arrival order; works with
          <code>[(value)]</code>, <code>[formField]</code> and
          <code>formControl</code>/<code>ngModel</code>.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-transfer-list-demos />
    } @else {
      <app-demo-card
        [chips]="['value = target side', 'buttons', 'Ctrl+arrows', 'drag']"
        heading="Getting started"
        description="Select options and use the buttons, press <kbd>Ctrl</kbd>+<kbd>→</kbd> / <kbd>Ctrl</kbd>+<kbd>←</kbd> on a focused list (add <kbd>Shift</kbd> to move everything), or drag an option onto the other list. The locked permission stays where it is."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-transfer-list
          label="Role permissions"
          [items]="permissions"
          displayExpr="name"
          valueExpr="id"
          disabledExpr="locked"
          targetTitle="Granted"
          [height]="240"
          [(value)]="granted"
        />
        <p class="mt-3 text-sm">
          Value: <code data-testid="transfer-value">{{ show(granted()) }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['searchEnabled', 'showCheckBoxes']"
        heading="Search and check boxes"
        description="A search field above each list; the move-all buttons move what the list currently shows. Check glyphs make the multiple selection explicit."
        [code]="searchSnippet"
        language="ts"
      >
        <oge-transfer-list
          [items]="permissions"
          displayExpr="name"
          valueExpr="id"
          [searchEnabled]="true"
          [showCheckBoxes]="true"
          [height]="220"
          [(value)]="searched"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['groupBy', 'ogeListBoxItemTemplate']"
        heading="Groups and templates"
        description="<code>groupBy</code> and the list box templates (<code>[ogeListBoxItemTemplate]</code>, <code>[ogeListBoxGroupTemplate]</code>) apply to both lists."
        [code]="templatesSnippet"
        language="ts"
      >
        <oge-transfer-list
          [items]="permissions"
          displayExpr="name"
          valueExpr="id"
          groupBy="area"
          [height]="280"
          [(value)]="grouped"
        >
          <ng-template ogeListBoxItemTemplate let-permission>
            <span class="inline-flex w-full items-center justify-between gap-2">
              <span>{{ permission.name }}</span>
              <code class="text-xs text-(--oge-muted-color)">{{
                permission.id
              }}</code>
            </span>
          </ng-template>
        </oge-transfer-list>
      </app-demo-card>

      <app-demo-card
        [chips]="['moving', 'cancel', 'moved']"
        heading="Cancelable moves"
        description="<code>moving</code> fires before every move with <code>cause</code> (<code>'button' | 'keyboard' | 'drag'</code>) — set <code>cancel</code> to veto it. Here the target side holds at most three permissions."
        [code]="cancelSnippet"
        language="ts"
      >
        <oge-transfer-list
          [items]="permissions"
          displayExpr="name"
          valueExpr="id"
          targetTitle="Granted (max 3)"
          [height]="240"
          [(value)]="limited"
          (moving)="limit($event)"
          (moved)="log.set($event.values.length + ' moved by ' + $event.cause)"
        />
        <p class="mt-3 text-sm">
          Log: <code data-testid="transfer-log">{{ log() || '—' }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['formControl', 'Validators.required']"
        heading="Inside a form"
        description="A <code>FormValueControl</code> and a ControlValueAccessor — the bound control holds the target side's values."
        [code]="formsSnippet"
        language="ts"
      >
        <oge-transfer-list
          label="Granted permissions"
          hint="Grant at least one"
          [items]="permissions"
          displayExpr="name"
          valueExpr="id"
          [height]="200"
          [formControl]="formGranted"
        />
        <p class="mt-3 text-sm">
          Valid: <code>{{ formGranted.valid }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['allowReordering', 'Alt+↑/↓', 'drag', 'reordered']"
        heading="Reordering"
        description="<code>allowReordering</code> opens one or both lists to reordering — <code>'target'</code> here, so the granted permissions can be put in priority order. Alt+↑/↓ moves the active option; one drag reorders when dropped inside its own list and still moves when dropped on the other. The target&#39;s order is the value&#39;s order, so a reorder commits a new value."
        [code]="reorderSnippet"
        language="ts"
      >
        <oge-transfer-list
          label="Escalation order"
          [items]="permissions"
          displayExpr="name"
          valueExpr="id"
          targetTitle="Priority"
          allowReordering="target"
          [height]="240"
          [(value)]="priority"
        />
        <p class="mt-3 text-sm">
          Value:
          <code data-testid="transfer-priority">{{ show(priority()) }}</code>
        </p>
      </app-demo-card>
    }
  `,
})
export class InputsTransferListPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_TRANSFER_LIST_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly searchSnippet = SEARCH_SNIPPET;
  protected readonly templatesSnippet = TEMPLATES_SNIPPET;
  protected readonly cancelSnippet = CANCEL_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;
  protected readonly reorderSnippet = REORDER_SNIPPET;
  protected readonly priority = signal<readonly unknown[]>([
    'orders.refund',
    'users.invite',
    'reports.export',
  ]);

  protected readonly permissions = DEMO_PERMISSIONS;
  protected readonly granted = signal<readonly unknown[]>(['orders.read']);
  protected readonly searched = signal<readonly unknown[]>([]);
  protected readonly grouped = signal<readonly unknown[]>(['reports.read']);
  protected readonly limited = signal<readonly unknown[]>([]);
  protected readonly log = signal('');
  protected readonly formGranted = new FormControl<string[]>(
    [],
    Validators.required,
  );

  protected show(value: readonly unknown[]): string {
    return JSON.stringify(value);
  }

  protected limit(event: OgeTransferListMovingEvent<DemoPermission>): void {
    if (
      event.to === 'target' &&
      this.limited().length + event.values.length > 3
    ) {
      event.cancel = true;
      this.log.set('Vetoed: at most 3 permissions');
    }
  }
}
