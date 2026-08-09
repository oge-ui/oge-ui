import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { FormControl } from '@angular/forms';
import { OgeFormEditor } from './form-editor';
import { isBareEditor } from './item-model';
import type {
  OgeFormItemTemplateContext,
  OgeFormLabelTemplateContext,
} from './templates/form-templates';
import type {
  OgeFormEditorAppearance,
  OgeFormFieldNode,
  OgeFormLabelLocation,
  OgeResolvedFormItem,
} from './form-types';
import type { OgeFormsMessages } from '../config';

/**
 * One laid-out field: the label column, the editor, and — for the bare
 * controls that render no chrome of their own (check box, switch, radio
 * group) — the hint and error text.
 *
 * Chrome editors keep their own subscript, so their hint and error are
 * rendered by `@oge-ui/inputs` and this component only supplies the label when
 * `labelLocation` is `start` or `end`.
 */
@Component({
  selector: 'oge-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeFormEditor],
  host: {
    class: 'oge-form-field',
    '[class.oge-form-field-bare]': 'bare()',
    '[class.oge-form-field-invalid]': 'showError()',
    '[class.oge-form-field-label-start]': "labelLocation() === 'start'",
    '[class.oge-form-field-label-end]': "labelLocation() === 'end'",
    '[style.grid-column]': 'gridColumn()',
  },
  template: `
    @if (itemTemplate(); as tpl) {
      <ng-container
        [ngTemplateOutlet]="tpl"
        [ngTemplateOutletContext]="templateContext()"
      />
    } @else {
      @if (renderLabel()) {
        <label class="oge-form-label" [attr.for]="editorId()">
          @if (labelTemplate(); as labelTpl) {
            <ng-container
              [ngTemplateOutlet]="labelTpl"
              [ngTemplateOutletContext]="labelContext()"
            />
          } @else {
            {{ item().label }}{{ colon() }}
          }
          @if (requiredMarkVisible()) {
            <span class="oge-form-required-mark" aria-hidden="true">{{
              messages().requiredMark
            }}</span>
            <span class="oge-sr-only">{{ messages().requiredLabel }}</span>
          } @else if (optionalMarkVisible()) {
            <span class="oge-form-optional-mark">{{
              messages().optionalMark
            }}</span>
          }
        </label>
      }

      <div class="oge-form-control">
        @if (editorTemplate(); as editorTpl) {
          <ng-container
            [ngTemplateOutlet]="editorTpl"
            [ngTemplateOutletContext]="templateContext()"
          />
        } @else {
          <oge-form-editor
            [item]="item()"
            [field]="field()"
            [control]="control()"
            [appearance]="appearance()"
            [editorId]="editorId()"
            [label]="editorLabel()"
            [hint]="editorHint()"
            (enterKey)="enterKey.emit($event)"
          />
        }

        @if (subscriptVisible()) {
          <div class="oge-form-subscript">
            @if (showError()) {
              <span class="oge-form-error" [id]="errorId()">{{ error() }}</span>
            } @else if (item().hint) {
              <span class="oge-form-hint" [id]="hintId()">{{
                item().hint
              }}</span>
            }
          </div>
        }
      </div>
    }
  `,
})
export class OgeFormField {
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly editor = viewChild(OgeFormEditor);

  readonly item = input.required<OgeResolvedFormItem>();
  readonly field = input<OgeFormFieldNode | undefined>(undefined);
  readonly control = input<FormControl<unknown> | undefined>(undefined);
  readonly appearance = input.required<OgeFormEditorAppearance>();
  readonly labelLocation = input.required<OgeFormLabelLocation>();
  readonly messages = input.required<OgeFormsMessages>();
  readonly showRequiredMark = input(true);
  readonly showOptionalMark = input(false);
  readonly showColonAfterLabel = input(false);
  /** Resolved error text for this field, or `null` while it is valid. */
  readonly error = input<string | null>(null);
  /** Columns available in the enclosing layout — caps `colSpan`. */
  readonly availableColumns = input(1);
  /** Slot that replaces the whole field. */
  readonly itemTemplate = input<
    TemplateRef<OgeFormItemTemplateContext> | undefined
  >(undefined);
  /** Slot that replaces only the editor, keeping label and error chrome. */
  readonly editorTemplate = input<
    TemplateRef<OgeFormItemTemplateContext> | undefined
  >(undefined);
  /** Slot that replaces the label content. */
  readonly labelTemplate = input<
    TemplateRef<OgeFormLabelTemplateContext> | undefined
  >(undefined);

  readonly enterKey = output<Event>();

  /** Stable id shared by the label's `for` and the rendered control. */
  readonly editorId = computed(() => `${this.item().id}-editor`);
  protected readonly errorId = computed(() => `${this.item().id}-error`);
  protected readonly hintId = computed(() => `${this.item().id}-hint`);

  protected readonly bare = computed(() =>
    isBareEditor(this.item().editorType),
  );

  /** The form owns the label for bare controls and for side-label layouts. */
  protected readonly renderLabel = computed(
    () =>
      this.item().labelVisible &&
      (this.bare() || this.labelLocation() !== 'top'),
  );

  /** When the form draws the label, the editor must not draw it again. */
  protected readonly editorLabel = computed(() =>
    this.item().labelVisible ? this.item().label : '',
  );
  protected readonly editorHint = computed(() =>
    this.bare() ? '' : (this.item().hint ?? ''),
  );

  protected readonly showError = computed(() => this.error() !== null);
  /**
   * The chrome editors draw their own hint/error subscript, so the form only
   * draws one for the bare controls — and for a templated editor, which has no
   * chrome of its own either.
   */
  protected readonly subscriptVisible = computed(
    () =>
      (this.bare() || this.editorTemplate() !== undefined) &&
      this.appearance().subscriptSizing !== 'none' &&
      (this.showError() || !!this.item().hint),
  );
  protected readonly requiredMarkVisible = computed(
    () => this.showRequiredMark() && this.item().required,
  );
  protected readonly optionalMarkVisible = computed(
    () => this.showOptionalMark() && !this.item().required,
  );
  protected readonly colon = computed(() =>
    this.showColonAfterLabel() ? this.messages().labelColon : '',
  );

  protected readonly gridColumn = computed(() => {
    const span = Math.min(
      this.item().colSpan,
      Math.max(1, this.availableColumns()),
    );
    return span > 1 ? `span ${span}` : null;
  });

  protected readonly templateContext = computed<OgeFormItemTemplateContext>(
    () => ({
      $implicit: this.item(),
      item: this.item(),
      field: this.field(),
      control: this.control(),
      error: this.error(),
      editorId: this.editorId(),
    }),
  );

  protected readonly labelContext = computed<OgeFormLabelTemplateContext>(
    () => ({
      $implicit: this.item().label,
      item: this.item(),
      required: this.item().required,
      editorId: this.editorId(),
    }),
  );

  /** Moves focus into this field's control. */
  focus(): void {
    const editor = this.editor();
    if (editor) {
      editor.focus();
      return;
    }
    this.hostEl.nativeElement.focus();
  }

  /** The host element — the form scrolls to it when reporting an error. */
  get element(): HTMLElement {
    return this.hostEl.nativeElement;
  }
}
