import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
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
import { DOCUMENT } from '@angular/common';
import {
  OgeActionSheetCore,
  ogeCommandPaletteFirstActive,
  ogeCommandPaletteKeyIntent,
  ogeCommandPaletteOptions,
  ogeCommandPaletteRecent,
  ogeCommandPaletteSections,
  ogeFormatMessage,
  ogeFormatShortcut,
  ogeMatchesShortcut,
  ogeOverlayMessage,
  type OgeCommand,
} from '@oge-ui/behavior';
import { OGE_OVERLAY_CONFIG, type OgeOverlayMessages } from '../config';

let nextPaletteId = 0;

/** Payload of `commandExecute`. Set `keepOpen` to leave the palette open. */
export interface OgeCommandExecuteEvent {
  readonly command: OgeCommand;
  keepOpen: boolean;
}

/**
 * A command palette — a modal search box over every action of an app,
 * opened with Ctrl+K / ⌘K:
 *
 * ```html
 * <oge-command-palette [commands]="commands" (commandExecute)="run($event.command)" />
 * ```
 *
 * The query fuzzy-matches the labels (accent- and case-insensitive, word
 * starts first), the keywords and the descriptions; matches are grouped and
 * highlighted. An empty query lists the recently run commands first. The box
 * is an APG combobox over a listbox (`aria-activedescendant`, ↑ / ↓ wrap,
 * Page Up / Down, Ctrl+Home / End, Enter runs); the dialog is the shared
 * modal shell — focus trap, scroll lock, inert background, the Escape stack,
 * backdrop dismissal and focus restore.
 */
@Component({
  selector: 'oge-command-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-command-palette-host' },
  styleUrl: './command-palette.scss',
  template: `
    @if (opened()) {
      <div
        #layer
        class="oge-command-palette-layer"
        [class.oge-command-palette-ready]="ready()"
      >
        <div
          #panel
          class="oge-command-palette"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="label()"
        >
          <div class="oge-command-palette-search">
            <svg
              class="oge-command-palette-search-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              #input
              class="oge-command-palette-input"
              type="text"
              role="combobox"
              autocomplete="off"
              spellcheck="false"
              aria-autocomplete="list"
              aria-expanded="true"
              [attr.aria-controls]="listId"
              [attr.aria-activedescendant]="activeId()"
              [attr.aria-label]="label()"
              [placeholder]="placeholderText()"
              [value]="query()"
              (input)="onInput($event)"
              (keydown)="onKeydown($event)"
            />
          </div>
          <div
            class="oge-command-palette-list"
            role="listbox"
            [id]="listId"
            [attr.aria-label]="label()"
          >
            @for (section of sections(); track section.key) {
              <div
                class="oge-command-palette-group"
                role="group"
                [attr.aria-labelledby]="
                  section.recent || section.group ? groupId(section.key) : null
                "
              >
                @if (section.recent || section.group) {
                  <div
                    class="oge-command-palette-group-label"
                    role="presentation"
                    [id]="groupId(section.key)"
                  >
                    {{ section.recent ? recentLabel() : section.group }}
                  </div>
                }
                @for (option of section.options; track option.command.id) {
                  <!-- options stay unfocusable: focus lives in the combobox, which
                       drives them through aria-activedescendant (APG) and owns the keys -->
                  <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
                  <div
                    class="oge-command-palette-option"
                    role="option"
                    [id]="optionId(option.index)"
                    [class.oge-command-palette-option-active]="
                      option.index === active()
                    "
                    [attr.aria-selected]="option.index === active()"
                    [attr.aria-disabled]="option.command.disabled ? true : null"
                    (pointermove)="hover(option.index)"
                    (mousedown)="$event.preventDefault()"
                    (click)="execute(option.index)"
                  >
                    @if (option.command.icon) {
                      <svg
                        class="oge-command-palette-icon"
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path [attr.d]="option.command.icon" />
                      </svg>
                    }
                    <span class="oge-command-palette-text">
                      <span class="oge-command-palette-label">
                        @for (segment of option.segments; track $index) {
                          @if (segment.match) {
                            <mark class="oge-command-palette-match">{{
                              segment.text
                            }}</mark>
                          } @else {
                            <!-- an element, so template whitespace never splits the label -->
                            <span>{{ segment.text }}</span>
                          }
                        }
                      </span>
                      @if (option.command.description) {
                        <span class="oge-command-palette-description">{{
                          option.command.description
                        }}</span>
                      }
                    </span>
                    @if (option.command.shortcut) {
                      <kbd class="oge-command-palette-shortcut">{{
                        shortcutText(option.command.shortcut)
                      }}</kbd>
                    }
                  </div>
                }
              </div>
            } @empty {
              <div class="oge-command-palette-empty" role="presentation">
                {{ emptyText() }}
              </div>
            }
          </div>
          <span class="oge-command-palette-status" role="status">{{
            status()
          }}</span>
        </div>
      </div>
    }
  `,
})
export class OgeCommandPalette {
  private readonly config = inject(OGE_OVERLAY_CONFIG);
  private readonly document = inject(DOCUMENT);

  /** The commands, in order. */
  readonly commands = input.required<readonly OgeCommand[]>();
  /** Two-way open state. */
  readonly opened = model(false);
  /** Global shortcut that toggles the palette (default `'Mod+K'`); `null` turns it off. */
  readonly hotkey = input<string | null>('Mod+K');
  /** Placeholder of the search box; falls back to the `commandPalettePlaceholder` message. */
  readonly placeholder = input<string | undefined>(undefined);
  /** How many recently run commands to list above an empty query (default 5; 0 turns it off). */
  readonly recentLimit = input(5);
  /** Upper bound of listed matches for a query (default 50). */
  readonly maxResults = input(50);
  /** Ids of the recently run commands, newest first — two-way, so an app can persist it. */
  readonly recent = model<readonly string[]>([]);
  /** Per-instance message overrides. */
  readonly messages = input<Partial<OgeOverlayMessages>>();

  /** A command was chosen (after its own `run`); set `keepOpen` to stay open. */
  readonly commandExecute = output<OgeCommandExecuteEvent>();
  /** The query changed. */
  readonly queryChange = output<string>();

  private readonly layerEl = viewChild<ElementRef<HTMLElement>>('layer');
  private readonly panelEl = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('input');

  private readonly uid = `oge-command-palette-${nextPaletteId++}`;
  protected readonly listId = `${this.uid}-list`;

  protected readonly query = signal('');
  protected readonly active = signal(-1);
  protected readonly ready = signal(false);

  private readonly mergedMessages = computed(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));
  protected readonly label = computed(() =>
    ogeOverlayMessage(this.mergedMessages(), 'commandPaletteLabel'),
  );
  protected readonly placeholderText = computed(
    () =>
      this.placeholder() ??
      ogeOverlayMessage(this.mergedMessages(), 'commandPalettePlaceholder'),
  );
  protected readonly emptyText = computed(() =>
    ogeOverlayMessage(this.mergedMessages(), 'commandPaletteEmpty'),
  );
  protected readonly recentLabel = computed(() =>
    ogeOverlayMessage(this.mergedMessages(), 'commandPaletteRecent'),
  );
  protected readonly sections = computed(() =>
    ogeCommandPaletteSections(this.commands(), this.query(), {
      recent: this.recentLimit() > 0 ? this.recent() : [],
      limit: this.maxResults(),
    }),
  );
  private readonly options = computed(() =>
    ogeCommandPaletteOptions(this.sections()),
  );
  protected readonly activeId = computed(() =>
    this.active() >= 0 ? this.optionId(this.active()) : null,
  );
  protected readonly status = computed(() =>
    this.query().trim()
      ? ogeFormatMessage(
          ogeOverlayMessage(this.mergedMessages(), 'commandPaletteResults'),
          { count: this.options().length },
        )
      : '',
  );

  private readonly core = new OgeActionSheetCore({
    layer: () => this.layerEl()?.nativeElement ?? null,
    sheet: () => this.panelEl()?.nativeElement ?? null,
    onDismiss: () => this.close(),
  });

  constructor() {
    // a new list makes its first runnable option active
    effect(() => {
      const first = ogeCommandPaletteFirstActive(this.options());
      untracked(() => this.active.set(first));
    });
    let portaled: HTMLElement | null = null;
    let wasOpen = false;
    effect(() => {
      const open = this.opened();
      untracked(() => {
        if (open) {
          this.core.arm();
        } else if (!wasOpen && this.core.isArmed()) {
          this.core.deactivate();
        }
      });
    });
    afterRenderEffect(() => {
      const layer = this.layerEl()?.nativeElement ?? null;
      untracked(() => {
        if (layer) {
          if (layer.parentElement !== layer.ownerDocument.body) {
            layer.ownerDocument.body.appendChild(layer);
          }
          portaled = layer;
          if (!wasOpen) {
            wasOpen = true;
            this.core.activate();
            this.inputEl()?.nativeElement.focus({ preventScroll: true });
            requestAnimationFrame(() => this.ready.set(true));
          }
        } else if (wasOpen) {
          wasOpen = false;
          portaled = null;
          this.ready.set(false);
          this.core.deactivate();
          this.setQuery('');
        }
      });
    });
    // the active option stays in view as the keys move it
    afterRenderEffect(() => {
      const id = this.activeId();
      const panel = this.panelEl()?.nativeElement;
      if (!id || !panel) return;
      untracked(() =>
        panel.ownerDocument
          .getElementById(id)
          ?.scrollIntoView?.({ block: 'nearest' }),
      );
    });
    const onHotkey = (event: KeyboardEvent) => {
      const hotkey = this.hotkey();
      if (!hotkey || event.defaultPrevented) return;
      if (!ogeMatchesShortcut(event, hotkey)) return;
      event.preventDefault();
      if (this.opened()) this.close();
      else this.open();
    };
    this.document.addEventListener('keydown', onHotkey);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('keydown', onHotkey);
      this.core.destroy();
      portaled?.remove();
      portaled = null;
    });
  }

  /** Opens the palette with an empty query. */
  open(): void {
    if (this.opened()) return;
    this.setQuery('');
    this.opened.set(true);
    this.core.arm();
  }

  /** Closes the palette; focus returns to where it was. */
  close(): void {
    this.opened.set(false);
  }

  /** Opens a closed palette, closes an open one. */
  toggle(): void {
    if (this.opened()) this.close();
    else this.open();
  }

  protected groupId(key: string): string {
    return `${this.uid}-${key.replace(/[^\w-]/g, '_')}`;
  }

  protected optionId(index: number): string {
    return `${this.uid}-option-${index}`;
  }

  protected shortcutText(shortcut: string): string {
    return ogeFormatShortcut(shortcut);
  }

  protected onInput(event: Event): void {
    this.setQuery((event.target as HTMLInputElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const intent = ogeCommandPaletteKeyIntent(
      event,
      this.active(),
      this.options(),
    );
    if (!intent) return;
    event.preventDefault();
    if (intent.kind === 'run') this.execute(intent.index);
    else this.active.set(intent.index);
  }

  protected hover(index: number): void {
    if (!this.options()[index]?.command.disabled) this.active.set(index);
  }

  protected execute(index: number): void {
    const command = this.options()[index]?.command;
    if (!command || command.disabled) return;
    this.recent.update((recent) =>
      ogeCommandPaletteRecent(recent, command.id, this.recentLimit()),
    );
    command.run?.();
    const event: OgeCommandExecuteEvent = { command, keepOpen: false };
    this.commandExecute.emit(event);
    if (!event.keepOpen) this.close();
  }

  private setQuery(value: string): void {
    if (value === this.query()) return;
    this.query.set(value);
    this.queryChange.emit(value);
  }
}
