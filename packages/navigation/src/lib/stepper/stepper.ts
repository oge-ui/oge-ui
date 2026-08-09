import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
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
  viewChildren,
} from '@angular/core';
import {
  edgeEnabledIndex,
  runAsyncGuard,
  stepEnabledIndex,
} from '@oge-ui/core';
import { OGE_STEPPER_CONFIG, type OgeStepperMessages } from './config';
import { OgeStep } from './step';
import type { OgeStepDescriptor } from './stepper-descriptor';
import {
  OgeStepContentTemplate,
  OgeStepHeaderTemplate,
  OgeStepIndicatorTemplate,
} from './templates';
import type {
  OgeStepBlockedEvent,
  OgeStepChangedEvent,
  OgeStepChangingEvent,
  OgeStepData,
  OgeStepperDisplay,
  OgeStepperFinishEvent,
  OgeStepperOrientation,
  OgeStepState,
} from './stepper-types';

let nextStepperId = 0;

/**
 * A step-by-step process: a list of step headers plus the body of the active
 * one.
 *
 * **There is no WAI-ARIA APG pattern for a stepper**, so the semantics are a
 * deliberate choice: an ordered list of `<button>` headers carrying
 * `aria-current="step"`, with each body a `role="group"` labelled by its
 * header. `group` rather than `region` on purpose: `region` is a landmark, and
 * a five-step wizard would add five of them to a page the APG asks to keep
 * under seven — `group` conveys the same ownership without the pollution. ARIA 1.2 defines the `step` token for exactly this ("a link within a
 * step indicator for a step-based process").
 *
 * That is **one semantic in both orientations**. Angular Material instead
 * emits `role="tablist"`/`tab`/`tabpanel` when horizontal and
 * `button` + `aria-current` when vertical, so the same widget presents itself
 * to a screen reader as two different things depending on a layout choice —
 * and a tablist claims panels may be browsed freely, which a `linear` stepper
 * exists to forbid.
 *
 * Because the headers are not tabs, they all stay in the Tab sequence (the
 * accordion pattern). Arrow / Home / End are an opt-in enhancement via
 * `keyboardNavigation`, and they deliberately **do not wrap**: stepping from
 * the last step back to the first is not a thing a process does.
 *
 * ```html
 * <oge-stepper [(activeIndex)]="step" [linear]="true">
 *   <oge-step label="Account" [completed]="form.valid()">…</oge-step>
 *   <oge-step label="Review">…</oge-step>
 * </oge-stepper>
 * ```
 */
@Component({
  selector: 'oge-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  styleUrl: './stepper.scss',
  host: {
    class: 'oge-stepper',
    '[class.oge-stepper-vertical]': "orientation() === 'vertical'",
    '[class.oge-stepper-linear]': 'linear()',
    '[class.oge-disabled]': 'disabled()',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-display]': 'display()',
  },
  template: `
    <div class="oge-stepper-defs" hidden><ng-content /></div>

    <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -- the list is not interactive; the keydown is delegated from its own focusable <button> headers, which the rule cannot see through -->
    <ol
      class="oge-stepper-list"
      [attr.aria-label]="ariaLabel() ?? msg().stepper"
      (keydown)="onKeydown($event)"
    >
      @for (d of descriptors(); track d.id; let i = $index) {
        <li
          class="oge-stepper-item"
          [class]="d.cssClass"
          [class.oge-stepper-item-done]="stateOf(d, i) === 'done'"
        >
          <button
            type="button"
            class="oge-stepper-header"
            #header
            [id]="headerId(i)"
            [class.oge-stepper-header-active]="i === activeIndex()"
            [attr.data-state]="stateOf(d, i)"
            [attr.aria-current]="i === activeIndex() ? 'step' : null"
            [attr.aria-controls]="panelId(i)"
            [attr.aria-describedby]="d.optional ? optionalId(i) : null"
            [disabled]="d.disabled || disabled()"
            [attr.aria-disabled]="reachable(d, i) ? null : 'true'"
            (click)="onHeaderClick(i, $event)"
          >
            <span class="oge-stepper-indicator" aria-hidden="true">
              @if (indicatorTemplateFor(d); as tpl) {
                <ng-container
                  *ngTemplateOutlet="tpl; context: contextFor(d, i)"
                />
              } @else if (d.icon) {
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="currentColor"
                >
                  <path [attr.d]="d.icon" />
                </svg>
              } @else if (d.iconClass) {
                <i [class]="d.iconClass"></i>
              } @else if (stateOf(d, i) === 'done') {
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="m3 8.5 3.5 3.5L13 4.5" />
                </svg>
              } @else if (stateOf(d, i) === 'error') {
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                >
                  <path d="m4 4 8 8M12 4l-8 8" />
                </svg>
              } @else {
                {{ i + 1 }}
              }
            </span>

            @if (display() !== 'indicator') {
              <span class="oge-stepper-text">
                @if (headerTemplateFor(d); as tpl) {
                  <ng-container
                    *ngTemplateOutlet="tpl; context: contextFor(d, i)"
                  />
                } @else {
                  <span class="oge-stepper-label">{{ d.label }}</span>
                  @if (display() === 'full') {
                    <!-- the error message replaces the description while the
                         step is invalid: two sub-lines would compete -->
                    @if (d.invalid && d.errorMessage) {
                      <span class="oge-stepper-error">{{
                        d.errorMessage
                      }}</span>
                    } @else if (d.description) {
                      <span class="oge-stepper-description">{{
                        d.description
                      }}</span>
                    }
                  }
                }
                @if (d.optional) {
                  <span class="oge-stepper-optional" [id]="optionalId(i)">{{
                    msg().optional
                  }}</span>
                }
              </span>
            }

            <!-- The indicator is aria-hidden, so the state is announced here
                 instead of being inferred from a glyph. -->
            @if (stateOf(d, i) === 'done') {
              <span class="oge-sr-only">{{ msg().completed }}</span>
            } @else if (stateOf(d, i) === 'error') {
              <span class="oge-sr-only">{{ msg().invalid }}</span>
            }
          </button>

          @if (orientation() === 'vertical') {
            <ng-container
              *ngTemplateOutlet="panelTpl; context: { $implicit: d, index: i }"
            />
          }
        </li>
      }
    </ol>

    @if (orientation() === 'horizontal') {
      @for (d of descriptors(); track d.id; let i = $index) {
        <ng-container
          *ngTemplateOutlet="panelTpl; context: { $implicit: d, index: i }"
        />
      }
    }

    @if (showNavigation()) {
      <div class="oge-stepper-nav">
        <button
          type="button"
          class="oge-stepper-nav-btn oge-stepper-nav-previous"
          [disabled]="activeIndex() === 0 || disabled() || changePending()"
          (click)="previous($event)"
        >
          {{ msg().previous }}
        </button>
        <button
          type="button"
          class="oge-stepper-nav-btn oge-stepper-nav-next"
          [disabled]="disabled() || changePending()"
          (click)="next($event)"
        >
          {{ isLast() ? msg().finish : msg().next }}
        </button>
      </div>
    }

    <ng-template #panelTpl let-d let-i="index">
      @if (i === activeIndex() || isRendered(d.id)) {
        <div
          class="oge-stepper-panel"
          role="group"
          [id]="panelId(i)"
          [attr.aria-labelledby]="headerId(i)"
          [hidden]="i !== activeIndex()"
          [attr.inert]="i !== activeIndex() ? '' : null"
        >
          @if (d.contentTemplate) {
            <ng-container *ngTemplateOutlet="d.contentTemplate" />
          } @else if (itemsContentTemplate(); as tpl) {
            <ng-container
              *ngTemplateOutlet="tpl.templateRef; context: contextFor(d, i)"
            />
          }
        </div>
      }
    </ng-template>
  `,
})
export class OgeStepper {
  private readonly config = inject(OGE_STEPPER_CONFIG);

  /** id prefix for the header/panel pairs. */
  readonly stepperId = `oge-stepper-${nextStepperId++}`;

  private readonly declaredSteps = contentChildren(OgeStep);
  // descendants: false — a template inside an <oge-step> belongs to that step;
  // only a direct child acts as the shared items-mode template.
  private readonly itemsHeaderTemplate = contentChild(OgeStepHeaderTemplate, {
    descendants: false,
  });
  private readonly itemsIndicatorTemplate = contentChild(
    OgeStepIndicatorTemplate,
    { descendants: false },
  );
  protected readonly itemsContentTemplate = contentChild(
    OgeStepContentTemplate,
    { descendants: false },
  );

  private readonly headerEls =
    viewChildren<ElementRef<HTMLButtonElement>>('header');

  /** Index of the active step. Two-way. */
  readonly activeIndex = model(0);
  /** Key of the active step. Two-way; wins over `activeIndex` on first run. */
  readonly activeKey = model<string | undefined>(undefined);

  /** Data-driven steps, merged after any declarative `<oge-step>` children. */
  readonly steps = input<readonly OgeStepData[] | undefined>(undefined);
  /** Main axis of the step list. */
  readonly orientation = input<OgeStepperOrientation>(
    this.config.orientation ?? 'horizontal',
  );
  /** How much of each header is rendered. */
  readonly display = input<OgeStepperDisplay>(this.config.display ?? 'full');
  /**
   * Blocks moving past a step that is neither `completed` nor `optional`.
   * Defaults to `false`, matching Material and PrimeNG (Kendo is the outlier).
   */
  readonly linear = input(this.config.linear ?? false);
  /** Blocks every step change. */
  readonly disabled = input(false);
  /** Renders the built-in Back / Next bar. */
  readonly showNavigation = input(false);
  /**
   * Adds arrow / Home / End navigation over the headers. Off by default: the
   * headers are buttons in a list, not tabs, so they are all Tab-reachable
   * already — this is an enhancement, not the pattern's requirement.
   */
  readonly keyboardNavigation = input(false);
  /** Creates a step's body on first activation instead of up front. */
  readonly deferRendering = input(false);
  /** Keeps a body mounted after the user leaves it. */
  readonly keepAlive = input(true);
  /** Accessible name of the step list. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Per-instance message overrides. */
  readonly messages = input<Partial<OgeStepperMessages> | undefined>(undefined);

  /** Cancelable pre-event, emitted before the step's `stepGuard` runs. */
  readonly stepChanging = output<OgeStepChangingEvent>();
  /** The active step changed. */
  readonly stepChanged = output<OgeStepChangedEvent>();
  /** A step change was refused, with the reason. */
  readonly stepBlocked = output<OgeStepBlockedEvent>();
  /** `next()` was confirmed on the last step. */
  readonly finished = output<OgeStepperFinishEvent>();

  private readonly _changePending = signal(false);
  /** `true` while an async `stepGuard` is in flight. */
  readonly changePending = this._changePending.asReadonly();

  private readonly renderedIds = signal<ReadonlySet<string>>(new Set());

  protected readonly msg = computed<OgeStepperMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  /** Normalized steps: projected children first, then `steps`. */
  protected readonly descriptors = computed<readonly OgeStepDescriptor[]>(
    () => {
      const headerTpl = this.itemsHeaderTemplate()?.templateRef;
      const indicatorTpl = this.itemsIndicatorTemplate()?.templateRef;
      const fromChildren = this.declaredSteps()
        .filter((step) => step.visible())
        .map((step) => ({
          id: step.key() ?? step.autoId,
          key: step.key(),
          label: step.label(),
          description: step.description(),
          icon: step.icon(),
          iconClass: step.iconClass(),
          disabled: step.disabled(),
          completed: step.completed(),
          optional: step.optional(),
          editable: step.editable(),
          invalid: step.invalid(),
          errorMessage: step.errorMessage(),
          cssClass: step.cssClass(),
          stepGuard: step.stepGuard(),
          item: undefined,
          headerTemplate: step.headerTemplate()?.templateRef,
          indicatorTemplate: step.indicatorTemplate()?.templateRef,
          contentTemplate:
            step.lazyContent()?.templateRef ?? step.contentTemplateRef(),
        }));
      const fromItems = (this.steps() ?? [])
        .filter((item) => item.visible !== false)
        .map((item, index) => ({
          id: item.key ?? `i${index}`,
          key: item.key,
          label: item.label ?? '',
          description: item.description,
          icon: item.icon,
          iconClass: item.iconClass,
          disabled: item.disabled ?? false,
          completed: item.completed ?? false,
          optional: item.optional ?? false,
          editable: item.editable ?? true,
          invalid: item.invalid ?? false,
          errorMessage: item.errorMessage,
          cssClass: item.cssClass,
          stepGuard: item.stepGuard,
          item,
          headerTemplate: headerTpl,
          indicatorTemplate: indicatorTpl,
          contentTemplate: undefined,
        }));
      return [...fromChildren, ...fromItems];
    },
  );

  protected readonly isLast = computed(
    () => this.activeIndex() >= this.descriptors().length - 1,
  );

  constructor() {
    // activeKey → activeIndex. Declared before the reverse effect so an
    // initial key binding wins over the index default on first run.
    effect(() => {
      const key = this.activeKey();
      if (key === undefined) return;
      const index = this.descriptors().findIndex((d) => d.key === key);
      if (index !== -1 && index !== untracked(this.activeIndex)) {
        this.activeIndex.set(index);
      }
    });
    // activeIndex → activeKey.
    effect(() => {
      const key = this.descriptors()[this.activeIndex()]?.key;
      if (key !== untracked(this.activeKey)) this.activeKey.set(key);
    });
    // Keep the index in range when steps are removed.
    effect(() => {
      const count = this.descriptors().length;
      const index = untracked(this.activeIndex);
      if (count > 0 && index > count - 1) this.activeIndex.set(count - 1);
    });
    // Remember which bodies have been shown, for keepAlive.
    effect(() => {
      const id = this.descriptors()[this.activeIndex()]?.id;
      if (id === undefined || !this.keepAlive()) return;
      untracked(() => {
        if (this.renderedIds().has(id)) return;
        this.renderedIds.update((ids) => new Set(ids).add(id));
      });
    });
  }

  /** Moves to the step at an index or with a key, through the full pipeline. */
  goTo(target: number | string, event?: Event): void {
    const index =
      typeof target === 'number'
        ? target
        : this.descriptors().findIndex((d) => d.key === target);
    if (index !== -1) this.requestChange(index, event);
  }

  /**
   * Advances one step, or emits `finished` when already on the last one. The
   * guard runs either way, so a final step can still veto the finish.
   */
  next(event?: Event): void {
    if (this.isLast()) {
      this.confirmLeave(this.activeIndex(), () => {
        const d = this.descriptors()[this.activeIndex()];
        this.finished.emit({ index: this.activeIndex(), key: d?.key });
      });
      return;
    }
    this.requestChange(this.activeIndex() + 1, event);
  }

  /** Goes back one step. */
  previous(event?: Event): void {
    this.requestChange(this.activeIndex() - 1, event);
  }

  /** Clears the rendered-body cache and returns to the first step. */
  reset(): void {
    this.renderedIds.set(new Set());
    this.activeIndex.set(0);
  }

  /** Focuses the active step's header. */
  focus(): void {
    this.headerEls()[this.activeIndex()]?.nativeElement.focus();
  }

  protected headerId(index: number): string {
    return `${this.stepperId}-header-${index}`;
  }

  protected panelId(index: number): string {
    return `${this.stepperId}-panel-${index}`;
  }

  protected optionalId(index: number): string {
    return `${this.stepperId}-optional-${index}`;
  }

  protected isRendered(id: string): boolean {
    return !this.deferRendering() || this.renderedIds().has(id);
  }

  protected headerTemplateFor(d: OgeStepDescriptor) {
    return d.headerTemplate;
  }

  protected indicatorTemplateFor(d: OgeStepDescriptor) {
    return d.indicatorTemplate;
  }

  protected contextFor(d: OgeStepDescriptor, index: number) {
    return { $implicit: d.item, index, state: this.stateOf(d, index) };
  }

  /**
   * The indicator's state. `error` outranks `done` so an invalid step the user
   * has already completed still reads as needing attention.
   */
  protected stateOf(d: OgeStepDescriptor, index: number): OgeStepState {
    if (d.invalid) return 'error';
    if (index === this.activeIndex()) return 'active';
    if (d.completed) return 'done';
    return 'number';
  }

  /** Whether a header may be activated at all — drives `aria-disabled`. */
  protected reachable(d: OgeStepDescriptor, index: number): boolean {
    if (d.disabled || this.disabled()) return false;
    if (index === this.activeIndex()) return true;
    if (index < this.activeIndex()) return d.editable;
    return !this.linear() || this.stepsCompleteBefore(index);
  }

  protected onHeaderClick(index: number, event: Event): void {
    this.requestChange(index, event);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.keyboardNavigation() || this.disabled()) return;
    const vertical = this.orientation() === 'vertical';
    const rtl =
      !vertical &&
      getComputedStyle(this.headerEls()[0]?.nativeElement ?? document.body)
        .direction === 'rtl';
    const nextKey = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const prevKey = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    const ds = this.descriptors();
    const isDisabled = (i: number) => ds[i]?.disabled ?? true;
    const current = this.focusedIndex();
    let target: number | null = null;

    if (event.key === nextKey) {
      // wrap = false: a process does not loop from the last step to the first.
      target = stepEnabledIndex(ds.length, current, 1, isDisabled, false);
    } else if (event.key === prevKey) {
      target = stepEnabledIndex(ds.length, current, -1, isDisabled, false);
    } else if (event.key === 'Home') {
      target = edgeEnabledIndex(ds.length, 1, isDisabled);
    } else if (event.key === 'End') {
      target = edgeEnabledIndex(ds.length, -1, isDisabled);
    } else {
      return;
    }
    event.preventDefault();
    // Focus only — activation stays on Enter/Space, which the buttons handle
    // natively. Moving focus must not run a guard.
    if (target !== null) this.headerEls()[target]?.nativeElement.focus();
  }

  private focusedIndex(): number {
    const active = document.activeElement;
    const index = this.headerEls().findIndex(
      (el) => el.nativeElement === active,
    );
    return index === -1 ? this.activeIndex() : index;
  }

  /** Every step before `index` is complete, optional, or was skipped legally. */
  private stepsCompleteBefore(index: number): boolean {
    return this.descriptors()
      .slice(0, index)
      .every((d) => d.completed || d.optional);
  }

  /** `stepChanging` → `stepGuard` → commit → `stepChanged`. */
  private requestChange(index: number, event?: Event): void {
    const ds = this.descriptors();
    const from = this.activeIndex();
    if (index === from || this.disabled() || this._changePending()) return;
    const target = ds[index];
    if (!target) return;
    if (target.disabled) {
      this.stepBlocked.emit({
        fromIndex: from,
        toIndex: index,
        reason: 'disabled',
      });
      return;
    }
    if (index < from && !target.editable) {
      this.stepBlocked.emit({
        fromIndex: from,
        toIndex: index,
        reason: 'editable',
      });
      return;
    }
    if (index > from && this.linear() && !this.stepsCompleteBefore(index)) {
      this.stepBlocked.emit({
        fromIndex: from,
        toIndex: index,
        reason: 'linear',
      });
      return;
    }
    const changing: OgeStepChangingEvent = {
      fromIndex: from,
      toIndex: index,
      fromKey: ds[from]?.key,
      toKey: target.key,
      item: target.item,
      event,
      cancel: false,
    };
    this.stepChanging.emit(changing);
    if (changing.cancel) return;
    // Unlike the tab strip, the guard runs *inside* the selection pipeline:
    // leaving a step is the thing an application needs to veto.
    this.confirmLeave(
      from,
      () => {
        this.activeIndex.set(index);
        this.activeKey.set(target.key);
        this.stepChanged.emit({
          index,
          key: target.key,
          previousIndex: from,
          previousKey: ds[from]?.key,
          item: target.item,
          event,
        });
      },
      () =>
        this.stepBlocked.emit({
          fromIndex: from,
          toIndex: index,
          reason: 'guard',
        }),
    );
  }

  /** Runs the leaving step's guard, then commits. */
  private confirmLeave(
    fromIndex: number,
    commit: () => void,
    deny?: () => void,
  ): void {
    runAsyncGuard(this.descriptors()[fromIndex]?.stepGuard, {
      allow: commit,
      deny: () => deny?.(),
      pending: (active) => this._changePending.set(active),
      label: 'oge-stepper stepGuard',
    });
  }
}
