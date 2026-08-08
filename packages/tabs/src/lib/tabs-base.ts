import {
  Directive,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { runAsyncGuard } from '@oge-ui/core';
import { OGE_TABS_CONFIG, type OgeTabsMessages } from './config';
import { OgeTab } from './tab';
import { applyTabOrder, type OgeTabDescriptor } from './tab-descriptor';
import {
  OgeTabStrip,
  type OgeTabStripActivateEvent,
  type OgeTabStripCloseEvent,
  type OgeTabStripFocusSelectEvent,
  type OgeTabStripReorderEvent,
} from './tab-strip';
import { OgeTabContentTemplate, OgeTabHeaderTemplate } from './templates';
import type {
  OgeTabClickEvent,
  OgeTabClosedEvent,
  OgeTabClosingEvent,
  OgeTabItem,
  OgeTabReorderedEvent,
  OgeTabReorderingEvent,
  OgeTabSelectionChangedEvent,
  OgeTabSelectionChangingEvent,
  OgeTabsActivation,
  OgeTabsAlignment,
  OgeTabsIndicatorFit,
  OgeTabsNavButtonsMode,
  OgeTabsSize,
  OgeTabsStylingMode,
} from './tabs-types';

let nextComponentId = 0;

/**
 * Shared API and state pipeline of `oge-tabs` and `oge-tab-panel`: merges
 * declarative `<oge-tab>` children with the `items` input, reconciles the
 * `selectedIndex`/`selectedKey` two-way models, and runs the cancelable
 * selection / close / reorder pipelines. Module-internal base class.
 */
@Directive()
export abstract class OgeTabsBase {
  private readonly config = inject(OGE_TABS_CONFIG);

  /** Unique DOM id prefix of this component instance. */
  protected readonly uid = `oge-tabs-${nextComponentId++}`;

  /** Data-driven tabs rendered after the projected `<oge-tab>` children. */
  readonly items = input<readonly OgeTabItem[] | undefined>(undefined);
  /** Index of the selected tab — two-way. `-1` selects none. */
  readonly selectedIndex = model(0);
  /**
   * Key of the selected tab — two-way. Kept in sync with `selectedIndex`;
   * `undefined` while the selected tab has no key.
   */
  readonly selectedKey = model<string | undefined>(undefined);
  /** APG activation: arrows select immediately (`automatic`) or Enter/Space commits (`manual`). */
  readonly activation = input<OgeTabsActivation>('automatic');
  /** Disables the whole component. */
  readonly disabled = input(false);
  /** Default closability; overridable per tab / per item. */
  readonly closable = input(false);
  /**
   * How tabs are distributed while they fit: `justify` spreads them to the
   * edges, `stretch` gives every tab an equal share of the strip.
   */
  readonly tabAlignment = input<OgeTabsAlignment>('start');
  /** Whether the selected-tab indicator spans the whole tab or just its label. */
  readonly indicatorFit = input<OgeTabsIndicatorFit>('tab');
  /** Overflow nav arrows: `auto` shows them only while overflowing. */
  readonly showNavButtons = input<OgeTabsNavButtonsMode>('auto');
  /** Shows the all-tabs overflow menu button. */
  readonly showTabListButton = input(false);
  /** Enables drag & drop reordering of tab headers. */
  readonly allowTabReordering = input(false);
  /** Visual variant: underline ink (`primary`) or soft pills (`secondary`). */
  readonly stylingMode = input<OgeTabsStylingMode>('primary');
  /** Density of the tab strip. */
  readonly size = input<OgeTabsSize>('md');
  /** Aria label of the tablist. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Per-instance overrides of the config `messages`. */
  readonly messages = input<Partial<OgeTabsMessages>>({});

  /** Cancelable pre-event of a user-gesture selection change. */
  readonly selectionChanging = output<OgeTabSelectionChangingEvent>();
  /** Emitted after the selection committed. */
  readonly selectionChanged = output<OgeTabSelectionChangedEvent>();
  /** Emitted when a tab header is activated by pointer or keyboard. */
  readonly tabClick = output<OgeTabClickEvent>();
  /** Cancelable pre-event of a tab close (before the async `closeGuard`). */
  readonly tabClosing = output<OgeTabClosingEvent>();
  /** Emitted once a close passed `tabClosing` and the tab's `closeGuard`. */
  readonly tabClosed = output<OgeTabClosedEvent>();
  /** Cancelable pre-event of a drag-reorder drop. */
  readonly tabReordering = output<OgeTabReorderingEvent>();
  /** Emitted after a drag reorder committed to the display order. */
  readonly tabReordered = output<OgeTabReorderedEvent>();

  private readonly declaredTabs = contentChildren(OgeTab);
  // descendants: false — templates inside an <oge-tab> belong to that tab,
  // only direct children act as the shared items-mode templates.
  private readonly itemsHeaderTemplate = contentChild(OgeTabHeaderTemplate, {
    descendants: false,
  });
  private readonly itemsContentTemplate = contentChild(OgeTabContentTemplate, {
    descendants: false,
  });

  private readonly strip = viewChild(OgeTabStrip);

  /** Display order (descriptor ids) accumulated by drag reorders. */
  private readonly tabOrder = signal<readonly string[]>([]);

  private readonly _closePendingIds = signal<ReadonlySet<string>>(new Set());
  /** Ids of tabs whose async `closeGuard` is currently pending. */
  protected readonly closePendingIds = this._closePendingIds.asReadonly();

  /** Effective messages: config defaults overlaid with `[messages]`. */
  protected readonly mergedMessages = computed<OgeTabsMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  /** Normalized tabs: projected children first, then `items`, reordered. */
  protected readonly descriptors = computed<readonly OgeTabDescriptor[]>(() => {
    const headerTpl = this.itemsHeaderTemplate()?.templateRef;
    const contentTpl = this.itemsContentTemplate()?.templateRef;
    const defaultClosable = this.closable();
    const fromChildren = this.declaredTabs()
      .filter((tab) => tab.visible())
      .map((tab) => ({
        id: tab.key() ?? tab.autoId,
        key: tab.key(),
        text: tab.text(),
        hint: tab.hint(),
        badge: tab.badge(),
        disabled: tab.disabled(),
        closable: tab.closable() ?? defaultClosable,
        dirty: tab.dirty(),
        item: undefined,
        headerTemplate: tab.headerTemplate()?.templateRef,
        contentTemplate:
          tab.lazyContent()?.templateRef ?? tab.contentTemplateRef(),
        closeGuard: tab.closeGuard(),
      }));
    const fromItems = (this.items() ?? [])
      .filter((item) => item.visible !== false)
      .map((item, index) => ({
        id: item.key ?? `i${index}`,
        key: item.key,
        text: item.text ?? '',
        hint: item.hint,
        badge: item.badge,
        disabled: item.disabled ?? false,
        closable: item.closable ?? defaultClosable,
        dirty: item.dirty ?? false,
        item,
        headerTemplate: headerTpl,
        contentTemplate: contentTpl,
        closeGuard: item.closeGuard,
      }));
    return applyTabOrder([...fromChildren, ...fromItems], this.tabOrder());
  });

  constructor() {
    // selectedKey → selectedIndex. Declared before the reverse effect so an
    // initial key binding wins over the index default on first run.
    effect(() => {
      const key = this.selectedKey();
      if (key === undefined) return;
      const index = this.descriptors().findIndex((d) => d.key === key);
      if (index !== -1 && index !== untracked(this.selectedIndex)) {
        this.selectedIndex.set(index);
      }
    });
    // selectedIndex → selectedKey.
    effect(() => {
      const key = this.descriptors()[this.selectedIndex()]?.key;
      if (key !== untracked(this.selectedKey)) this.selectedKey.set(key);
    });
    // Keep the index in range when tabs are removed.
    effect(() => {
      const count = this.descriptors().length;
      const index = untracked(this.selectedIndex);
      if (count > 0 && index > count - 1) this.selectedIndex.set(count - 1);
    });
  }

  /** Focuses the active tab header. */
  focus(): void {
    this.strip()?.focusActiveTab();
  }

  /**
   * Runs the close pipeline (`tabClosing` → `closeGuard` → `tabClosed`) for
   * the tab at an index or with a key.
   */
  closeTab(target: number | string): void {
    const index = this.resolveIndex(target);
    if (index !== -1) this.requestCloseTab(index);
  }

  /** Scrolls the tab at an index or with a key into view. */
  scrollToTab(target: number | string): void {
    const index = this.resolveIndex(target);
    if (index !== -1) this.strip()?.scrollToIndex(index);
  }

  protected onStripActivate(event: OgeTabStripActivateEvent): void {
    const d = this.descriptors()[event.index];
    if (!d) return;
    this.tabClick.emit({
      index: event.index,
      key: d.key,
      item: d.item,
      event: event.event,
    });
    this.requestSelect(event.index, event.event);
  }

  protected onStripFocusSelect(event: OgeTabStripFocusSelectEvent): void {
    this.requestSelect(event.index, event.event);
  }

  protected onStripClose(event: OgeTabStripCloseEvent): void {
    this.requestCloseTab(event.index, event.event);
  }

  protected onStripReorder(event: OgeTabStripReorderEvent): void {
    const ds = this.descriptors();
    const from = event.fromIndex;
    const to = Math.max(0, Math.min(event.toIndex, ds.length - 1));
    const moved = ds[from];
    if (!moved || from === to) return;
    const reordering: OgeTabReorderingEvent = {
      fromIndex: from,
      toIndex: to,
      key: moved.key,
      cancel: false,
    };
    this.tabReordering.emit(reordering);
    if (reordering.cancel) return;
    const selectedId = ds[this.selectedIndex()]?.id;
    const ids = ds.map((d) => d.id);
    ids.splice(from, 1);
    ids.splice(to, 0, moved.id);
    this.tabOrder.set(ids);
    if (selectedId !== undefined) {
      const newIndex = this.descriptors().findIndex((d) => d.id === selectedId);
      if (newIndex !== -1) this.selectedIndex.set(newIndex);
    }
    this.tabReordered.emit({ fromIndex: from, toIndex: to, key: moved.key });
  }

  /** Selection pipeline for user gestures (cancelable pre-event). */
  private requestSelect(index: number, event?: Event): void {
    const ds = this.descriptors();
    const from = this.selectedIndex();
    if (index === from || this.disabled()) return;
    const target = ds[index];
    if (!target || target.disabled) return;
    const changing: OgeTabSelectionChangingEvent = {
      fromIndex: from,
      toIndex: index,
      fromKey: ds[from]?.key,
      toKey: target.key,
      item: target.item,
      event,
      cancel: false,
    };
    this.selectionChanging.emit(changing);
    if (changing.cancel) return;
    this.selectedIndex.set(index);
    this.selectedKey.set(target.key);
    this.selectionChanged.emit({
      index,
      key: target.key,
      previousIndex: from,
      previousKey: ds[from]?.key,
      item: target.item,
      event,
    });
  }

  /** Close pipeline: `tabClosing` → sync/async guard → `tabClosed`. */
  private requestCloseTab(index: number, event?: Event): void {
    const d = this.descriptors()[index];
    if (!d || this._closePendingIds().has(d.id)) return;
    const closing: OgeTabClosingEvent = {
      index,
      key: d.key,
      item: d.item,
      event,
      cancel: false,
    };
    this.tabClosing.emit(closing);
    if (closing.cancel) return;
    runAsyncGuard(d.closeGuard, {
      allow: () => this.finalizeClose(d),
      pending: (active) => this.setClosePending(d.id, active),
      label: 'oge-tabs closeGuard',
    });
  }

  /**
   * Emits `tabClosed` with the tab's up-to-date index and hands focus to the
   * following tab. The tab itself is removed by the consumer.
   */
  private finalizeClose(d: OgeTabDescriptor): void {
    const index = this.descriptors().findIndex((entry) => entry.id === d.id);
    if (index === -1) return;
    this.tabClosed.emit({ index, key: d.key, item: d.item });
    this.strip()?.handleClosedFocus(index);
  }

  private setClosePending(id: string, pending: boolean): void {
    const next = new Set(this._closePendingIds());
    if (pending) next.add(id);
    else next.delete(id);
    this._closePendingIds.set(next);
  }

  private resolveIndex(target: number | string): number {
    const ds = this.descriptors();
    if (typeof target === 'number') {
      return target >= 0 && target < ds.length ? target : -1;
    }
    return ds.findIndex((d) => d.key === target);
  }
}
