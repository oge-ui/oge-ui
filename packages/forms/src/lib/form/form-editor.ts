import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';
import { FormField } from '@angular/forms/signals';
import {
  OgeAutocomplete,
  OgeCalendar,
  OgeCheckBox,
  OgeColorBox,
  OgeDateBox,
  OgeDateRangeBox,
  OgeNumberBox,
  OgeRadioGroup,
  OgeSelectBox,
  OgeSlider,
  OgeSwitch,
  OgeTagBox,
  OgeTextArea,
  OgeTextBox,
  OgeTreeSelect,
  type OgeTextBoxMode,
} from '@oge-ui/inputs';
import type {
  OgeFormEditorAppearance,
  OgeFormFieldNode,
  OgeResolvedFormItem,
} from './form-types';

/**
 * The one forms editor: renders the `editorType`-matched `@oge-ui/inputs`
 * control for a resolved item. The `@oge-ui/grid` `OgeCellEditor` of this
 * package.
 *
 * The template carries the `@switch` twice — once bound with Angular's
 * `[formField]` directive (Signal Forms, which also backs `[(formData)]`) and
 * once with `[formControl]` (reactive forms) — because Angular cannot apply a
 * directive conditionally. Everything either arm needs is computed once below,
 * so only the markup is duplicated.
 *
 * `[disabled]` and `[readonly]` are bound **only** on the reactive arm: with
 * `[formField]` present, the `FormField` directive writes those inputs itself
 * and silently overwrites any template binding, so state there comes from the
 * schema (`disabled()` / `readonly()`).
 */
@Component({
  selector: 'oge-form-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ReactiveFormsModule,
    FormField,
    OgeAutocomplete,
    OgeCalendar,
    OgeCheckBox,
    OgeColorBox,
    OgeDateBox,
    OgeDateRangeBox,
    OgeNumberBox,
    OgeRadioGroup,
    OgeSelectBox,
    OgeSlider,
    OgeSwitch,
    OgeTagBox,
    OgeTextArea,
    OgeTextBox,
    OgeTreeSelect,
  ],
  host: {
    class: 'oge-form-editor',
    '(keydown.enter)': 'onEnter($event)',
  },
  templateUrl: './form-editor.html',
})
export class OgeFormEditor {
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The resolved item this editor renders. */
  readonly item = input.required<OgeResolvedFormItem>();
  /** Signal Forms node — set in `fieldTree` and `formData` mode. */
  readonly field = input<OgeFormFieldNode | undefined>(undefined);
  /** Reactive control — set in `formGroup` mode. */
  readonly control = input<FormControl<unknown> | undefined>(undefined);
  /** Size / styling / label / subscript, forwarded from the form. */
  readonly appearance = input.required<OgeFormEditorAppearance>();
  /** Accessible name; empty when the form renders the label itself. */
  readonly label = input('');
  /** Hint text; empty when the form renders the hint itself (bare editors). */
  readonly hint = input('');
  /**
   * Id put on the rendered control, so the form's own `<label for>` resolves.
   * `OgeControlBase.inputId` returns exactly this when `id` is set.
   */
  readonly editorId = input.required<string>();

  /** Enter pressed inside the editor. */
  readonly enterKey = output<Event>();

  protected readonly opts = computed(() => this.item().editorOptions);
  protected readonly size = computed(() => this.appearance().size);
  protected readonly stylingMode = computed(
    () => this.appearance().stylingMode,
  );
  protected readonly labelMode = computed(() => this.appearance().labelMode);
  protected readonly subscriptSizing = computed(
    () => this.appearance().subscriptSizing,
  );
  protected readonly placeholder = computed(() => this.item().placeholder);
  protected readonly hintOrUndefined = computed(() =>
    this.hint().length > 0 ? this.hint() : undefined,
  );
  protected readonly disabled = computed(() => this.item().disabled);
  protected readonly readOnly = computed(() => this.item().readOnly);
  protected readonly required = computed(() => this.item().required);

  protected readonly textMode = computed<OgeTextBoxMode>(
    () => (this.opts().mode as OgeTextBoxMode | undefined) ?? 'text',
  );
  protected readonly items = computed(() => this.opts().items ?? []);
  protected readonly displayExpr = computed(
    () => this.opts().displayExpr ?? '',
  );
  protected readonly valueExpr = computed(() => this.opts().valueExpr ?? '');
  /** The tree select takes object rows; the curated options carry `unknown[]`. */
  protected readonly treeItems = computed(
    () => this.items() as readonly object[],
  );
  protected readonly numberMin = computed(() =>
    typeof this.opts().min === 'number'
      ? (this.opts().min as number)
      : undefined,
  );
  // The slider's scale defaults (0/100) apply when the item sets no bounds.
  protected readonly sliderMin = computed(() => this.numberMin() ?? 0);
  protected readonly sliderMax = computed(() => this.numberMax() ?? 100);
  protected readonly numberMax = computed(() =>
    typeof this.opts().max === 'number'
      ? (this.opts().max as number)
      : undefined,
  );
  protected readonly dateMin = computed(() =>
    this.opts().min instanceof Date ? (this.opts().min as Date) : undefined,
  );
  protected readonly dateMax = computed(() =>
    this.opts().max instanceof Date ? (this.opts().max as Date) : undefined,
  );
  protected readonly dateType = computed(() => {
    const explicit = this.opts().type;
    if (explicit) return explicit;
    return this.item().dataType === 'datetime' ? 'datetime' : 'date';
  });

  /** Moves focus into the rendered control. */
  focus(): void {
    const host = this.hostEl.nativeElement;
    const target =
      host.querySelector<HTMLElement>(
        'input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"]), button',
      ) ?? host;
    target.focus();
  }

  protected onEnter(event: Event): void {
    if (event.defaultPrevented) return;
    this.enterKey.emit(event);
  }
}
