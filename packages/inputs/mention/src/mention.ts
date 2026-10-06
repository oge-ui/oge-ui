import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  computed,
  contentChild,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  OgeMentionCore,
  ogeCaretRect,
  ogeMentionKeyCommand,
  type OgeMentionItemContext,
  type OgeMentionItemsSource,
  type OgeMentionSearchChangedEvent,
  type OgeMentionSelectedEvent,
  type OgeMentionToken,
  type OgeMentionTrigger,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
  type OgeRect,
  type OgeSelectDisplayExpr,
  type OgeSelectSearchExpr,
  type OgeSelectSearchMode,
  type OgeSelectValueExpr,
} from '@oge-ui/behavior';
import {
  OGE_OVERLAY_CONFIG,
  OgeAnchoredPanel,
  OgePopup,
  type OgePopupCloseReason,
} from '@oge-ui/overlay';
import { OgeFieldChrome } from '@oge-ui/inputs/field';
import { OGE_INPUT_HOST } from '@oge-ui/inputs/field';
import { OgeInputBase } from '@oge-ui/inputs/field';

/** Angular's reactivity, in the shape the shared machine consumes. */
const SIGNAL_ADAPTER: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    const state = signal(initial);
    const cell = (() => state()) as OgeReactiveCell<T>;
    cell.set = (value) => state.set(value);
    return cell;
  },
  derived: (compute) => computed(compute),
};

/** Context of a custom suggestion row — `$implicit` is the item. */
export interface OgeMentionItemTemplateContext<
  T = unknown,
> extends OgeMentionItemContext<T> {
  $implicit: T;
}

/**
 * Custom suggestion row of `oge-mention`:
 *
 * ```html
 * <oge-mention [items]="users" displayExpr="name">
 *   <ng-template ogeMentionItemTemplate let-user let-active="active">
 *     <img [src]="user.avatar" alt="" /> {{ user.name }}
 *   </ng-template>
 * </oge-mention>
 * ```
 *
 * A template cannot infer the item type from the host's `items`, so the
 * row variable is `any` by default (like an untyped `<ng-template>`).
 */
@Directive({ selector: '[ogeMentionItemTemplate]' })
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
export class OgeMentionItemTemplate<T = any> {
  readonly template = inject(TemplateRef<OgeMentionItemTemplateContext<T>>);

  static ngTemplateContextGuard<T>(
    _dir: OgeMentionItemTemplate<T>,
    _ctx: unknown,
  ): _ctx is OgeMentionItemTemplateContext<T> {
    return true;
  }
}

/**
 * Text editor with `@`-style mentions: typing a trigger character at the
 * start of the text or after a space opens a caret-anchored suggestion list,
 * and picking a suggestion inserts it as a plain-text token (`@Ada `). The
 * value stays the text itself; the inserted mentions — item, value and
 * position — are the two-way `mentions` model, kept in step with every
 * later edit (a token edited away drops out):
 *
 * ```html
 * <oge-mention label="Comment" [items]="users" displayExpr="name" [(value)]="text"
 *              [(mentions)]="mentioned" />
 * <oge-mention [triggers]="[{ char: '@', items: users, displayExpr: 'name' },
 *                          { char: '#', items: searchTags }]" />
 * ```
 *
 * Arrow keys move through the suggestions, Enter or Tab inserts, Escape
 * closes them until the next trigger. A single-line field (`multiline:
 * false`) is a WAI-ARIA combobox; the multi-line text area keeps its textbox
 * role with `aria-autocomplete`, `aria-controls` and
 * `aria-activedescendant` (ARIA allows no combobox role on a `<textarea>`).
 * Works standalone via `[(value)]`, with Signal Forms via `[formField]`, and
 * with reactive/template forms via `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-mention',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeFieldChrome, OgePopup],
  providers: [{ provide: OGE_INPUT_HOST, useExisting: OgeMention }],
  host: {
    class: 'oge-input oge-mention',
    '[class.oge-text-area]': 'multiline()',
    '[class.oge-mention-open]': 'opened()',
    '[style.--oge-ta-min-rows]': 'multiline() ? rows() : null',
  },
  template: `
    <oge-field-chrome>
      <ng-content select="[ogeInputPrefix]" ngProjectAs="[ogeInputPrefix]" />
      @if (multiline()) {
        <textarea
          #native
          class="oge-input-native"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          [id]="inputId"
          [rows]="rows()"
          [value]="liveText()"
          [placeholder]="placeholderText()"
          [disabled]="effectiveDisabled()"
          [readOnly]="readonly()"
          [attr.spellcheck]="spellcheck()"
          [attr.name]="name() || null"
          [attr.maxlength]="maxLength() ?? null"
          [attr.title]="tooltip() ?? null"
          [attr.tabindex]="tabIndex()"
          [attr.aria-controls]="opened() ? listboxId : null"
          [attr.aria-activedescendant]="activeDescendant()"
          [attr.aria-label]="
            labelMode() === 'hidden' && label() ? label() : null
          "
          [attr.aria-labelledby]="
            labelMode() !== 'hidden' && label() ? labelId : null
          "
          [attr.aria-describedby]="describedBy()"
          [attr.aria-invalid]="showError() ? 'true' : null"
          [attr.aria-required]="required() ? 'true' : null"
          (input)="onNativeInput($event)"
          (keydown)="onKeydown($event)"
          (keyup)="onKeyup($event)"
          (click)="refreshQuery()"
          (compositionstart)="handleCompositionStart()"
          (compositionend)="handleCompositionEnd($event)"
          (focus)="handleFocus($event)"
          (blur)="handleBlur($event)"
        ></textarea>
      } @else {
        <input
          #native
          class="oge-input-native"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          autocomplete="off"
          [id]="inputId"
          [value]="liveText()"
          [placeholder]="placeholderText()"
          [disabled]="effectiveDisabled()"
          [readOnly]="readonly()"
          [attr.spellcheck]="spellcheck()"
          [attr.name]="name() || null"
          [attr.maxlength]="maxLength() ?? null"
          [attr.title]="tooltip() ?? null"
          [attr.tabindex]="tabIndex()"
          [attr.aria-expanded]="opened()"
          [attr.aria-controls]="opened() ? listboxId : null"
          [attr.aria-activedescendant]="activeDescendant()"
          [attr.aria-label]="
            labelMode() === 'hidden' && label() ? label() : null
          "
          [attr.aria-labelledby]="
            labelMode() !== 'hidden' && label() ? labelId : null
          "
          [attr.aria-describedby]="describedBy()"
          [attr.aria-invalid]="showError() ? 'true' : null"
          [attr.aria-required]="required() ? 'true' : null"
          (input)="onNativeInput($event)"
          (keydown)="onKeydown($event)"
          (keyup)="onKeyup($event)"
          (click)="refreshQuery()"
          (compositionstart)="handleCompositionStart()"
          (compositionend)="handleCompositionEnd($event)"
          (focus)="handleFocus($event)"
          (blur)="handleBlur($event)"
        />
      }
      <ng-content select="[ogeInputSuffix]" ngProjectAs="[ogeInputSuffix]" />
    </oge-field-chrome>
    @if (panel.isOpen()) {
      <oge-popup [panel]="panel">
        <div
          class="oge-select-list oge-mention-list"
          role="listbox"
          [id]="listboxId"
          [style.maxHeight.px]="dropdownMaxHeight() ?? null"
          [attr.aria-label]="msg().mentionListLabel"
          [attr.aria-busy]="loading() ? 'true' : null"
        >
          @if (loading()) {
            <div class="oge-select-status" role="presentation">
              {{ msg().dropDownLoading }}
            </div>
          } @else if (failed()) {
            <div class="oge-select-status" role="presentation">
              {{ msg().dropDownLoadError }}
            </div>
          } @else if (suggestions().length === 0) {
            <div class="oge-select-status" role="presentation">
              {{ msg().noDataText }}
            </div>
          } @else {
            @for (item of suggestions(); track $index; let i = $index) {
              <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- the field owns the keyboard (aria-activedescendant) -->
              <div
                class="oge-select-option oge-mention-option"
                role="option"
                [id]="optionId(i)"
                [class.oge-select-option-active]="i === activeIndex()"
                [attr.aria-selected]="i === activeIndex()"
                [attr.aria-posinset]="i + 1"
                [attr.aria-setsize]="suggestions().length"
                (mousedown)="$event.preventDefault()"
                (mouseenter)="activeIndex.set(i)"
                (click)="insert(item, $event)"
              >
                @if (rowTemplate(); as template) {
                  <ng-container
                    *ngTemplateOutlet="template; context: rowContext(item, i)"
                  />
                } @else {
                  <span class="oge-select-option-text">
                    <span
                      class="oge-mention-option-trigger"
                      aria-hidden="true"
                      >{{ query()?.trigger }}</span
                    >{{ displayOf(item) }}
                  </span>
                }
              </div>
            }
          }
        </div>
      </oge-popup>
    }
  `,
  styleUrl: './mention.scss',
})
export class OgeMention<T = unknown>
  extends OgeInputBase<string>
  implements FormValueControl<string>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);

  /** The text, mentions included as plain-text tokens — two-way. */
  readonly value = model('');
  /** The inserted mentions in text order — two-way, kept in step with edits. */
  readonly mentions = model<readonly OgeMentionToken<T>[]>([]);
  /** Several trigger characters with their own items; overrides the shorthand inputs. */
  readonly triggers = input<readonly OgeMentionTrigger<T>[] | undefined>(
    undefined,
  );
  /** Shorthand single trigger: its suggestions (a list or a query function). */
  readonly items = input<OgeMentionItemsSource<T>>([]);
  /** Shorthand single trigger: its character. */
  readonly trigger = input('@');
  /** Shorthand single trigger: item → display (and inserted) text. */
  readonly displayExpr = input<OgeSelectDisplayExpr<T> | undefined>(undefined);
  /** Shorthand single trigger: item → the value reported in `mentions`. */
  readonly valueExpr = input<OgeSelectValueExpr<T> | undefined>(undefined);
  /** Shorthand single trigger: which text the local filter matches. */
  readonly searchExpr = input<OgeSelectSearchExpr<T> | undefined>(undefined);
  /** Substring (`contains`) or prefix (`startswith`) matching of local items. */
  readonly searchMode = input<OgeSelectSearchMode>('contains');
  /** Characters required after the trigger before suggestions show. */
  readonly minSearchLength = input(0);
  /** Caps the suggestion list. */
  readonly maxSuggestions = input(8);
  /** Lets a query contain spaces (`@Ada Love`). */
  readonly allowSpaces = input(false);
  /** Adds a space after the inserted token. */
  readonly insertSpace = input(true);
  /** Debounce (ms) before a query function is called; `undefined` = config (250). */
  readonly searchTimeout = input<number | undefined>(undefined);
  /** Multi-line text area (`true`) or a single-line field. */
  readonly multiline = input(true);
  /** Visible rows of the text area. */
  readonly rows = input(3);
  readonly maxLength = input<number | undefined>(undefined);
  readonly spellcheck = input(true);
  /** Scrollable suggestion list height cap; `undefined` = the CSS default (320px). */
  readonly dropdownMaxHeight = input<number | undefined>(undefined);
  /** Custom suggestion row (the `[ogeMentionItemTemplate]` child wins). */
  readonly itemTemplate = input<
    TemplateRef<OgeMentionItemTemplateContext<T>> | undefined
  >(undefined);

  /** A suggestion was inserted. */
  readonly mentionSelected = output<OgeMentionSelectedEvent<T>>();
  /** The query after a trigger changed — drive server-side suggestions from here. */
  readonly searchChanged = output<OgeMentionSearchChangedEvent>();

  private readonly native =
    viewChild<ElementRef<HTMLTextAreaElement | HTMLInputElement>>('native');
  private readonly chromeRef = viewChild(OgeFieldChrome, { read: ElementRef });
  private readonly popupRef = viewChild(OgePopup, { read: ElementRef });
  private readonly templateChild = contentChild(OgeMentionItemTemplate, {
    descendants: false,
  });

  protected readonly liveText = linkedSignal({
    source: this.value,
    computation: (v: string) => v,
  });

  private readonly effectiveTriggers = computed<
    readonly OgeMentionTrigger<T>[]
  >(
    () =>
      this.triggers() ?? [
        {
          char: this.trigger(),
          items: this.items(),
          displayExpr: this.displayExpr(),
          valueExpr: this.valueExpr(),
          searchExpr: this.searchExpr(),
        },
      ],
  );

  private readonly core = new OgeMentionCore<T>(
    {
      inputId: () => this.inputId,
      triggers: () => this.effectiveTriggers(),
      minSearchLength: () => this.minSearchLength(),
      maxSuggestions: () => this.maxSuggestions(),
      allowSpaces: () => this.allowSpaces(),
      insertSpace: () => this.insertSpace(),
      searchMode: () => this.searchMode(),
      searchDebounceMs: () =>
        this.searchTimeout() ?? this.config.searchTimeoutMs,
      onSearchChanged: (event) => this.searchChanged.emit(event),
    },
    SIGNAL_ADAPTER,
  );

  private caretRect: OgeRect | null = null;
  private lastText = '';
  private lastMentions: readonly OgeMentionToken<T>[] = [];

  /** Anchored-panel model — public so templates/tests can read `panelId`. */
  readonly panel = new OgeAnchoredPanel({
    anchor: () =>
      this.chromeRef()?.nativeElement.querySelector('.oge-input-container') ??
      this.hostEl.nativeElement,
    panel: () => this.popupRef()?.nativeElement ?? null,
    anchorRect: () => this.caretRect,
    placement: () => 'bottom-start',
    offset: () => this.overlayConfig.offset,
    viewportPadding: () => this.overlayConfig.viewportPadding,
    restoreFocus: () => this.focus(),
    onClosed: (reason: OgePopupCloseReason) => {
      if (reason === 'escape') this.core.dismiss();
      else if (reason !== 'api') this.core.close();
    },
  });

  /** Suggestions are showing. */
  readonly opened = this.core.opened;
  /** The active query (`null` while closed). */
  protected readonly query = this.core.query;
  protected readonly suggestions = this.core.list.visibleItems;
  protected readonly activeIndex = this.core.list.activeIndex;
  protected readonly activeDescendant = this.core.list.activeDescendant;
  protected readonly loading = this.core.loading;
  protected readonly failed = this.core.failed;
  protected readonly rowTemplate = computed(
    () => this.templateChild()?.template ?? this.itemTemplate(),
  );

  get listboxId(): string {
    return this.core.list.listboxId;
  }

  constructor() {
    super();
    // suggestions state ↔ panel
    effect(() => {
      const open = this.core.opened();
      untracked(() => {
        if (open && !this.panel.isOpen()) this.panel.open();
        else if (!open && this.panel.isOpen()) this.panel.close('api');
      });
    });
    // An external text write re-aligns the tokens.
    effect(() => {
      const text = this.value();
      untracked(() => {
        if (text === this.lastText) return;
        const previous = this.lastText;
        this.lastText = text;
        if (this.core.noteTextChange(previous, text)) this.publishMentions();
      });
    });
    // An external mentions write seeds the machine.
    effect(() => {
      const mentions = this.mentions();
      untracked(() => {
        if (mentions === this.lastMentions) return;
        this.lastMentions = mentions;
        this.core.tokens.set(mentions);
      });
    });
    this.destroyRef.onDestroy(() => {
      this.core.destroy();
      this.panel.destroy();
    });
  }

  // --- public API ------------------------------------------------------------

  /** Closes the suggestion list. */
  close(): void {
    this.core.close();
  }

  // --- template helpers ------------------------------------------------------

  protected displayOf(item: T): string {
    return this.core.displayOf(item);
  }

  protected optionId(index: number): string {
    return this.core.list.optionId(index);
  }

  protected rowContext(
    item: T,
    index: number,
  ): OgeMentionItemTemplateContext<T> {
    const query = this.core.query();
    return {
      $implicit: item,
      item,
      index,
      trigger: query?.trigger ?? '',
      query: query?.text ?? '',
      active: index === this.core.list.activeIndex(),
    };
  }

  // --- handlers --------------------------------------------------------------

  protected onNativeInput(event: Event): void {
    const text = (event.target as HTMLTextAreaElement).value;
    this.liveText.set(text);
    this.inputChange.emit({ text, event });
    const previous = this.lastText;
    this.lastText = text;
    if (this.core.noteTextChange(previous, text)) this.publishMentions();
    this.refreshQuery();
    if (this.composing) return;
    this.queueCommit(text, event);
  }

  protected override onCompositionCommit(event: Event): void {
    const el = this.nativeElement();
    if (el) this.queueCommit(el.value, event);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    if (this.core.opened() && !event.isComposing) {
      const command = ogeMentionKeyCommand(event.key);
      if (command === 'select') {
        const item = this.core.activeItem();
        if (item !== null) {
          event.preventDefault();
          this.insert(item, event);
          return;
        }
      } else if (command !== null) {
        event.preventDefault();
        this.core.move(command);
        return;
      }
    }
    if (event.key === 'Enter') this.handleEnterKey(event);
  }

  protected onKeyup(event: KeyboardEvent): void {
    // caret moves without input re-target (or close) the query
    if (
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      this.refreshQuery();
    }
  }

  /** Inserts `item` for the active query (keyboard or click). */
  protected insert(item: T, event: Event): void {
    const el = this.nativeElement();
    if (!el) return;
    const text = el.value;
    const caret = el.selectionStart ?? text.length;
    const result = this.core.select(item, text, caret);
    if (!result) return;
    const next = result.insertion.text;
    el.value = next;
    this.liveText.set(next);
    this.lastText = next;
    el.focus();
    el.setSelectionRange(result.insertion.caret, result.insertion.caret);
    this.commitNow(next, event);
    this.publishMentions();
    this.mentionSelected.emit({ token: result.token, item, event });
  }

  /** Re-reads the trigger query at the caret. */
  protected refreshQuery(): void {
    const el = this.nativeElement();
    if (!el || this.effectiveDisabled() || this.readonly()) return;
    const text = el.value;
    const caret = el.selectionStart ?? text.length;
    const open = this.core.update(text, caret);
    const query = this.core.query();
    if (open && query) {
      this.caretRect = ogeCaretRect(el, query.start);
      this.panel.updatePosition();
    }
  }

  private publishMentions(): void {
    const tokens = this.core.tokens();
    this.lastMentions = tokens;
    this.mentions.set(tokens);
  }

  // --- base contract ---------------------------------------------------------

  protected override onFocusChanged(focused: boolean): void {
    if (!focused) this.core.close();
  }

  protected nativeElement(): HTMLTextAreaElement | HTMLInputElement | null {
    return this.native()?.nativeElement ?? null;
  }

  protected emptyValue(): string {
    return '';
  }

  protected valueIsEmpty(value: string): boolean {
    return value === '';
  }
}
