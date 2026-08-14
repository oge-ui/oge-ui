import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import {
  applyButtonGroupSelection,
  buttonGroupNavIndex,
  buttonGroupRole,
} from '@oge-ui/behavior';
import { OgeButton } from '../button/button';
import {
  OGE_BUTTON_GROUP,
  type OgeButtonGroupContext,
} from './button-group-context';
import type {
  OgeButtonGroupItem,
  OgeButtonGroupItemClickEvent,
  OgeButtonGroupSelectionChangedEvent,
  OgeButtonGroupSelectionMode,
} from './button-group-types';
import type {
  OgeButtonSeverity,
  OgeButtonSize,
  OgeButtonStylingMode,
} from '../button/button-types';

declare const ngDevMode: boolean | undefined;

/**
 * Segmented group of buttons with optional single/multiple selection.
 * Declarative children are the primary API; the `items` input renders
 * additional data-driven buttons after them:
 *
 * ```html
 * <oge-button-group selectionMode="single" [(selectedKeys)]="align" ariaLabel="Alignment">
 *   <oge-button value="left" text="Left" />
 *   <oge-button value="center" text="Center" />
 *   <oge-button value="right" text="Right" />
 * </oge-button-group>
 * ```
 *
 * Children inherit the group's `stylingMode`, `severity`, `size` and
 * `disabled` unless they set their own. Arrow keys move focus (roving
 * tabindex); in `single` mode they move the selection as well.
 */
@Component({
  selector: 'oge-button-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [{ provide: OGE_BUTTON_GROUP, useExisting: OgeButtonGroup }],
  imports: [OgeButton],
  host: {
    class: 'oge-button-group',
    '[class.oge-disabled]': 'disabled()',
    '[attr.role]': 'role()',
    '[attr.aria-label]': 'ariaLabel() ?? null',
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusin($event)',
  },
  styleUrl: './button-group.scss',
  template: `
    <ng-content />
    @for (item of items() ?? []; track item.value) {
      <oge-button
        [value]="item.value"
        [text]="item.text ?? ''"
        [hint]="item.hint"
        [disabled]="item.disabled ?? false"
        [severity]="item.severity"
        [badge]="item.badge"
      />
    }
  `,
})
export class OgeButtonGroup implements OgeButtonGroupContext {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Data-driven items rendered after projected `<oge-button>` children. */
  readonly items = input<readonly OgeButtonGroupItem[] | undefined>(undefined);
  readonly selectionMode = input<OgeButtonGroupSelectionMode>('none');
  /** Selected `value`s — two-way. `single` mode keeps at most one entry. */
  readonly selectedKeys = model<readonly string[]>([]);
  /** Fill style cascaded to children without their own. */
  readonly stylingMode = input<OgeButtonStylingMode>('contained');
  /** Semantic color cascaded to children without their own. */
  readonly severity = input<OgeButtonSeverity>('normal');
  /** Size preset cascaded to children without their own. */
  readonly size = input<OgeButtonSize>('md');
  /** Disables every button in the group. */
  readonly disabled = input(false);
  /** Accessible name of the toolbar/radiogroup/group element. */
  readonly ariaLabel = input<string | undefined>(undefined);

  /** Fires for every accepted child click, before any selection change. */
  readonly itemClick = output<OgeButtonGroupItemClickEvent>();
  /** Fires when `selectedKeys` changes through user interaction. */
  readonly selectionChanged = output<OgeButtonGroupSelectionChangedEvent>();

  private readonly contentButtons = contentChildren(OgeButton, {
    descendants: true,
  });
  private readonly viewButtons = viewChildren(OgeButton);
  /** All buttons in DOM order: projected children first, then `items`. */
  private readonly allButtons = computed<readonly OgeButton[]>(() => [
    ...this.contentButtons(),
    ...this.viewButtons(),
  ]);

  /** Last child that held focus — the roving-tabindex anchor. */
  private readonly focusedButton = signal<OgeButton | null>(null);

  protected readonly role = computed(() =>
    buttonGroupRole(this.selectionMode()),
  );

  /** The single button that carries `tabindex="0"`. */
  private readonly focusTarget = computed<OgeButton | null>(() => {
    const enabled = this.allButtons().filter((b) => !b.isDisabled());
    if (enabled.length === 0) return null;
    const focused = this.focusedButton();
    if (focused && enabled.includes(focused)) return focused;
    if (this.selectionMode() === 'single') {
      const keys = this.selectedKeys();
      const selected = enabled.find((b) => {
        const value = b.value();
        return value !== undefined && keys.includes(value);
      });
      if (selected) return selected;
    }
    return enabled[0];
  });

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      effect(() => {
        if (this.selectionMode() === 'none') return;
        if (this.allButtons().some((b) => b.value() === undefined)) {
          console.warn(
            '[oge-button-group] selectionMode is on but some buttons have no `value`; they cannot be selected.',
          );
        }
      });
    }
  }

  // --- OgeButtonGroupContext -------------------------------------------------

  isSelected(value: string | undefined): boolean {
    return value !== undefined && this.selectedKeys().includes(value);
  }

  tabIndexFor(button: object): number {
    return this.focusTarget() === button ? 0 : -1;
  }

  /** Moves keyboard focus to the roving-tabindex target button. */
  focus(): void {
    this.focusTarget()?.focus();
  }

  notifyClick(
    value: string | undefined,
    event: MouseEvent | KeyboardEvent,
    source?: object,
  ): void {
    const index = source ? this.allButtons().indexOf(source as OgeButton) : -1;
    const item =
      value !== undefined
        ? this.items()?.find((entry) => entry.value === value)
        : undefined;
    this.itemClick.emit({ value, event, item, index });
    // The no-unselect radio rule and the delta arithmetic live in `behavior`,
    // shared verbatim with the React group.
    const change = applyButtonGroupSelection(
      this.selectionMode(),
      this.selectedKeys(),
      value,
    );
    if (!change) return;
    this.selectedKeys.set(change.selectedKeys);
    this.selectionChanged.emit(change);
  }

  // --- keyboard navigation ---------------------------------------------------

  protected onFocusin(event: FocusEvent): void {
    const target = event.target as Node | null;
    if (!target) return;
    const button = this.allButtons().find((b) => b.hostContains(target));
    if (button) this.focusedButton.set(button);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const enabled = this.allButtons().filter((b) => !b.isDisabled());
    const current = this.focusTarget();
    const index = current ? enabled.indexOf(current) : -1;
    const rtl = getComputedStyle(this.host.nativeElement).direction === 'rtl';
    // The wrap-around/RTL arithmetic lives in `behavior`, shared verbatim
    // with the React group; -1 means "not a navigation key" (or no targets).
    const nextIndex = buttonGroupNavIndex(
      event.key,
      index,
      enabled.length,
      rtl,
    );
    if (nextIndex < 0) return;
    event.preventDefault();
    const next = enabled[nextIndex];
    this.focusedButton.set(next);
    next.focus();
    // WAI-ARIA radio-group pattern: arrows move the selection too.
    if (this.selectionMode() === 'single' && next.value() !== undefined) {
      this.notifyClick(next.value(), event, next);
    }
  }
}
