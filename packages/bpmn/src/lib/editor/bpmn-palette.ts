import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { BpmnPaletteItemType } from '../config';

/**
 * Internal elements palette of the BPMN editor: a vertical toolbar of real
 * buttons with a roving tabindex (APG toolbar), one per placeable node type.
 * Picking an entry arms the editor's click-then-place tool.
 */
@Component({
  selector: 'oge-bpmn-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-bpmn-palette',
    role: 'toolbar',
    'aria-orientation': 'vertical',
    '[attr.aria-label]': 'label()',
  },
  template: `
    @for (item of items(); track item; let i = $index) {
      <button
        type="button"
        class="oge-bpmn-palette-btn"
        [class.oge-bpmn-palette-active]="activeType() === item"
        [tabindex]="i === focusIndex() ? 0 : -1"
        [disabled]="disabled()"
        [attr.aria-pressed]="activeType() === item"
        [attr.aria-label]="labels()[item]"
        [title]="labels()[item]"
        (click)="toolPicked.emit(item)"
        (pointerdown)="onPointerDown(item, $event)"
        (keydown)="onKeydown($event, i)"
        (focus)="focusIndex.set(i)"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          @switch (item) {
            @case ('startEvent') {
              <circle cx="12" cy="12" r="8" class="oge-bpmn-glyph-thin" />
            }
            @case ('endEvent') {
              <circle cx="12" cy="12" r="8" class="oge-bpmn-glyph-thick" />
            }
            @case ('intermediateThrowEvent') {
              <circle cx="12" cy="12" r="8" class="oge-bpmn-glyph-thin" />
              <circle cx="12" cy="12" r="5.5" class="oge-bpmn-glyph-thin" />
              <circle cx="12" cy="12" r="1.5" class="oge-bpmn-glyph-fill" />
            }
            @case ('intermediateCatchEvent') {
              <circle cx="12" cy="12" r="8" class="oge-bpmn-glyph-thin" />
              <circle cx="12" cy="12" r="5.5" class="oge-bpmn-glyph-thin" />
            }
            @case ('boundaryEvent') {
              <circle cx="12" cy="12" r="8" class="oge-bpmn-glyph-dash" />
              <circle cx="12" cy="12" r="5.5" class="oge-bpmn-glyph-dash" />
            }
            @case ('task') {
              <rect
                x="4"
                y="6"
                width="16"
                height="12"
                rx="3"
                class="oge-bpmn-glyph-thin"
              />
            }
            @case ('userTask') {
              <rect
                x="4"
                y="6"
                width="16"
                height="12"
                rx="3"
                class="oge-bpmn-glyph-thin"
              />
              <circle cx="12" cy="10.5" r="1.6" class="oge-bpmn-glyph-thin" />
              <path
                d="M9.4 15.5c0-1.4 1.2-2.4 2.6-2.4s2.6 1 2.6 2.4"
                class="oge-bpmn-glyph-thin"
              />
            }
            @case ('serviceTask') {
              <rect
                x="4"
                y="6"
                width="16"
                height="12"
                rx="3"
                class="oge-bpmn-glyph-thin"
              />
              <circle cx="12" cy="12" r="2.2" class="oge-bpmn-glyph-thin" />
              <path
                d="M12 8.4v1.2M12 14.4v1.2M8.4 12h1.2M14.4 12h1.2"
                class="oge-bpmn-glyph-thin"
              />
            }
            @case ('scriptTask') {
              <rect
                x="4"
                y="6"
                width="16"
                height="12"
                rx="3"
                class="oge-bpmn-glyph-thin"
              />
              <path d="M8 10h8M8 12.5h8M8 15h5" class="oge-bpmn-glyph-thin" />
            }
            @case ('subProcess') {
              <rect
                x="4"
                y="6"
                width="16"
                height="12"
                rx="3"
                class="oge-bpmn-glyph-thin"
              />
              <path d="M9.5 15h5M12 12.5v5" class="oge-bpmn-glyph-thin" />
            }
            @case ('eventSubProcess') {
              <rect
                x="4"
                y="6"
                width="16"
                height="12"
                rx="3"
                class="oge-bpmn-glyph-dash"
              />
              <circle cx="12" cy="12" r="3" class="oge-bpmn-glyph-thin" />
            }
            @case ('transaction') {
              <rect
                x="4"
                y="6"
                width="16"
                height="12"
                rx="3"
                class="oge-bpmn-glyph-thin"
              />
              <rect
                x="6"
                y="8"
                width="12"
                height="8"
                rx="2"
                class="oge-bpmn-glyph-thin"
              />
            }
            @case ('callActivity') {
              <rect
                x="4"
                y="6"
                width="16"
                height="12"
                rx="3"
                class="oge-bpmn-glyph-thick"
              />
              <path d="M9.5 15h5M12 12.5v5" class="oge-bpmn-glyph-thin" />
            }
            @case ('exclusiveGateway') {
              <path d="M12 3 21 12 12 21 3 12Z" class="oge-bpmn-glyph-thin" />
              <path
                d="M9.5 9.5l5 5M14.5 9.5l-5 5"
                class="oge-bpmn-glyph-thin"
              />
            }
            @case ('parallelGateway') {
              <path d="M12 3 21 12 12 21 3 12Z" class="oge-bpmn-glyph-thin" />
              <path d="M12 8v8M8 12h8" class="oge-bpmn-glyph-thin" />
            }
            @case ('dataObject') {
              <path
                d="M7 4h7l4 4v12H7Z M14 4v4h4"
                class="oge-bpmn-glyph-thin"
              />
            }
            @case ('dataStore') {
              <path
                d="M5 7c0-1.7 3.1-3 7-3s7 1.3 7 3v10c0 1.7-3.1 3-7 3s-7-1.3-7-3Z"
                class="oge-bpmn-glyph-thin"
              />
              <path
                d="M5 7c0 1.7 3.1 3 7 3s7-1.3 7-3"
                class="oge-bpmn-glyph-thin"
              />
            }
            @case ('group') {
              <rect
                x="4"
                y="5"
                width="16"
                height="14"
                rx="3"
                class="oge-bpmn-glyph-dash"
              />
            }
            @case ('pool') {
              <rect
                x="3"
                y="6"
                width="18"
                height="12"
                class="oge-bpmn-glyph-thin"
              />
              <path d="M7 6v12" class="oge-bpmn-glyph-thin" />
            }
            @case ('textAnnotation') {
              <path d="M15 5H9v14h6" class="oge-bpmn-glyph-thin" />
              <path d="M12 9h7M12 12h7M12 15h5" class="oge-bpmn-glyph-hair" />
            }
          }
        </svg>
      </button>
    }
  `,
})
export class OgeBpmnPalette {
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Accessible name of the palette toolbar. */
  readonly label = input.required<string>();
  /** Node types offered by the palette, in render order. */
  readonly items = input.required<readonly BpmnPaletteItemType[]>();
  /** Label (tooltip + aria label) per node type. */
  readonly labels =
    input.required<Readonly<Record<BpmnPaletteItemType, string>>>();
  /** The node type of the armed place tool, highlighted with `aria-pressed`. */
  readonly activeType = input<BpmnPaletteItemType | null>(null);
  /** Disables every palette button (read-only editor). */
  readonly disabled = input(false);

  /** A palette entry was picked. */
  readonly toolPicked = output<BpmnPaletteItemType>();
  /**
   * A pointer went down on a palette entry — the editor may turn this into a
   * drag-to-canvas gesture (a sub-threshold release falls back to the plain
   * `toolPicked` click).
   */
  readonly dragStarted = output<{
    readonly type: BpmnPaletteItemType;
    readonly clientX: number;
    readonly clientY: number;
  }>();

  /** Index of the button currently carrying `tabindex="0"` (roving tabindex). */
  protected readonly focusIndex = signal(0);

  protected onPointerDown(
    type: BpmnPaletteItemType,
    event: PointerEvent,
  ): void {
    if (event.button !== 0 || this.disabled()) {
      return;
    }
    this.dragStarted.emit({
      type,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const count = this.items().length;
    if (count === 0) {
      return;
    }
    let next: number;
    switch (event.key) {
      case 'ArrowDown':
        next = (index + 1) % count;
        break;
      case 'ArrowUp':
        next = (index - 1 + count) % count;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.focusIndex.set(next);
    const buttons =
      this.hostEl.nativeElement.querySelectorAll<HTMLButtonElement>(
        '.oge-bpmn-palette-btn',
      );
    buttons[next]?.focus();
  }
}
