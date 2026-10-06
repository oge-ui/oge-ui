import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  NgControl,
  type ControlValueAccessor,
  type ValidationErrors,
} from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';
import {
  OGE_DEFAULT_EDITOR_TOOLBAR,
  OgeEditorCore,
  buildOgeEditorToolbar,
  mergeOgeEditorMessages,
  ogeEditorBlockFormatCommand,
  ogeEditorBlockFormatMenu,
  ogeEditorCommandFromName,
  ogeEditorCounterText,
  ogeEditorCssLength,
  ogeEditorDescribedBy,
  ogeEditorErrorText,
  ogeEditorImagePrompts,
  ogeEditorLinkCommand,
  ogeEditorLinkPrompt,
  ogeEditorToolAction,
  ogeEditorToolbarItems,
  type OgeColorPalettePreset,
  type OgeEditorActiveState,
  type OgeEditorBlockFormatValue,
  type OgeEditorCommand,
  type OgeEditorCommandExecutedEvent,
  type OgeEditorCommandName,
  type OgeEditorConfig,
  type OgeEditorCounterMode,
  type OgeEditorDialogOpeningEvent,
  type OgeEditorFocusEvent,
  type OgeEditorHeadingLevel,
  type OgeEditorMessages,
  type OgeEditorMessagesInput,
  type OgeEditorPasteMode,
  type OgeEditorPastingEvent,
  type OgeEditorPopupKind,
  type OgeEditorSelectionChangedEvent,
  type OgeEditorToolClickEvent,
  type OgeEditorToolView,
  type OgeEditorToolbarEntry,
  type OgeEditorValueCommittedEvent,
  type OgeFieldError,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
} from '@oge-ui/behavior';
import { OgeColorPalette } from '@oge-ui/inputs/color-palette';
import {
  OgeToolbar,
  OgeToolbarItemTemplate,
  type OgeToolbarItemClickEvent,
  type OgeToolbarOverflow,
} from '@oge-ui/layout/toolbar';
import {
  OgeAnchoredPanel,
  OgeMenuList,
  OgeModalService,
  OgePopup,
  type OgeMenuCloseRequestEvent,
  type OgeMenuListItemClickEvent,
} from '@oge-ui/overlay';
import { OGE_EDITOR_CONFIG } from '../config';

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

let nextEditorId = 0;

/**
 * A rich-text editor as a form field. The value is sanitized HTML; the
 * editing surface is a `contenteditable` element driven by a document model
 * of its own (`@oge-ui/behavior`'s `OgeEditorCore`) — no
 * `document.execCommand`, so every browser produces the same markup:
 *
 * ```html
 * <oge-editor label="Description" [(value)]="html" />
 * <oge-editor [formControl]="body" [maxLength]="2000" counter="characters" />
 * <oge-editor [toolbar]="['bold', 'italic', 'link', 'separator', 'bulletList']" />
 * ```
 *
 * Headings, quotes, code blocks, bulleted and numbered lists (Tab /
 * Shift+Tab nest them), links, images by URL, colours, alignment and its own
 * undo history; Ctrl+B / I / U / K / Z / Y and the other shortcuts are listed
 * in each tool's tooltip; `# `, `- `, `1. `, `> ` turn into formats as you
 * type. Pasted Word and Google Docs content is cleaned, and every value —
 * typed, pasted or bound — goes through the same allowlist sanitizer, so the
 * HTML never carries scripts, event handlers or unsafe URLs. Works standalone
 * via `[(value)]`, with Signal Forms via `[formField]`, and with
 * reactive/template forms via `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    OgeToolbar,
    OgeToolbarItemTemplate,
    OgePopup,
    OgeMenuList,
    OgeColorPalette,
  ],
  styleUrl: './editor.scss',
  host: {
    class: 'oge-editor',
    '[class.oge-editor-focused]': 'focusedSig()',
    '[class.oge-editor-disabled]': 'effectiveDisabled()',
    '[class.oge-editor-readonly]': 'readonly()',
    '[class.oge-editor-invalid]': 'showError()',
    '[class.oge-editor-resizable]': 'resizable()',
    '[class.oge-editor-empty]': 'core.empty()',
    '[style.--oge-editor-height]': 'heightCss()',
    '[style.--oge-editor-min-height]': 'minHeightCss()',
    '[style.--oge-editor-max-height]': 'maxHeightCss()',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    @if (label()) {
      <span
        class="oge-editor-label"
        [id]="labelId"
        (pointerdown)="onLabelPointerDown($event)"
        >{{ label() }}
        @if (required()) {
          <span class="oge-editor-required" aria-hidden="true">*</span>
        }
      </span>
    }
    <div class="oge-editor-frame">
      @if (toolViews().length > 0) {
        <oge-toolbar
          class="oge-editor-toolbar"
          size="sm"
          stylingMode="flat"
          [items]="toolbarItems()"
          [overflow]="toolbarOverflow()"
          [ariaLabel]="toolbarLabel()"
          [disabled]="effectiveDisabled()"
          (itemClick)="onToolbarItemClick($event)"
        >
          <ng-template ogeToolbarItemTemplate let-item>
            @let view = toolView(item?.key);
            @if (view) {
              @if (view.kind === 'separator') {
                <span
                  class="oge-toolbar-separator"
                  role="separator"
                  aria-orientation="vertical"
                ></span>
              } @else {
                <button
                  type="button"
                  class="oge-toolbar-btn oge-editor-tool"
                  [class.oge-editor-tool-active]="view.active === true"
                  [class.oge-editor-tool-mirror]="view.mirror"
                  [class.oge-editor-tool-text]="
                    view.kind === 'menu' || !view.icon
                  "
                  [attr.data-oge-editor-tool]="view.key"
                  [attr.aria-label]="
                    view.kind === 'menu'
                      ? view.text + ': ' + view.valueText
                      : view.text
                  "
                  [attr.aria-pressed]="
                    view.active === undefined ? null : view.active
                  "
                  [attr.aria-haspopup]="view.hasPopup ?? null"
                  [attr.aria-expanded]="
                    view.hasPopup ? popupKey() === view.key : null
                  "
                  [attr.aria-keyshortcuts]="view.shortcut ?? null"
                  [attr.title]="view.hint"
                  [disabled]="view.disabled"
                  (mousedown)="$event.preventDefault()"
                  (click)="onToolClick(view, $event)"
                >
                  @if (view.kind === 'menu') {
                    <span class="oge-editor-tool-value">{{
                      view.valueText
                    }}</span>
                    <svg
                      class="oge-editor-tool-chevron"
                      viewBox="0 0 16 16"
                      width="12"
                      height="12"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m4 6 4 4 4-4" />
                    </svg>
                  } @else if (view.icon) {
                    <svg
                      class="oge-toolbar-icon"
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path [attr.d]="view.icon" />
                    </svg>
                    @if (view.kind === 'color') {
                      <span
                        class="oge-editor-tool-swatch"
                        aria-hidden="true"
                        [class.oge-editor-tool-swatch-none]="!view.swatch"
                        [style.background-color]="view.swatch ?? null"
                      ></span>
                    }
                  } @else {
                    <span class="oge-editor-tool-value">{{ view.text }}</span>
                  }
                </button>
              }
            }
          </ng-template>
        </oge-toolbar>
      }
      <div class="oge-editor-body">
        <div
          #content
          class="oge-editor-content"
          role="textbox"
          aria-multiline="true"
          [id]="contentId"
          [attr.contenteditable]="editable() ? 'true' : 'false'"
          [tabindex]="effectiveDisabled() ? -1 : tabIndex()"
          [attr.aria-labelledby]="label() ? labelId : null"
          [attr.aria-label]="
            label() ? null : (ariaLabel() ?? msg().editorLabel)
          "
          [attr.aria-describedby]="describedBy()"
          [attr.aria-required]="required() ? 'true' : null"
          [attr.aria-invalid]="showError() ? 'true' : null"
          [attr.aria-readonly]="readonly() ? 'true' : null"
          [attr.aria-disabled]="effectiveDisabled() ? 'true' : null"
          [attr.aria-placeholder]="placeholder() || null"
          [attr.spellcheck]="spellcheck() ? 'true' : 'false'"
          [attr.data-name]="name() || null"
        ></div>
        @if (placeholder() && core.empty()) {
          <div class="oge-editor-placeholder" aria-hidden="true">
            {{ placeholder() }}
          </div>
        }
      </div>
    </div>
    @if (subscriptVisible()) {
      <div class="oge-editor-subscript">
        @if (showError() && resolvedErrorText(); as error) {
          <span class="oge-editor-error" [id]="errorId">{{ error }}</span>
        } @else if (hint()) {
          <span class="oge-editor-hint" [id]="hintId">{{ hint() }}</span>
        }
        @if (counterText(); as counter) {
          <span
            class="oge-editor-counter"
            [class.oge-editor-counter-over]="overLimit()"
            [id]="counterId"
            >{{ counter }}</span
          >
        }
      </div>
    }
    @if (popupKey(); as kind) {
      <oge-popup [panel]="panel">
        @if (kind === 'blockFormat') {
          <oge-menu-list
            [items]="blockFormatItems()"
            [ariaLabel]="msg().tools.blockFormat"
            (itemClick)="onBlockFormatPick($event)"
            (closeRequest)="onMenuCloseRequest($event)"
          />
        } @else {
          <div
            class="oge-editor-color-popup"
            role="dialog"
            [attr.aria-label]="
              kind === 'textColor'
                ? msg().colors.textColorLabel
                : msg().colors.backgroundColorLabel
            "
          >
            <oge-color-palette
              [palette]="
                kind === 'textColor' ? textPalette() : backgroundPalette()
              "
              [label]="
                kind === 'textColor'
                  ? msg().colors.textColorLabel
                  : msg().colors.backgroundColorLabel
              "
              [value]="
                kind === 'textColor'
                  ? core.active().color
                  : core.active().background
              "
              (valueCommitted)="onColorPick($event.value)"
            />
            <button
              type="button"
              class="oge-editor-color-none"
              (click)="onColorPick(null)"
            >
              {{ msg().colors.removeColor }}
            </button>
          </div>
        }
      </oge-popup>
    }
  `,
})
export class OgeEditor
  implements ControlValueAccessor, FormValueControl<string>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly config = inject(OGE_EDITOR_CONFIG);
  private readonly modals = inject(OgeModalService);
  /** Present when the editor is bound via reactive/template forms. */
  readonly ngControl = inject(NgControl, { optional: true, self: true });

  // --- value & forms contract --------------------------------------------------

  /** The sanitized HTML value (`''` when empty) — two-way. */
  readonly value = model<string>('');
  readonly disabled = input(false);
  /** Focusable and selectable, but not editable. */
  readonly readonly = input(false);
  readonly required = input(false);
  /** Native-style `name` (written as `data-name` on the editing surface). */
  readonly name = input('');
  /** External invalid override — combined with the forms state. */
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly dirty = input(false);
  /** Signal Forms validation errors (auto-bound by `[formField]`). */
  readonly errors = input<readonly OgeFieldError[]>([]);
  /** Most characters (grapheme clusters) the text may hold; typing and pasting stop there. */
  readonly maxLength = input<number | undefined>(undefined);

  // --- chrome ---------------------------------------------------------------------

  /** Visible label above the editor; also its accessible name. */
  readonly label = input('');
  /** Accessible name when there is no visible `label`. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Shown while the document is empty (also `aria-placeholder`). */
  readonly placeholder = input('');
  /** Helper text under the editor (hidden while an error shows). */
  readonly hint = input<string | undefined>(undefined);
  /** Explicit error message — always wins over resolved messages. */
  readonly errorText = input<string | undefined>(undefined);
  /** Character / word counter under the editor. */
  readonly counter = input<OgeEditorCounterMode>('none');
  /** Toolbar entries; `false` hides the toolbar. Default: the full toolbar. */
  readonly toolbar = input<
    readonly OgeEditorToolbarEntry[] | false | undefined
  >(undefined);
  /** How the toolbar handles tools that do not fit. */
  readonly toolbarOverflow = input<OgeToolbarOverflow>('menu');
  /** Height of the editing area — a number is px, a string any CSS length. */
  readonly height = input<number | string | undefined>(undefined);
  readonly minHeight = input<number | string | undefined>(undefined);
  readonly maxHeight = input<number | string | undefined>(undefined);
  /** Lets the user drag the editing area taller (vertical resize handle). */
  readonly resizable = input(false);
  readonly spellcheck = input(true);
  readonly tabIndex = input(0);
  /** Focuses the editor after its first render. */
  readonly autofocus = input(false);
  /** Base for the generated element ids. */
  readonly id = input<string | undefined>(undefined);

  // --- behaviour overrides (undefined = config) ------------------------------------

  readonly markdownShortcuts = input<boolean | undefined>(undefined);
  readonly pasteMode = input<OgeEditorPasteMode | undefined>(undefined);
  readonly headingLevels = input<readonly OgeEditorHeadingLevel[] | undefined>(
    undefined,
  );
  readonly textColors = input<
    OgeColorPalettePreset | readonly string[] | undefined
  >(undefined);
  readonly backgroundColors = input<
    OgeColorPalettePreset | readonly string[] | undefined
  >(undefined);
  /** Extra link schemes allowed on top of the default allowlist. */
  readonly allowedSchemes = input<readonly string[] | undefined>(undefined);
  /** Keep `data:image/*` sources. */
  readonly allowDataImages = input<boolean | undefined>(undefined);
  /** Per-instance overrides of user-facing strings. */
  readonly messages = input<OgeEditorMessagesInput | undefined>(undefined);

  // --- outputs ----------------------------------------------------------------------

  /** Every committed change, with `previousValue` and the originating DOM event. */
  readonly valueCommitted = output<OgeEditorValueCommittedEvent>();
  readonly focused = output<OgeEditorFocusEvent>();
  readonly blurred = output<OgeEditorFocusEvent>();
  /** FormValueControl contract — emitted once per blur. */
  readonly touch = output<void>();
  /** The selection moved or its formats changed. */
  readonly selectionChanged = output<OgeEditorSelectionChangedEvent>();
  /** A command ran (keyboard, toolbar or `exec`). */
  readonly commandExecuted = output<OgeEditorCommandExecutedEvent>();
  /** A toolbar tool was activated. */
  readonly toolClick = output<OgeEditorToolClickEvent>();
  /** A paste or drop is about to be inserted — set `cancel`, or rewrite `html` / `text`. */
  readonly pasting = output<OgeEditorPastingEvent>();
  /** The link or image dialog is about to open — set `cancel` to show your own. */
  readonly dialogOpening = output<OgeEditorDialogOpeningEvent>();

  // --- ids ----------------------------------------------------------------------------

  private readonly uid = `oge-editor-${nextEditorId++}`;
  private readonly baseId = computed(() => this.id() ?? this.uid);
  get contentId(): string {
    return `${this.baseId()}-content`;
  }
  get labelId(): string {
    return `${this.baseId()}-label`;
  }
  get hintId(): string {
    return `${this.baseId()}-hint`;
  }
  get errorId(): string {
    return `${this.baseId()}-error`;
  }
  get counterId(): string {
    return `${this.baseId()}-counter`;
  }

  // --- state --------------------------------------------------------------------------

  /** Resolved strings: config, then the `messages` input. */
  readonly msg = computed<OgeEditorMessages>(() =>
    mergeOgeEditorMessages(this.config.messages, this.messages()),
  );

  private readonly resolvedConfig = computed<OgeEditorConfig>(() => {
    const config = this.config;
    return {
      headingLevels: this.headingLevels() ?? config.headingLevels,
      textColors: this.textColors() ?? config.textColors,
      backgroundColors: this.backgroundColors() ?? config.backgroundColors,
      markdownShortcuts: this.markdownShortcuts() ?? config.markdownShortcuts,
      pasteMode: this.pasteMode() ?? config.pasteMode,
      allowedSchemes: this.allowedSchemes() ?? config.allowedSchemes,
      allowDataImages: this.allowDataImages() ?? config.allowDataImages,
      historyLimit: config.historyLimit,
      locale: config.locale,
      messages: this.msg(),
    };
  });

  protected readonly focusedSig = signal(false);
  private readonly selfTouched = signal(false);
  private readonly selfDirty = signal(false);
  private readonly formsDisabled = signal(false);
  private readonly controlState = signal<{
    invalid: boolean;
    touched: boolean;
    errors: ValidationErrors | null;
  }>({ invalid: false, touched: false, errors: null });

  readonly effectiveDisabled = computed(
    () => this.disabled() || this.formsDisabled(),
  );
  protected readonly editable = computed(
    () => !this.effectiveDisabled() && !this.readonly(),
  );

  /** The editor machine (shared with the React editor). */
  protected readonly core = new OgeEditorCore(SIGNAL_ADAPTER, {
    options: () => ({
      config: this.resolvedConfig(),
      readOnly: this.readonly(),
      disabled: this.effectiveDisabled(),
      maxLength: this.maxLength(),
    }),
    valueChanged: (html, event) => this.commit(html, event),
    requestLink: () => void this.openLinkDialog(),
    pasting: (event) => this.pasting.emit(event),
    commandExecuted: (command, event) =>
      this.commandExecuted.emit({ command, event }),
  });

  /** The formats under the selection (what the toolbar shows). */
  readonly activeState = this.core.active;
  /** Characters (grapheme clusters) of the text. */
  readonly characterCount = this.core.characterCount;
  readonly wordCount = this.core.wordCount;
  readonly canUndo = this.core.canUndo;
  readonly canRedo = this.core.canRedo;

  protected readonly overLimit = computed(() => {
    const max = this.maxLength();
    return max !== undefined && this.core.characterCount() > max;
  });

  readonly effectiveTouched = computed(
    () => this.touched() || this.selfTouched() || this.controlState().touched,
  );
  readonly effectiveInvalid = computed(
    () =>
      this.invalid() ||
      this.errors().length > 0 ||
      this.controlState().invalid ||
      this.overLimit(),
  );
  /** Errors show once the field was touched (or immediately when over the limit). */
  readonly showError = computed(
    () =>
      this.effectiveInvalid() && (this.effectiveTouched() || this.overLimit()),
  );

  protected readonly resolvedErrorText = computed(() =>
    ogeEditorErrorText(
      {
        explicit: this.errorText(),
        errors: this.errors(),
        controlErrors: this.controlState().errors,
        overLimit: this.overLimit(),
        characters: this.core.characterCount(),
        maxLength: this.maxLength(),
        invalid: this.invalid(),
      },
      this.msg(),
      this.config.locale,
    ),
  );

  protected readonly counterText = computed(() =>
    ogeEditorCounterText(
      this.counter(),
      this.core.characterCount(),
      this.core.wordCount(),
      this.maxLength(),
      this.msg(),
      this.config.locale,
    ),
  );

  protected readonly subscriptVisible = computed(
    () =>
      this.counterText() !== null ||
      !!this.hint() ||
      (this.showError() && this.resolvedErrorText() !== null),
  );

  protected readonly describedBy = computed(() =>
    ogeEditorDescribedBy({
      error: this.showError() && this.resolvedErrorText() ? this.errorId : null,
      hint: this.hint() ? this.hintId : null,
      counter: this.counterText() !== null ? this.counterId : null,
    }),
  );

  protected readonly heightCss = computed(() =>
    ogeEditorCssLength(this.height()),
  );
  protected readonly minHeightCss = computed(() =>
    ogeEditorCssLength(this.minHeight()),
  );
  protected readonly maxHeightCss = computed(() =>
    ogeEditorCssLength(this.maxHeight()),
  );

  // --- toolbar --------------------------------------------------------------------------

  protected readonly toolViews = computed<OgeEditorToolView[]>(() => {
    const entries = this.toolbar();
    if (entries === false) return [];
    return buildOgeEditorToolbar(entries ?? OGE_DEFAULT_EDITOR_TOOLBAR, {
      active: this.core.active(),
      messages: this.msg(),
      mac: this.core.mac,
      canUndo: this.core.canUndo(),
      canRedo: this.core.canRedo(),
      inert: !this.editable(),
    });
  });
  private readonly viewMap = computed(
    () => new Map(this.toolViews().map((view) => [view.key, view])),
  );
  protected readonly toolbarItems = computed(() =>
    ogeEditorToolbarItems(this.toolViews()),
  );
  protected readonly toolbarLabel = computed(() => this.msg().toolbarLabel);

  protected readonly blockFormatItems = computed(() =>
    ogeEditorBlockFormatMenu(
      this.core.active().blockFormat,
      this.resolvedConfig().headingLevels,
      this.msg(),
    ),
  );
  protected readonly textPalette = computed(
    () => this.resolvedConfig().textColors,
  );
  protected readonly backgroundPalette = computed(
    () => this.resolvedConfig().backgroundColors,
  );

  /** The open toolbar popup. */
  protected readonly popupKey = signal<OgeEditorPopupKind | null>(null);
  private popupAnchor: HTMLElement | null = null;
  private popupReturnFocus: HTMLElement | null = null;
  private readonly popupRef = viewChild(OgePopup, {
    read: ElementRef<HTMLElement>,
  });
  private readonly menuList = viewChild(OgeMenuList);
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');

  protected readonly panel = new OgeAnchoredPanel({
    anchor: () => this.popupAnchor,
    panel: () => this.popupRef()?.nativeElement ?? null,
    placement: () => 'bottom-start',
    restoreFocus: () => {
      const target = this.popupReturnFocus;
      this.popupReturnFocus = null;
      if (target && target.isConnected) target.focus();
      else this.core.focus();
    },
    onClosed: () => this.popupKey.set(null),
  });

  // --- forms plumbing -----------------------------------------------------------------

  private onChangeFn: ((value: string) => void) | null = null;
  private onTouchedFn: (() => void) | null = null;
  private committing = false;
  private boundControl: object | null = null;

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
    // a bound value (parent [(value)], Signal Forms, writeValue) loads into
    // the model; the editor's own echo is ignored by the core
    effect(() => {
      const value = this.value();
      untracked(() => {
        if (!this.committing) this.core.setValue(value);
      });
    });
    let lastActive: OgeEditorActiveState | null = null;
    effect(() => {
      const active = this.core.active();
      untracked(() => {
        if (lastActive !== null && active !== lastActive) {
          this.selectionChanged.emit({ active });
        }
        lastActive = active;
      });
    });
    afterNextRender(() => {
      const element = this.content()?.nativeElement;
      if (element) this.core.attach(element);
      this.bindControlEvents();
      if (this.autofocus()) this.focus();
    });
    this.destroyRef.onDestroy(() => {
      this.core.destroy();
      this.panel.destroy();
    });
  }

  // --- public API ---------------------------------------------------------------------

  /** Moves keyboard focus into the editing area and restores the caret. */
  focus(): void {
    this.core.focus();
  }

  /** Removes keyboard focus. */
  blur(): void {
    this.content()?.nativeElement.blur();
  }

  /** Runs an editor command — a name (`'bold'`) or a command object. Returns `true` when it changed something. */
  exec(command: OgeEditorCommandName | OgeEditorCommand): boolean {
    const resolved =
      typeof command === 'string' ? ogeEditorCommandFromName(command) : command;
    return this.core.exec(resolved);
  }

  undo(): boolean {
    return this.core.undo();
  }

  redo(): boolean {
    return this.core.redo();
  }

  /** Inserts plain text at the selection. */
  insertText(text: string): void {
    this.core.insertText(text);
  }

  /** Inserts HTML at the selection — sanitized through the editor's allowlist first. */
  insertHtml(html: string): void {
    this.core.insertHtml(html);
  }

  /** Links the selection (or inserts `text` as a link). Unsafe addresses are refused. */
  insertLink(href: string, text?: string, newTab = false): boolean {
    return this.core.exec({ type: 'link', href, text, newTab });
  }

  /** Removes the link under the selection. */
  removeLink(): boolean {
    return this.core.exec({ type: 'link', href: null });
  }

  /** Inserts an image by URL. Unsafe sources are refused. */
  insertImage(src: string, alt = ''): boolean {
    return this.core.exec({ type: 'image', src, alt });
  }

  /** Selects the whole document. */
  selectAll(): void {
    this.core.exec({ type: 'selectAll' });
  }

  /** The current value. */
  getHtml(): string {
    return this.core.getHtml();
  }

  /** The text, blocks separated by newlines. */
  getText(): string {
    return this.core.getText();
  }

  /** Empties the editor (one undoable change). */
  clear(): void {
    if (!this.editable()) return;
    this.core.exec({ type: 'selectAll' });
    this.core.exec({ type: 'insertText', text: '' });
  }

  /** Returns to a pristine state with `value` (default: empty); history is cleared. */
  reset(value = ''): void {
    const control = this.ngControl?.control;
    if (
      control &&
      typeof (control as { events?: { subscribe?: unknown } }).events
        ?.subscribe === 'function'
    ) {
      control.reset(value);
      return;
    }
    const previousValue = this.value();
    this.value.set(value);
    this.core.setValue(value);
    this.selfTouched.set(false);
    this.selfDirty.set(false);
    if (previousValue !== value) {
      this.valueCommitted.emit({ value, previousValue, event: undefined });
    }
  }

  /** Opens the link dialog for the selection. */
  async openLinkDialog(event?: Event): Promise<void> {
    if (!this.editable()) return;
    this.core.syncSelectionFromDom();
    const link = this.core.active().link;
    const pre: OgeEditorDialogOpeningEvent = {
      kind: 'link',
      link,
      cancel: false,
      event,
    };
    this.dialogOpening.emit(pre);
    if (pre.cancel) return;
    const selection = this.core.state().selection;
    const answer = await this.modals.prompt(
      ogeEditorLinkPrompt(link, this.msg(), this.urlOptions()),
    );
    this.core.state.set({ ...this.core.state(), selection });
    if (answer !== null)
      this.core.exec(ogeEditorLinkCommand(answer), event, true);
    this.focus();
  }

  /** Opens the image dialog (address, then alternative text). */
  async openImageDialog(event?: Event): Promise<void> {
    if (!this.editable()) return;
    this.core.syncSelectionFromDom();
    const pre: OgeEditorDialogOpeningEvent = {
      kind: 'image',
      link: null,
      cancel: false,
      event,
    };
    this.dialogOpening.emit(pre);
    if (pre.cancel) return;
    const selection = this.core.state().selection;
    const prompts = ogeEditorImagePrompts(this.msg(), this.urlOptions());
    const src = await this.modals.prompt(prompts.source);
    const alt = src === null ? null : await this.modals.prompt(prompts.alt);
    this.core.state.set({ ...this.core.state(), selection });
    if (src !== null && alt !== null) {
      this.core.exec(
        { type: 'image', src: src.trim(), alt: alt.trim() },
        event,
        true,
      );
    }
    this.focus();
  }

  // --- toolbar handlers -----------------------------------------------------------------

  protected toolView(key: string | undefined): OgeEditorToolView | undefined {
    return key === undefined ? undefined : this.viewMap().get(key);
  }

  protected onToolClick(view: OgeEditorToolView, event: MouseEvent): void {
    this.activateTool(view, event, event.currentTarget as HTMLElement, false);
  }

  protected onToolbarItemClick(event: OgeToolbarItemClickEvent): void {
    // the bar renders its own buttons through the item template; only the
    // overflow menu reports activations here
    if (!event.inMenu || !event.key) return;
    const view = this.toolView(event.key);
    if (view) this.activateTool(view, event.event, null, true);
  }

  private activateTool(
    view: OgeEditorToolView,
    event: Event,
    anchor: HTMLElement | null,
    inMenu: boolean,
  ): void {
    const action = ogeEditorToolAction(view);
    if (!action) return;
    this.toolClick.emit({ key: view.key, inMenu, event });
    this.core.syncSelectionFromDom();
    switch (action.type) {
      case 'command':
        this.core.exec(action.command, event, true);
        return;
      case 'custom':
        action.tool.run({
          exec: (command) => this.core.exec(command, event),
          insertHtml: (html) => this.core.insertHtml(html),
          insertText: (text) => this.core.insertText(text),
          getHtml: () => this.core.getHtml(),
          active: this.core.active(),
        });
        return;
      case 'dialog':
        if (action.dialog === 'link') void this.openLinkDialog(event);
        else void this.openImageDialog(event);
        return;
      case 'popup':
        this.openPopup(action.popup, anchor, event);
        return;
    }
  }

  private openPopup(
    kind: OgeEditorPopupKind,
    anchor: HTMLElement | null,
    event: Event,
  ): void {
    if (this.popupKey() === kind) {
      this.panel.close('api');
      return;
    }
    if (this.popupKey() !== null) this.panel.close('api');
    const doc = this.hostEl.nativeElement.ownerDocument;
    const active = doc.activeElement as HTMLElement | null;
    // keyboard users return to the tool; pointer users stay in the text
    this.popupReturnFocus =
      event instanceof KeyboardEvent || (event as MouseEvent).detail === 0
        ? active
        : null;
    this.popupAnchor =
      anchor ??
      this.hostEl.nativeElement.querySelector<HTMLElement>(
        '.oge-editor-toolbar',
      ) ??
      this.hostEl.nativeElement;
    this.popupKey.set(kind);
    this.panel.open();
    setTimeout(() => {
      if (kind === 'blockFormat') {
        this.menuList()?.focus('first');
      } else {
        const popup = this.popupRef()?.nativeElement as HTMLElement | undefined;
        popup?.querySelector<HTMLElement>('[tabindex="0"], button')?.focus();
      }
    });
  }

  protected onBlockFormatPick(event: OgeMenuListItemClickEvent): void {
    const command = ogeEditorBlockFormatCommand(
      event.item.value as OgeEditorBlockFormatValue,
    );
    this.panel.close('select');
    if (command) this.core.exec(command, event.event, true);
    this.core.focus();
  }

  protected onMenuCloseRequest(event: OgeMenuCloseRequestEvent): void {
    this.panel.close(event.reason);
  }

  protected onColorPick(color: string | null): void {
    const kind = this.popupKey();
    this.panel.close('select');
    if (kind === 'textColor')
      this.core.exec({ type: 'color', color }, undefined, true);
    else if (kind === 'backgroundColor')
      this.core.exec({ type: 'background', color }, undefined, true);
    this.core.focus();
  }

  protected onLabelPointerDown(event: PointerEvent): void {
    event.preventDefault();
    if (!this.effectiveDisabled()) this.focus();
  }

  // --- focus ------------------------------------------------------------------------------

  protected onFocusIn(event: FocusEvent): void {
    if (this.focusedSig()) return;
    this.focusedSig.set(true);
    this.focused.emit({ event });
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    const host = this.hostEl.nativeElement;
    if (
      next &&
      (host.contains(next) || this.popupRef()?.nativeElement.contains(next))
    )
      return;
    if (this.popupKey() !== null && next === null) return; // focus moving into the popup
    this.focusedSig.set(false);
    this.selfTouched.set(true);
    this.onTouchedFn?.();
    this.touch.emit();
    this.blurred.emit({ event });
  }

  // --- value plumbing ---------------------------------------------------------------------

  private urlOptions() {
    const config = this.resolvedConfig();
    return {
      allowedSchemes: config.allowedSchemes,
      allowDataImages: config.allowDataImages,
    };
  }

  private commit(html: string, event: Event | undefined): void {
    const previousValue = this.value();
    this.committing = true;
    try {
      this.value.set(html);
    } finally {
      this.committing = false;
    }
    this.onChangeFn?.(html);
    this.selfDirty.set(true);
    if (previousValue !== html) {
      this.valueCommitted.emit({ value: html, previousValue, event });
    }
  }

  // --- ControlValueAccessor ---------------------------------------------------------------

  writeValue(value: unknown): void {
    const next = typeof value === 'string' ? value : '';
    untracked(() => this.value.set(next));
    this.core.setValue(next);
    this.selfTouched.set(false);
    this.selfDirty.set(false);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChangeFn = fn;
    this.bindControlEvents();
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formsDisabled.set(disabled);
  }

  private bindControlEvents(): void {
    const control = this.ngControl?.control;
    if (
      !control ||
      typeof (control as { events?: { subscribe?: unknown } }).events
        ?.subscribe !== 'function'
    ) {
      return;
    }
    if (this.boundControl === control) return;
    this.boundControl = control;
    const sync = (): void =>
      this.controlState.set({
        invalid: control.invalid,
        touched: control.touched,
        errors: control.errors,
      });
    sync();
    const subscription = control.events.subscribe(sync);
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
}
