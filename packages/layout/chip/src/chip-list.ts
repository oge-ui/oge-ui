import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  contentChild,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  OGE_CHIP_REMOVE_SHORTCUTS,
  ogeChipFocusAfterRemove,
  ogeChipGridStops,
  ogeChipIsRemovable,
  ogeChipKeyIntent,
  ogeChipListRole,
  ogeChipNavIndex,
  ogeChipRemoveLabel,
  ogeChipTabStop,
  ogeChipToggleSelection,
  ogeIsRtl,
  type OgeChipGridStop,
} from '@oge-ui/behavior';
import { OgeChipLead } from './chip-lead';
import { OGE_CHIP_CONFIG, type OgeChipMessages } from './config';
import { OgeChipTemplate, type OgeChipTemplateContext } from './templates';
import type {
  OgeChipItem,
  OgeChipItemClickEvent,
  OgeChipItemRemovedEvent,
  OgeChipItemRemovingEvent,
  OgeChipKey,
  OgeChipSelectionChangedEvent,
  OgeChipSelectionMode,
  OgeChipSize,
  OgeChipStylingMode,
} from './chip-types';

interface PendingFocus {
  count: number;
  index: number;
  then: 'next' | 'prev';
}

/**
 * A set of chips with one tab stop. Its ARIA shape follows from what the
 * chips can do (`ogeChipListRole`):
 *
 * - `selectionMode="single" | "multiple"` — a WAI-ARIA APG **listbox**: chips
 *   are `option`s with `aria-selected`, arrows / Home / End move, Space /
 *   Enter toggle, Delete / Backspace remove (the ✕ is `aria-hidden`, because
 *   a button inside an option is a nested interactive control).
 * - `selectionMode="none"` with removable chips — an APG **layout grid**: a
 *   `row` per chip, a label cell and a cell holding a real remove button,
 *   arrows walk the cells.
 * - otherwise a static `list`.
 *
 * ```html
 * <oge-chip-list
 *   [items]="filters"
 *   selectionMode="multiple"
 *   [(selectedKeys)]="active"
 *   ariaLabel="Filters"
 * />
 *
 * <oge-chip-list
 *   [items]="tags()"
 *   [removable]="true"
 *   (itemRemoved)="tags.set(without(tags(), $event.item))"
 * />
 * ```
 *
 * The list moves no data: drop the chip from `items` on `itemRemoved`; focus
 * then lands on the chip that took its place (Delete) or the previous one
 * (Backspace). When the last chip goes, focus stays where the app puts it.
 */
@Component({
  selector: 'oge-chip-list',
  imports: [NgTemplateOutlet, OgeChipLead],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chip-list',
    '[class.oge-chip-list-disabled]': 'disabled()',
    '[attr.role]': 'role()',
    '[attr.aria-label]': 'listLabel()',
    '[attr.aria-multiselectable]':
      "role() === 'listbox' && selectionMode() === 'multiple' ? true : null",
    '[attr.aria-orientation]': "role() === 'listbox' ? 'horizontal' : null",
    '[attr.aria-disabled]': "disabled() && role() !== 'list' ? true : null",
  },
  styleUrl: './chip.scss',
  template: `
    @switch (role()) {
      @case ('listbox') {
        @for (item of items(); track item.key; let i = $index) {
          <div
            role="option"
            [class]="chipClass(item)"
            [class.oge-chip-selected]="isSelected(item)"
            [attr.aria-selected]="isSelected(item)"
            [attr.aria-disabled]="isDisabled(item) ? true : null"
            [attr.aria-keyshortcuts]="isRemovable(item) ? shortcuts : null"
            [attr.data-oge-chip-index]="i"
            [tabindex]="i === tabStop() ? 0 : -1"
            (click)="onOptionClick($event, i)"
            (keydown)="onOptionKeydown($event, i)"
            (focus)="focusIndex.set(i)"
          >
            <span class="oge-chip-main">
              <svg
                class="oge-chip-check"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              <ng-container
                *ngTemplateOutlet="body; context: { item: item, index: i }"
              />
            </span>
            @if (isRemovable(item)) {
              <span class="oge-chip-remove" aria-hidden="true">
                <ng-container *ngTemplateOutlet="cross" />
              </span>
            }
          </div>
        }
      }
      @case ('grid') {
        @for (item of items(); track item.key; let i = $index) {
          <div
            role="row"
            [class]="chipClass(item)"
            [attr.aria-disabled]="isDisabled(item) ? true : null"
          >
            <span
              role="gridcell"
              class="oge-chip-main"
              [attr.data-oge-chip-stop]="i + ':label'"
              [tabindex]="isTabStop(i, 'label') ? 0 : -1"
              (click)="onGridClick($event, i)"
              (keydown)="onGridKeydown($event, i, 'label')"
              (focus)="gridFocus.set({ index: i, part: 'label' })"
            >
              <ng-container
                *ngTemplateOutlet="body; context: { item: item, index: i }"
              />
            </span>
            @if (isRemovable(item)) {
              <span role="gridcell" class="oge-chip-remove-cell">
                <button
                  type="button"
                  class="oge-chip-remove"
                  [attr.aria-label]="removeLabel(item)"
                  [attr.data-oge-chip-stop]="i + ':remove'"
                  [tabindex]="isTabStop(i, 'remove') ? 0 : -1"
                  (click)="requestRemove(i, 'next', $event)"
                  (keydown)="onGridKeydown($event, i, 'remove')"
                  (focus)="gridFocus.set({ index: i, part: 'remove' })"
                >
                  <ng-container *ngTemplateOutlet="cross" />
                </button>
              </span>
            }
          </div>
        }
      }
      @default {
        @for (item of items(); track item.key; let i = $index) {
          <div role="listitem" [class]="chipClass(item)">
            <span class="oge-chip-main">
              <ng-container
                *ngTemplateOutlet="body; context: { item: item, index: i }"
              />
            </span>
          </div>
        }
      }
    }

    <ng-template #body let-item="item" let-index="index">
      @if (item.avatar || item.icon) {
        <span ogeChipLead [avatar]="item.avatar" [icon]="item.icon"></span>
      }
      @if (chipTemplate(); as tpl) {
        <span class="oge-chip-label">
          <ng-container
            *ngTemplateOutlet="
              tpl.template;
              context: templateContext(item, index)
            "
          />
        </span>
      } @else {
        <span class="oge-chip-label">{{ item.label }}</span>
      }
    </ng-template>

    <ng-template #cross>
      <svg
        viewBox="0 0 24 24"
        width="12"
        height="12"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </ng-template>
  `,
})
export class OgeChipList {
  private readonly config = inject(OGE_CHIP_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The chips, in order. `key` identifies a chip in every event. */
  readonly items = input<readonly OgeChipItem[]>([]);
  /** `none` (default), `single` or `multiple` — selection turns the list into a listbox. */
  readonly selectionMode = input<OgeChipSelectionMode>('none');
  /** Keys of the selected chips (two-way). */
  readonly selectedKeys = model<readonly OgeChipKey[]>([]);
  /** Default removability of every chip (`OgeChipItem.removable` overrides it). */
  readonly removable = input(false);
  /** Disables every chip: nothing toggles, nothing is removed. */
  readonly disabled = input(false);
  /** Density preset; falls back to the config, then `md`. */
  readonly size = input<OgeChipSize | undefined>(undefined);
  /** `filled` (default) or `outlined`; falls back to the config. */
  readonly stylingMode = input<OgeChipStylingMode | undefined>(undefined);
  /** Accessible name; a listbox or grid falls back to the `chipList` message. */
  readonly ariaLabel = input<string | undefined>(undefined);

  /** The selection changed through a click, Space or Enter. */
  readonly selectionChanged = output<OgeChipSelectionChangedEvent>();
  /** A chip was clicked or activated with Enter / Space. */
  readonly itemClick = output<OgeChipItemClickEvent>();
  /** A chip is about to be removed — set `cancel` to keep it. */
  readonly itemRemoving = output<OgeChipItemRemovingEvent>();
  /** A chip was removed — drop it from `items` now. */
  readonly itemRemoved = output<OgeChipItemRemovedEvent>();

  protected readonly chipTemplate = contentChild(OgeChipTemplate);
  protected readonly shortcuts = OGE_CHIP_REMOVE_SHORTCUTS;
  protected readonly msg = computed<OgeChipMessages>(
    () => this.config.messages,
  );

  protected readonly role = computed(() =>
    ogeChipListRole(
      this.selectionMode(),
      this.items().some((item) => ogeChipIsRemovable(item, this.removable())),
    ),
  );
  protected readonly listLabel = computed(() =>
    this.role() === 'list'
      ? (this.ariaLabel() ?? null)
      : (this.ariaLabel() ?? this.msg().chipList),
  );

  private readonly resolvedSize = computed(
    () => this.size() ?? this.config.size ?? 'md',
  );
  private readonly resolvedStylingMode = computed(
    () => this.stylingMode() ?? this.config.stylingMode ?? 'filled',
  );

  /** Last focused option (listbox). */
  protected readonly focusIndex = signal(-1);
  /** Last focused cell (grid). */
  protected readonly gridFocus = signal<OgeChipGridStop | null>(null);

  private readonly enabledItems = computed(() =>
    this.items().map((item) => ({
      key: item.key,
      disabled: this.isDisabled(item),
      removable: item.removable,
    })),
  );

  /** The listbox's roving tab stop — valid on the first paint. */
  protected readonly tabStop = computed(() =>
    ogeChipTabStop(this.enabledItems(), this.focusIndex(), this.selectedKeys()),
  );

  private readonly stops = computed(() =>
    ogeChipGridStops(
      this.disabled()
        ? this.items().map(() => ({ disabled: true }))
        : this.items(),
      this.removable(),
    ),
  );

  /** The grid's roving tab stop: the focused cell when still valid, else the first. */
  private readonly gridStop = computed<OgeChipGridStop | null>(() => {
    const stops = this.stops();
    const focused = this.gridFocus();
    if (
      focused &&
      stops.some((s) => s.index === focused.index && s.part === focused.part)
    )
      return focused;
    return stops[0] ?? null;
  });

  private pending: PendingFocus | null = null;

  constructor() {
    // After the app dropped a removed chip, move focus onto its neighbour.
    afterRenderEffect(() => {
      const count = this.items().length;
      const pending = untracked(() => this.pending);
      if (!pending) return;
      this.pending = null;
      if (count >= pending.count) return;
      const target = ogeChipFocusAfterRemove(
        pending.count,
        pending.index,
        pending.then,
        this.items().map((item) => this.isDisabled(item)),
      );
      if (target >= 0) this.focus(target);
    });
  }

  /**
   * Focuses the chip at `index` (default: the current tab stop). A static
   * list has nothing focusable and ignores the call.
   */
  focus(index?: number): void {
    const el = this.host.nativeElement;
    if (this.role() === 'listbox') {
      const i = index ?? this.tabStop();
      (
        el.querySelector(`[data-oge-chip-index="${i}"]`) as HTMLElement | null
      )?.focus();
    } else if (this.role() === 'grid') {
      const stop =
        index === undefined
          ? this.gridStop()
          : (this.stops().find((s) => s.index === index) ?? null);
      if (stop) this.focusStop(stop);
    }
  }

  protected chipClass(item: OgeChipItem): string {
    const classes = ['oge-chip'];
    const size = this.resolvedSize();
    if (size !== 'md') classes.push(`oge-chip-${size}`);
    if (this.resolvedStylingMode() === 'outlined')
      classes.push('oge-chip-outlined');
    if (item.severity && item.severity !== 'neutral')
      classes.push(`oge-chip-${item.severity}`);
    if (this.role() === 'listbox') classes.push('oge-chip-selectable');
    if (this.isRemovable(item)) classes.push('oge-chip-removable');
    if (this.isDisabled(item)) classes.push('oge-chip-disabled');
    return classes.join(' ');
  }

  protected isSelected(item: OgeChipItem): boolean {
    return this.selectedKeys().includes(item.key);
  }

  protected isDisabled(item: OgeChipItem): boolean {
    return this.disabled() || !!item.disabled;
  }

  protected isRemovable(item: OgeChipItem): boolean {
    return !this.disabled() && ogeChipIsRemovable(item, this.removable());
  }

  protected isTabStop(index: number, part: 'label' | 'remove'): boolean {
    const stop = this.gridStop();
    return !!stop && stop.index === index && stop.part === part;
  }

  protected removeLabel(item: OgeChipItem): string {
    return ogeChipRemoveLabel(item.label, this.msg());
  }

  protected templateContext(
    item: OgeChipItem,
    index: number,
  ): OgeChipTemplateContext {
    return {
      $implicit: item,
      index,
      selected: this.isSelected(item),
      removable: this.isRemovable(item),
      disabled: this.isDisabled(item),
    };
  }

  // --- listbox -------------------------------------------------------------

  protected onOptionClick(event: MouseEvent, index: number): void {
    const target = event.target as Element | null;
    if (target?.closest('.oge-chip-remove')) {
      this.requestRemove(index, 'next', event);
      return;
    }
    this.activate(index, event);
  }

  protected onOptionKeydown(event: KeyboardEvent, index: number): void {
    const intent = ogeChipKeyIntent(event.key, this.rtl());
    if (!intent) return;
    const items = this.items();
    switch (intent.type) {
      case 'move': {
        event.preventDefault();
        const next = ogeChipNavIndex(items.length, index, intent.to, (i) =>
          this.isDisabled(items[i]),
        );
        this.focus(next);
        return;
      }
      case 'toggle':
        event.preventDefault();
        this.activate(index, event);
        return;
      case 'remove':
        event.preventDefault();
        this.requestRemove(index, intent.then, event);
        return;
    }
  }

  private activate(index: number, event: Event): void {
    const item = this.items()[index];
    if (!item || this.isDisabled(item)) return;
    this.focusIndex.set(index);
    const previousKeys = [...this.selectedKeys()];
    const selectedKeys = ogeChipToggleSelection(
      this.selectionMode(),
      previousKeys,
      item.key,
    );
    this.selectedKeys.set(selectedKeys);
    this.selectionChanged.emit({
      selectedKeys,
      previousKeys,
      item,
      index,
      event,
    });
    this.itemClick.emit({ item, index, event });
  }

  // --- grid ----------------------------------------------------------------

  protected onGridClick(event: Event, index: number): void {
    const item = this.items()[index];
    if (!item || this.isDisabled(item)) return;
    this.itemClick.emit({ item, index, event });
  }

  protected onGridKeydown(
    event: KeyboardEvent,
    index: number,
    part: 'label' | 'remove',
  ): void {
    const intent = ogeChipKeyIntent(event.key, this.rtl());
    if (!intent) return;
    const stops = this.stops();
    const at = stops.findIndex((s) => s.index === index && s.part === part);
    switch (intent.type) {
      case 'move': {
        event.preventDefault();
        const next = ogeChipNavIndex(stops.length, at, intent.to);
        if (next >= 0) this.focusStop(stops[next]);
        return;
      }
      case 'toggle':
        // the remove cell's button handles Enter/Space natively
        if (part === 'label') {
          event.preventDefault();
          this.onGridClick(event, index);
        }
        return;
      case 'remove':
        event.preventDefault();
        this.requestRemove(index, intent.then, event);
        return;
    }
  }

  private focusStop(stop: OgeChipGridStop): void {
    (
      this.host.nativeElement.querySelector(
        `[data-oge-chip-stop="${stop.index}:${stop.part}"]`,
      ) as HTMLElement | null
    )?.focus();
  }

  // --- removal -------------------------------------------------------------

  /** Runs the cancelable removal of the chip at `index`. */
  protected requestRemove(
    index: number,
    then: 'next' | 'prev',
    event?: Event,
  ): void {
    const item = this.items()[index];
    if (!item || !this.isRemovable(item)) return;
    const removing: OgeChipItemRemovingEvent = {
      item,
      index,
      event,
      cancel: false,
    };
    this.itemRemoving.emit(removing);
    if (removing.cancel) return;
    this.pending = { count: this.items().length, index, then };
    this.itemRemoved.emit({ item, index, event });
  }

  private rtl(): boolean {
    return ogeIsRtl(this.host.nativeElement);
  }
}
