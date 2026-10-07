import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  contentChild,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  beginPointerDragDrop,
  choiceIncludes,
  ogeIsRtl,
  ogeSelectSearchFilter,
  ogeSelectSearchStrings,
  ogeTransferAnnouncement,
  ogeTransferCountText,
  ogeTransferDropTarget,
  ogeTransferKeyCommand,
  ogeTransferKeyShortcuts,
  ogeTransferMovableValues,
  ogeTransferMove,
  ogeTransferOpposite,
  ogeTransferReorderLine,
  ogeTransferReorderSource,
  ogeTransferReorderTarget,
  ogeTransferReorderable,
  ogeTransferSplit,
  prepareTouchDrag,
  resolveDisabled,
  resolveValue,
  type OgeSelectDisabledExpr,
  type OgeSelectDisplayExpr,
  type OgeSelectGroupExpr,
  type OgeSelectSearchExpr,
  type OgeSelectSearchMode,
  type OgeSelectValueExpr,
  type OgeTransferListMoveCause,
  type OgeTransferListDropTarget,
  type OgeTransferListMoveCommand,
  type OgeTransferListReorderSides,
  type OgeTransferListSide,
} from '@oge-ui/behavior';
import { OgeControlBase } from '@oge-ui/inputs/field';
import {
  OgeListBox,
  OgeListBoxGroupTemplate,
  OgeListBoxItemTemplate,
  type OgeListBoxGroupTemplateContext,
  type OgeListBoxItemTemplateContext,
  type OgeListBoxReorderedEvent,
  type OgeListBoxReorderingEvent,
} from '@oge-ui/inputs/list-box';
import { OgeLiveAnnouncer } from '@oge-ui/overlay';
import type {
  OgeTransferListMovedEvent,
  OgeTransferListMovingEvent,
  OgeTransferListReorderedEvent,
  OgeTransferListReorderingEvent,
} from './transfer-list-types';

/**
 * A dual list box — "available" and "selected" lists with move buttons
 * between them (Kendo ListBox toolbar, PrimeNG PickList, Syncfusion dual
 * list box) as one form editor:
 *
 * ```html
 * <oge-transfer-list
 *   [items]="permissions"
 *   displayExpr="name"
 *   valueExpr="id"
 *   sourceTitle="Available"
 *   targetTitle="Granted"
 *   [searchEnabled]="true"
 *   [(value)]="granted"
 * />
 * ```
 *
 * The **value is the target side**: the moved items' `valueExpr` results in
 * the order they arrived (the source keeps items order). Both sides are
 * multiple-selection `oge-list-box`es with every listbox key; the four
 * buttons move the selection or everything a side shows (after its search),
 * Ctrl/⌘+→ / ← on a focused list moves its selection toward the other list
 * (with Shift: everything; visual arrows, mirrored in RTL, advertised with
 * `aria-keyshortcuts`), and options drag between the lists on the shared
 * pointer machine (mouse, pen, touch after a long press — Escape cancels).
 * All three paths run one move: the cancelable `moving` pre-event, the
 * commit, a polite announcement through the shared live announcer, then
 * `moved`. Templates (`[ogeListBoxItemTemplate]`, `[ogeListBoxGroupTemplate]`)
 * apply to both lists. Works standalone via `[(value)]`, with Signal Forms
 * via `[formField]` and with reactive/template forms via
 * `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-transfer-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeListBox],
  host: {
    class: 'oge-transfer-list',
    role: 'group',
    '[class.oge-transfer-list-invalid]': 'showError()',
    '[class.oge-transfer-list-readonly]': 'readonly()',
    '[class.oge-transfer-list-dragging]':
      'dropSide() !== null || reorderLine() !== null',
    '[attr.aria-labelledby]': 'label() ? labelId : null',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-disabled]': "effectiveDisabled() ? 'true' : null",
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    @if (label()) {
      <span class="oge-transfer-list-label" [id]="labelId"
        >{{ label() }}
        @if (required()) {
          <span class="oge-transfer-list-required" aria-hidden="true">*</span>
        }
      </span>
    }
    <div class="oge-transfer-list-body">
      <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -- delegation only: the pane catches pointerdown (drag start) and keydown (move shortcuts) from the focusable list box inside it -->
      <div
        class="oge-transfer-list-pane"
        data-oge-transfer-side="source"
        [class.oge-transfer-list-pane-drop]="dropSide() === 'source'"
        (input)="onPaneInput($event, 'source')"
        (pointerdown)="onPointerDown($event, 'source')"
        (keydown)="onPaneKeydown($event, 'source')"
      >
        <div class="oge-transfer-list-header">
          <span class="oge-transfer-list-title" [id]="titleId('source')">{{
            sourceTitleText()
          }}</span>
          <span class="oge-transfer-list-count">{{
            countText(split().source.length)
          }}</span>
        </div>
        <oge-list-box
          #sourceList
          class="oge-transfer-list-list"
          selectionMode="multiple"
          [items]="split().source"
          [displayExpr]="displayExpr()"
          [valueExpr]="valueExpr()"
          [disabledExpr]="disabledExpr()"
          [groupBy]="groupBy()"
          [showCheckBoxes]="showCheckBoxes()"
          [searchEnabled]="searchEnabled()"
          [searchExpr]="searchExpr()"
          [searchMode]="searchMode()"
          [height]="height()"
          [noDataText]="noDataText()"
          [labelledBy]="titleId('source')"
          [keyShortcuts]="shortcuts().source"
          [allowReordering]="reorderable('source')"
          [itemTemplate]="resolvedItemTemplate()"
          [groupTemplate]="resolvedGroupTemplate()"
          [disabled]="effectiveDisabled()"
          [readonly]="readonly()"
          [size]="size()"
          [messages]="messages()"
          [tabIndex]="tabIndex()"
          [(value)]="sourceSelection"
          (reordering)="onListReordering('source', $event)"
          (reordered)="onListReordered('source', $event)"
        />
        @if (reorderLine(); as line) {
          @if (line.side === 'source') {
            <div
              class="oge-transfer-list-reorder-line"
              aria-hidden="true"
              [style.top.px]="line.top"
              [style.left.px]="line.left"
              [style.width.px]="line.width"
            ></div>
          }
        }
      </div>
      <div
        class="oge-transfer-list-actions"
        role="group"
        [attr.aria-label]="msg().transferActionsLabel"
      >
        <button
          type="button"
          class="oge-transfer-list-action oge-transfer-list-to-target"
          [disabled]="!canMove().selectedToTarget"
          [attr.aria-label]="msg().transferAddSelected"
          [attr.title]="msg().transferAddSelected"
          (click)="
            moveCommand({ scope: 'selected', from: 'source' }, 'button', $event)
          "
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6 3.5 10.5 8 6 12.5" />
          </svg>
        </button>
        <button
          type="button"
          class="oge-transfer-list-action oge-transfer-list-to-target"
          [disabled]="!canMove().allToTarget"
          [attr.aria-label]="msg().transferAddAll"
          [attr.title]="msg().transferAddAll"
          (click)="
            moveCommand({ scope: 'all', from: 'source' }, 'button', $event)
          "
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 3.5 8 8l-4.5 4.5M8.5 3.5 13 8l-4.5 4.5" />
          </svg>
        </button>
        <button
          type="button"
          class="oge-transfer-list-action oge-transfer-list-to-source"
          [disabled]="!canMove().selectedToSource"
          [attr.aria-label]="msg().transferRemoveSelected"
          [attr.title]="msg().transferRemoveSelected"
          (click)="
            moveCommand({ scope: 'selected', from: 'target' }, 'button', $event)
          "
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" />
          </svg>
        </button>
        <button
          type="button"
          class="oge-transfer-list-action oge-transfer-list-to-source"
          [disabled]="!canMove().allToSource"
          [attr.aria-label]="msg().transferRemoveAll"
          [attr.title]="msg().transferRemoveAll"
          (click)="
            moveCommand({ scope: 'all', from: 'target' }, 'button', $event)
          "
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M12.5 3.5 8 8l4.5 4.5M7.5 3.5 3 8l4.5 4.5" />
          </svg>
        </button>
      </div>
      <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -- delegation only: the pane catches pointerdown (drag start) and keydown (move shortcuts) from the focusable list box inside it -->
      <div
        class="oge-transfer-list-pane"
        data-oge-transfer-side="target"
        [class.oge-transfer-list-pane-drop]="dropSide() === 'target'"
        (input)="onPaneInput($event, 'target')"
        (pointerdown)="onPointerDown($event, 'target')"
        (keydown)="onPaneKeydown($event, 'target')"
      >
        <div class="oge-transfer-list-header">
          <span class="oge-transfer-list-title" [id]="titleId('target')">{{
            targetTitleText()
          }}</span>
          <span class="oge-transfer-list-count">{{
            countText(split().target.length)
          }}</span>
        </div>
        <oge-list-box
          #targetList
          class="oge-transfer-list-list"
          selectionMode="multiple"
          [items]="split().target"
          [displayExpr]="displayExpr()"
          [valueExpr]="valueExpr()"
          [disabledExpr]="disabledExpr()"
          [groupBy]="groupBy()"
          [showCheckBoxes]="showCheckBoxes()"
          [searchEnabled]="searchEnabled()"
          [searchExpr]="searchExpr()"
          [searchMode]="searchMode()"
          [height]="height()"
          [noDataText]="noDataText()"
          [labelledBy]="titleId('target')"
          [keyShortcuts]="shortcuts().target"
          [allowReordering]="reorderable('target')"
          [itemTemplate]="resolvedItemTemplate()"
          [groupTemplate]="resolvedGroupTemplate()"
          [disabled]="effectiveDisabled()"
          [readonly]="readonly()"
          [size]="size()"
          [messages]="messages()"
          [tabIndex]="tabIndex()"
          [(value)]="targetSelection"
          (reordering)="onListReordering('target', $event)"
          (reordered)="onListReordered('target', $event)"
        />
        @if (reorderLine(); as line) {
          @if (line.side === 'target') {
            <div
              class="oge-transfer-list-reorder-line"
              aria-hidden="true"
              [style.top.px]="line.top"
              [style.left.px]="line.left"
              [style.width.px]="line.width"
            ></div>
          }
        }
      </div>
    </div>
    @if (subscript(); as sub) {
      <div
        class="oge-transfer-list-subscript"
        [class.oge-transfer-list-error]="sub.error"
        [id]="sub.id"
      >
        {{ sub.text }}
      </div>
    }
  `,
  styleUrl: './transfer-list.scss',
})
export class OgeTransferList<TItem = unknown>
  extends OgeControlBase<readonly unknown[]>
  implements FormValueControl<readonly unknown[]>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly announcer = inject(OgeLiveAnnouncer);

  /** The target side's values (`valueExpr` results), in arrival order — two-way. */
  readonly value = model<readonly unknown[]>([]);
  /** Every item; those not in `value` form the source list. */
  readonly items = input<readonly TItem[]>([]);
  /** Item → option text. Omitted, the item itself is stringified. */
  readonly displayExpr = input<OgeSelectDisplayExpr<TItem> | undefined>(
    undefined,
  );
  /** Item → value. Omitted, the whole item is the value. */
  readonly valueExpr = input<OgeSelectValueExpr<TItem> | undefined>(undefined);
  /** Items that cannot be selected or moved (they stay on their side). */
  readonly disabledExpr = input<OgeSelectDisabledExpr<TItem> | undefined>(
    undefined,
  );
  /** Groups both lists' options under headers. */
  readonly groupBy = input<OgeSelectGroupExpr<TItem> | undefined>(undefined);
  /** Title of the source list; `undefined` = messages `transferSourceTitle`. */
  readonly sourceTitle = input<string | undefined>(undefined);
  /** Title of the target list; `undefined` = messages `transferTargetTitle`. */
  readonly targetTitle = input<string | undefined>(undefined);
  /** A search field above each list. */
  readonly searchEnabled = input(false);
  /** Which text the search matches; omitted, the display text. */
  readonly searchExpr = input<OgeSelectSearchExpr<TItem> | undefined>(
    undefined,
  );
  /** `'contains'` (default) or `'startswith'` matching. */
  readonly searchMode = input<OgeSelectSearchMode>('contains');
  /** Check glyphs on the options of both lists. */
  readonly showCheckBoxes = input(false);
  /** Maximum height of each list — px number or CSS length. */
  readonly height = input<number | string | undefined>(undefined);
  /** Text of an empty list. */
  readonly noDataText = input<string | undefined>(undefined);
  /** Visible group label above both lists; the group's accessible name. */
  readonly label = input('');
  /** Helper text under the lists (hidden while an error shows). */
  readonly hint = input<string | undefined>(undefined);
  /**
   * Lets the user reorder a list: `true` both, `'source'` / `'target'` only
   * that one. Alt+↑/↓ moves the active option; a drag dropped inside its
   * own list reorders, over the other list it moves. The target's order is
   * the value's order; a reordered source keeps its order until `items`
   * changes.
   */
  readonly allowReordering = input<OgeTransferListReorderSides>(false);
  /** Option template for both lists (wins over a projected `[ogeListBoxItemTemplate]`). */
  readonly itemTemplate = input<
    TemplateRef<OgeListBoxItemTemplateContext<TItem>> | undefined
  >(undefined);
  /** Group header template for both lists (wins over `[ogeListBoxGroupTemplate]`). */
  readonly groupTemplate = input<
    TemplateRef<OgeListBoxGroupTemplateContext> | undefined
  >(undefined);

  /** Cancelable pre-event of every move (buttons, keyboard, drag). */
  readonly moving = output<OgeTransferListMovingEvent<TItem>>();
  /** Items changed sides. */
  readonly moved = output<OgeTransferListMovedEvent<TItem>>();
  /** Cancelable pre-event of a reorder inside one list (`allowReordering`). */
  readonly reordering = output<OgeTransferListReorderingEvent<TItem>>();
  /** An item moved inside one list — the target's reorder also changes `value`. */
  readonly reordered = output<OgeTransferListReorderedEvent<TItem>>();

  /** The source list's selection (values). */
  protected readonly sourceSelection = signal<unknown>([]);
  /** The target list's selection (values). */
  protected readonly targetSelection = signal<unknown>([]);

  private readonly itemTemplateDir = contentChild(OgeListBoxItemTemplate, {
    descendants: false,
  });
  private readonly groupTemplateDir = contentChild(OgeListBoxGroupTemplate, {
    descendants: false,
  });
  private readonly sourceList = viewChild<OgeListBox<TItem>>('sourceList');
  private readonly targetList = viewChild<OgeListBox<TItem>>('targetList');

  protected readonly dropSide = signal<OgeTransferListSide | null>(null);
  /** The drop line of a reorder drag, relative to its pane. */
  protected readonly reorderLine = signal<{
    side: OgeTransferListSide;
    top: number;
    left: number;
    width: number;
  } | null>(null);
  /** Every item in display order — the source keeps a user reorder here. */
  private readonly order = linkedSignal<readonly TItem[]>(() => this.items());
  private readonly rtl = signal(false);

  protected readonly resolvedItemTemplate = computed(
    () => this.itemTemplate() ?? this.itemTemplateDir()?.template,
  );
  protected readonly resolvedGroupTemplate = computed(
    () => this.groupTemplate() ?? this.groupTemplateDir()?.template,
  );

  protected readonly split = computed(() =>
    ogeTransferSplit(this.order(), this.value() ?? [], (item) =>
      this.itemValueOf(item),
    ),
  );

  protected readonly sourceTitleText = computed(
    () => this.sourceTitle() ?? this.msg().transferSourceTitle,
  );
  protected readonly targetTitleText = computed(
    () => this.targetTitle() ?? this.msg().transferTargetTitle,
  );
  protected readonly shortcuts = computed(() => ({
    source: ogeTransferKeyShortcuts('source', this.rtl()),
    target: ogeTransferKeyShortcuts('target', this.rtl()),
  }));

  /** Each list's search text, read from its search field's `input` events. */
  private readonly searchTexts = signal<Record<OgeTransferListSide, string>>({
    source: '',
    target: '',
  });

  /**
   * What each list shows after its search — derived here from the same
   * filter the list box runs, so the buttons are right in the same render
   * (the child list's own view updates after this template's bindings).
   */
  private readonly shownSides = computed(() => {
    const split = this.split();
    if (!this.searchEnabled()) return split;
    const texts = this.searchTexts();
    const filter = (items: readonly TItem[], text: string) =>
      ogeSelectSearchFilter(items, text, this.searchMode(), (item) =>
        ogeSelectSearchStrings(item, this.searchExpr(), this.displayExpr()),
      );
    return {
      source: filter(split.source, texts.source),
      target: filter(split.target, texts.target),
    };
  });

  /**
   * Which of the four buttons have something to move — judged on what each
   * list shows, like the moves themselves: "move all" needs a movable item
   * in the filtered view, "move selected" a selected one that is visible.
   */
  protected readonly canMove = computed(() => {
    const editable = !this.effectiveDisabled() && !this.readonly();
    const count = (scope: 'selected' | 'all', from: OgeTransferListSide) =>
      editable &&
      ogeTransferMovableValues(
        scope,
        this.shownSides()[from],
        this.selectionOf(from),
        (item) => this.itemValueOf(item),
        (item) => this.isItemDisabled(item),
      ).length > 0;
    return {
      selectedToTarget: count('selected', 'source'),
      allToTarget: count('all', 'source'),
      selectedToSource: count('selected', 'target'),
      allToSource: count('all', 'target'),
    };
  });

  protected readonly subscript = computed(() => {
    if (this.showError() && this.resolvedErrorText()) {
      return { id: this.errorId, text: this.resolvedErrorText(), error: true };
    }
    const hint = this.hint();
    return hint ? { id: this.hintId, text: hint, error: false } : null;
  });
  protected readonly describedBy = computed(() => this.subscript()?.id ?? null);

  constructor() {
    super();
    afterNextRender(() => {
      prepareTouchDrag();
      this.rtl.set(ogeIsRtl(this.hostEl.nativeElement));
    });
  }

  protected titleId(side: OgeTransferListSide): string {
    return `${this.inputId}-${side}-title`;
  }

  protected reorderable(side: OgeTransferListSide): boolean {
    return ogeTransferReorderable(this.allowReordering(), side);
  }

  protected countText(count: number): string {
    return ogeTransferCountText(
      this.msg().transferItemCount,
      count,
      this.config.locale,
    );
  }

  private itemValueOf(item: TItem): unknown {
    return resolveValue(this.valueExpr(), item);
  }

  private isItemDisabled(item: TItem): boolean {
    return resolveDisabled(this.disabledExpr(), item);
  }

  private selectionOf(side: OgeTransferListSide): readonly unknown[] {
    const selection =
      side === 'source' ? this.sourceSelection() : this.targetSelection();
    return Array.isArray(selection) ? selection : [];
  }

  /** What a side shows — its list box's visible (searched) options. */
  private shownItems(side: OgeTransferListSide): readonly TItem[] {
    const list = side === 'source' ? this.sourceList() : this.targetList();
    return (
      list?.getVisibleItems() ??
      (side === 'source' ? this.split().source : this.split().target)
    );
  }

  private movableValues(
    scope: 'selected' | 'all',
    from: OgeTransferListSide,
  ): unknown[] {
    return ogeTransferMovableValues(
      scope,
      this.shownItems(from),
      this.selectionOf(from),
      (item) => this.itemValueOf(item),
      (item) => this.isItemDisabled(item),
    );
  }

  // --- public API ------------------------------------------------------------

  /** Moves the source selection to the target list. */
  moveSelectedToTarget(): void {
    this.moveCommand({ scope: 'selected', from: 'source' }, 'button');
  }

  /** Moves every shown, enabled source item to the target list. */
  moveAllToTarget(): void {
    this.moveCommand({ scope: 'all', from: 'source' }, 'button');
  }

  /** Moves the target selection back to the source list. */
  moveSelectedToSource(): void {
    this.moveCommand({ scope: 'selected', from: 'target' }, 'button');
  }

  /** Moves every shown, enabled target item back to the source list. */
  moveAllToSource(): void {
    this.moveCommand({ scope: 'all', from: 'target' }, 'button');
  }

  // --- the one move path ------------------------------------------------------

  protected moveCommand(
    command: OgeTransferListMoveCommand,
    cause: OgeTransferListMoveCause,
    event?: Event,
  ): void {
    this.moveValues(
      this.movableValues(command.scope, command.from),
      command.from,
      cause,
      event,
    );
  }

  private moveValues(
    values: readonly unknown[],
    from: OgeTransferListSide,
    cause: OgeTransferListMoveCause,
    event: Event | undefined,
  ): void {
    if (this.effectiveDisabled() || this.readonly() || values.length === 0) {
      return;
    }
    const to = ogeTransferOpposite(from);
    const items = this.items().filter((item) =>
      choiceIncludes(values, this.itemValueOf(item)),
    );
    const moving: OgeTransferListMovingEvent<TItem> = {
      items,
      values: [...values],
      from,
      to,
      cause,
      cancel: false,
    };
    this.moving.emit(moving);
    if (moving.cancel) return;
    const next = ogeTransferMove(this.value() ?? [], values, to);
    this.commitNow(next, event);
    const remaining = this.selectionOf(from).filter(
      (value) => !choiceIncludes(values, value),
    );
    if (from === 'source') {
      this.sourceSelection.set(remaining);
      this.targetSelection.set([...values]);
    } else {
      this.targetSelection.set(remaining);
      this.sourceSelection.set([...values]);
    }
    this.announcer.announce(
      ogeTransferAnnouncement(
        this.msg().transferMovedAnnouncement,
        values.length,
        to === 'target' ? this.targetTitleText() : this.sourceTitleText(),
        this.config.locale,
      ),
    );
    this.moved.emit({
      items,
      values: [...values],
      from,
      to,
      cause,
      value: next,
    });
  }

  // --- reordering inside one list ----------------------------------------------

  protected onListReordering(
    side: OgeTransferListSide,
    inner: OgeListBoxReorderingEvent<TItem>,
  ): void {
    const pre: OgeTransferListReorderingEvent<TItem> = {
      side,
      item: inner.item,
      fromIndex: inner.fromIndex,
      toIndex: inner.toIndex,
      cause: inner.cause,
      event: inner.event,
      cancel: false,
    };
    this.reordering.emit(pre);
    if (pre.cancel) inner.cancel = true;
  }

  protected onListReordered(
    side: OgeTransferListSide,
    inner: OgeListBoxReorderedEvent<TItem>,
  ): void {
    const value = this.value() ?? [];
    if (side === 'target') {
      // the target's order is the value's order
      this.commitNow(
        ogeTransferReorderTarget(value, inner.items, (item) =>
          this.itemValueOf(item),
        ),
        inner.event,
      );
    } else {
      this.order.set(
        ogeTransferReorderSource(this.order(), inner.items, value, (item) =>
          this.itemValueOf(item),
        ),
      );
    }
    this.reordered.emit({
      side,
      item: inner.item,
      fromIndex: inner.fromIndex,
      toIndex: inner.toIndex,
      cause: inner.cause,
      items: inner.items,
      value: this.value() ?? [],
      event: inner.event,
    });
  }

  // --- keyboard + pointer -----------------------------------------------------

  protected onPaneInput(event: Event, side: OgeTransferListSide): void {
    const target = event.target as HTMLInputElement | null;
    if (!target?.classList?.contains('oge-list-box-search-input')) return;
    this.searchTexts.update((texts) => ({ ...texts, [side]: target.value }));
  }

  protected onPaneKeydown(
    event: KeyboardEvent,
    side: OgeTransferListSide,
  ): void {
    const target = event.target as Element | null;
    if (!target?.matches?.('[role="listbox"]')) return;
    const command = ogeTransferKeyCommand(
      event,
      side,
      ogeIsRtl(this.hostEl.nativeElement),
    );
    if (!command) return;
    event.preventDefault();
    this.moveCommand(command, 'keyboard', event);
  }

  protected onPointerDown(
    event: PointerEvent,
    from: OgeTransferListSide,
  ): void {
    if (this.effectiveDisabled() || this.readonly() || event.button !== 0)
      return;
    const option = (event.target as Element | null)?.closest?.(
      '.oge-list-box-option',
    );
    if (!option) return;
    const shown = this.shownItems(from);
    const item = shown[Number(option.getAttribute('data-index'))];
    if (item === undefined || this.isItemDisabled(item)) return;
    const value = this.itemValueOf(item);
    const selection = this.selectionOf(from);
    const values = choiceIncludes(selection, value)
      ? this.movableValues('selected', from)
      : [value];
    const host = this.hostEl.nativeElement;
    // a reorderable side also resolves drops on its own options
    const list = this.reorderable(from)
      ? option.closest('[role="listbox"]')
      : null;
    const pane = option.closest('.oge-transfer-list-pane');
    beginPointerDragDrop<OgeTransferListDropTarget>(event, {
      source: option,
      autoScroll: list instanceof HTMLElement ? list : null,
      resolve: (hit, move) =>
        ogeTransferDropTarget(hit, host, from, list, move.clientY),
      onOver: (target) => {
        this.dropSide.set(target?.kind === 'move' ? target.side : null);
        const over =
          target?.kind === 'reorder'
            ? list?.querySelector(`[data-index="${target.index}"]`)
            : null;
        this.reorderLine.set(
          over && pane && target?.kind === 'reorder'
            ? {
                side: from,
                ...ogeTransferReorderLine(over, pane, target.position),
              }
            : null,
        );
      },
      onDrop: (target) => {
        if (target.kind === 'move') {
          this.moveValues(values, from, 'drag', event);
          return;
        }
        const over = shown[target.index];
        const box = from === 'source' ? this.sourceList() : this.targetList();
        if (over !== undefined) {
          box?.reorderItem(item, over, target.position, 'drag');
        }
      },
      onEnd: () => {
        this.dropSide.set(null);
        this.reorderLine.set(null);
      },
    });
  }

  protected onFocusIn(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    this.rtl.set(ogeIsRtl(this.hostEl.nativeElement));
    this.handleFocus(event);
  }

  protected onFocusOut(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    this.handleBlur(event);
  }

  // --- base contract ---------------------------------------------------------

  protected nativeElement(): HTMLElement | null {
    return this.hostEl.nativeElement.querySelector<HTMLElement>(
      '[role="listbox"]',
    );
  }

  protected emptyValue(): readonly unknown[] {
    return [];
  }

  protected valueIsEmpty(value: readonly unknown[]): boolean {
    return !value || value.length === 0;
  }

  protected override normalizeWrite(value: unknown): readonly unknown[] {
    return Array.isArray(value) ? value : [];
  }
}
