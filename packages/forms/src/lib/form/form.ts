import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  TemplateRef,
  ViewEncapsulation,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  isDevMode,
  linkedSignal,
  model,
  output,
  runInInjectionContext,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, type FormGroup } from '@angular/forms';
import {
  form,
  submit as submitField,
  type FieldTree,
} from '@angular/forms/signals';
import {
  OGE_INPUTS_CONFIG,
  resolveErrorMessage,
  type OgeFieldError,
  type OgeInputLabelMode,
  type OgeInputSize,
  type OgeInputStylingMode,
  type OgeInputSubscriptSizing,
} from '@oge-ui/inputs';
import { OGE_FORMS_CONFIG, type OgeFormsMessages } from '../config';
import { OgeValidationSummary } from '../validation-summary/validation-summary';
import { OgeFormField } from './form-field';
import { OgeFormGroup } from './form-group';
import { OgeFormItem } from './form-item';
import { OgeAccordion, OgeAccordionItem } from '@oge-ui/layout';
import { OgeTab, OgeTabPanel } from '@oge-ui/tabs';
import { OgeStep, OgeStepper } from '@oge-ui/navigation';
import { OgeFormNode } from './form-node';
import { OgeFormAccordion, OgeFormSteps, OgeFormTabs } from './form-sections';
import {
  OgeFormEditorTemplate,
  OgeFormGroupCaptionTemplate,
  OgeFormItemTemplate,
  OgeFormLabelTemplate,
} from './templates/form-templates';
import { orderByVisibleIndex, readPath, resolveItem } from './item-model';
import { itemFromMetadata } from './metadata';
import { schemaFromRules, type RuleSource } from './schema-from-rules';
import type {
  OgeFormGroupCaptionTemplateContext,
  OgeFormItemTemplateContext,
  OgeFormLabelTemplateContext,
} from './templates/form-templates';
import type {
  OgeFormColCount,
  OgeFormEditorAppearance,
  OgeFormErrorEntry,
  OgeFormFieldChangedEvent,
  OgeFormFieldNode,
  OgeFormFieldTree,
  OgeFormGroupData,
  OgeFormItemData,
  OgeFormKeyEvent,
  OgeFormLabelLocation,
  OgeFormMode,
  OgeFormScreenSize,
  OgeFormSubmittedEvent,
  OgeFormSubmittingEvent,
  OgeFormValidatedEvent,
  OgeResolvedFormItem,
} from './form-types';

/**
 * The layout tree before the model is consulted: which item sits where, keyed
 * by a stable id. Structure only — deliberately independent of the bound data,
 * so the internally owned `form()` is not rebuilt on every keystroke.
 */
interface LayoutNode {
  readonly id: string;
  readonly kind: 'item' | 'group' | 'tabs' | 'accordion' | 'steps';
  /** `kind: 'tabs' | 'accordion'` — the directive that owns the selection. */
  readonly section?: OgeFormTabs | OgeFormAccordion | OgeFormSteps;
  /** Position of a group inside its enclosing section. */
  readonly sectionIndex?: number;
  /** Ordering hint; applied per level, the way the references scope it. */
  readonly visibleIndex?: number;
  /** `kind: 'item'` — the id of the source entry this node renders. */
  readonly itemId?: string;
  readonly caption?: string;
  readonly colCount?: OgeFormColCount;
  readonly colSpan: number;
  readonly cssClass?: string;
  readonly children?: readonly LayoutNode[];
  /** Per-item / per-group slots, which win over the form-level ones. */
  readonly itemTemplate?: TemplateRef<OgeFormItemTemplateContext>;
  readonly editorTemplate?: TemplateRef<OgeFormItemTemplateContext>;
  readonly labelTemplate?: TemplateRef<OgeFormLabelTemplateContext>;
  readonly captionTemplate?: TemplateRef<OgeFormGroupCaptionTemplateContext>;
}

/** One source item plus the id that ties it to its layout node. */
interface SourceEntry {
  readonly id: string;
  readonly source: OgeFormItemData;
}

/** A layout node with the resolved item attached — what the template walks. */
interface FormNode {
  readonly id: string;
  readonly kind: 'item' | 'group' | 'tabs' | 'accordion' | 'steps';
  readonly section?: OgeFormTabs | OgeFormAccordion | OgeFormSteps;
  readonly sectionIndex?: number;
  /** Number of invalid fields under this node — drives the section badges. */
  readonly errorCount?: number;
  readonly item?: OgeResolvedFormItem;
  readonly caption?: string;
  readonly colCount?: OgeFormColCount;
  readonly colSpan: number;
  readonly cssClass?: string;
  readonly children?: readonly FormNode[];
  readonly itemTemplate?: TemplateRef<OgeFormItemTemplateContext>;
  readonly editorTemplate?: TemplateRef<OgeFormItemTemplateContext>;
  readonly labelTemplate?: TemplateRef<OgeFormLabelTemplateContext>;
  readonly captionTemplate?: TemplateRef<OgeFormGroupCaptionTemplateContext>;
}

const BREAKPOINTS: readonly OgeFormScreenSize[] = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
];

/**
 * Form layout over the `@oge-ui/inputs` editors: labels, responsive columns,
 * nestable `<fieldset>` groups, a validation summary, and submit.
 *
 * Items come from `<oge-form-item>` children, from an `[items]` array, or from
 * both — children first, the same merge rule tabs and the accordion use. The
 * binding mode is derived from which source is bound:
 *
 * ```html
 * <oge-form [fieldTree]="f" />                  <!-- Angular Signal Forms -->
 * <oge-form [formGroup]="fg" [items]="items" /> <!-- reactive forms       -->
 * <oge-form [(formData)]="employee">            <!-- a plain signal model -->
 *   <oge-form-item field="firstName" [isRequired]="true" />
 * </oge-form>
 * ```
 *
 * `[(formData)]` is not a third validation engine: the form builds a Signal
 * Forms schema from each item's `isRequired` / `validationRules` and runs the
 * same code path as `[fieldTree]`.
 */
@Component({
  selector: 'oge-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    NgTemplateOutlet,
    OgeAccordion,
    OgeAccordionItem,
    OgeTab,
    OgeTabPanel,
    OgeStep,
    OgeStepper,
    OgeFormField,
    OgeValidationSummary,
  ],
  host: {
    class: 'oge-form',
    '[class.oge-form-label-start]': "labelLocation() === 'start'",
    '[class.oge-form-label-end]': "labelLocation() === 'end'",
    '[class.oge-form-align-labels]': 'alignItemLabels()',
    '[class.oge-form-readonly]': 'readOnly()',
    '[class.oge-form-disabled]': 'disabled()',
    '[class.oge-form-sm]': "size() === 'sm'",
    '[class.oge-form-lg]': "size() === 'lg'",
  },
  templateUrl: './form.html',
  styleUrl: './form.scss',
})
export class OgeForm<T extends object = Record<string, unknown>> {
  private readonly config = inject(OGE_FORMS_CONFIG);
  private readonly inputsConfig = inject(OGE_INPUTS_CONFIG);
  private readonly injector = inject(Injector);

  // --- binding ---------------------------------------------------------------

  /** An Angular Signal Forms field tree. The caller owns validation. */
  readonly fieldTree = input<OgeFormFieldTree | undefined>(undefined);
  /** A reactive `FormGroup`. The caller owns validation. */
  readonly formGroup = input<FormGroup | undefined>(undefined);
  /** A plain model object, two-way. Validation comes from `validationRules`. */
  readonly formData = model<T | undefined>(undefined);
  /** Data-driven items, appended after the declarative children. */
  readonly items = input<readonly OgeFormItemData[] | undefined>(undefined);
  /** Data-driven groups, matched to items by `caption` / `key`. */
  readonly groups = input<readonly OgeFormGroupData[] | undefined>(undefined);

  // --- layout ----------------------------------------------------------------

  /** Column count; `'auto'` fits as many `minColWidth` columns as fit. */
  readonly colCount = input<OgeFormColCount>('auto');
  /**
   * Column count per container-query breakpoint. Keyed to the **form's own**
   * width, not the window's — a form in a dialog lays itself out correctly.
   */
  readonly colCountByScreen = input<
    Partial<Record<OgeFormScreenSize, number>> | undefined
  >(undefined);
  /** Narrowest column `colCount: 'auto'` will produce, in pixels. */
  readonly minColWidth = input(this.config.minColWidth ?? 220);
  /** Where labels sit; `'start'`/`'end'` give every field a label column. */
  readonly labelLocation = input<OgeFormLabelLocation>(
    this.config.labelLocation ?? 'top',
  );
  /** Forwarded to every editor's own label chrome. */
  readonly labelMode = input<OgeInputLabelMode>('static');
  /** Gives side labels a shared column width so they line up. */
  readonly alignItemLabels = input(true);
  readonly showColonAfterLabel = input(
    this.config.showColonAfterLabel ?? false,
  );
  readonly showRequiredMark = input(this.config.showRequiredMark ?? true);
  readonly showOptionalMark = input(this.config.showOptionalMark ?? false);
  readonly size = input<OgeInputSize>('md');
  readonly stylingMode = input<OgeInputStylingMode>('outlined');
  readonly subscriptSizing = input<OgeInputSubscriptSizing>('fixed');

  // --- state -----------------------------------------------------------------

  /** Makes every editor read-only. In `fieldTree` mode use `readonly()` instead. */
  readonly readOnly = input(false);
  /** Disables every editor via a `<fieldset disabled>` wrapper. */
  readonly disabled = input(false);
  /** Renders an `<oge-validation-summary>` above the fields after a failed submit. */
  readonly showValidationSummary = input(false);
  /** Scrolls the first invalid field into view when a submit fails. */
  readonly scrollToFirstInvalid = input(true);
  /** Per-instance string overrides. */
  readonly messages = input<Partial<OgeFormsMessages> | undefined>(undefined);
  /**
   * Whether the fields are wrapped in a real `<form>`. Set `false` when the
   * form is rendered inside another form — nested `<form>` elements are
   * invalid HTML, and the grid's row editor lives inside whatever page markup
   * the app already has. With `false` there is no native submit, so drive it
   * with `submit()`.
   */
  readonly renderFormElement = input(true);

  // --- events ----------------------------------------------------------------

  /** Cancelable pre-submit. Set `cancel` to keep the form open. */
  readonly submitting = output<OgeFormSubmittingEvent<T>>();
  /** Emitted after a submit passed validation and was not canceled. */
  readonly submitted = output<OgeFormSubmittedEvent<T>>();
  /** Emitted whenever one field's value changed. */
  readonly fieldChanged = output<OgeFormFieldChangedEvent>();
  /** Emitted after `validate()` or a submit attempt. */
  readonly validated = output<OgeFormValidatedEvent>();
  /** Enter pressed inside an editor. */
  readonly editorEnterKey = output<OgeFormKeyEvent>();

  // --- children --------------------------------------------------------------

  /** Items and groups in one ordered query — see `OgeFormNode`. */
  private readonly nodeChildren = contentChildren(OgeFormNode, {
    descendants: false,
  });
  private readonly fields = viewChildren(OgeFormField);

  /**
   * Form-level slots. Queried without descendants so a template written inside
   * an `<oge-form-item>` belongs to that item, per the house slot rule.
   */
  private readonly formItemTemplate = contentChild(OgeFormItemTemplate, {
    descendants: false,
  });
  private readonly formEditorTemplate = contentChild(OgeFormEditorTemplate, {
    descendants: false,
  });
  private readonly formLabelTemplate = contentChild(OgeFormLabelTemplate, {
    descendants: false,
  });
  private readonly formCaptionTemplate = contentChild(
    OgeFormGroupCaptionTemplate,
    { descendants: false },
  );

  // --- derived state ---------------------------------------------------------

  protected readonly msg = computed<OgeFormsMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  /** Which binding the form resolved to — derived, never configured. */
  readonly mode = computed<OgeFormMode>(() => {
    if (this.fieldTree()) return 'fieldTree';
    if (this.formGroup()) return 'formGroup';
    return 'formData';
  });

  protected readonly appearance = computed<OgeFormEditorAppearance>(() => ({
    size: this.size(),
    stylingMode: this.stylingMode(),
    // a side label is drawn by the form, so the editor must not draw one too
    labelMode: this.labelLocation() === 'top' ? this.labelMode() : 'hidden',
    subscriptSizing: this.subscriptSizing(),
  }));

  /** Model object the items resolve their `dataType` against. */
  private readonly sourceData = computed<unknown>(() => {
    switch (this.mode()) {
      case 'fieldTree':
        return this.fieldTree()?.().value();
      case 'formGroup':
        // a plain property — see `controlRevision`
        this.controlRevision();
        return this.formGroup()?.value;
      default:
        return this.formData();
    }
  });

  /**
   * The whole layout, built from the declaration structure: projected children
   * first, then `items`, nested groups kept nested. Depends only on structure,
   * never on the model — see `LayoutNode`.
   */
  private readonly layout = computed<{
    readonly nodes: readonly LayoutNode[];
    readonly entries: readonly SourceEntry[];
  }>(() => {
    const entries: SourceEntry[] = [];
    let counter = 0;
    const nextId = (source: OgeFormItemData): string =>
      `oge-form-item-${counter++}-${source.key ?? source.field}`;

    const itemNode = (
      source: OgeFormItemData,
      inherited: { readOnly?: boolean; disabled?: boolean },
      slots?: {
        itemTemplate?: TemplateRef<OgeFormItemTemplateContext>;
        editorTemplate?: TemplateRef<OgeFormItemTemplateContext>;
        labelTemplate?: TemplateRef<OgeFormLabelTemplateContext>;
      },
    ): LayoutNode => {
      const merged: OgeFormItemData = {
        ...source,
        readOnly: source.readOnly ?? inherited.readOnly,
        disabled: source.disabled ?? inherited.disabled,
      };
      const id = nextId(merged);
      entries.push({ id, source: merged });
      return {
        id,
        kind: 'item',
        itemId: id,
        visibleIndex: merged.visibleIndex,
        colSpan: Math.max(1, Math.floor(merged.colSpan ?? 1)),
        itemTemplate: (slots?.itemTemplate ??
          merged.itemTemplate) as LayoutNode['itemTemplate'],
        editorTemplate: (slots?.editorTemplate ??
          merged.editorTemplate) as LayoutNode['editorTemplate'],
        labelTemplate: (slots?.labelTemplate ??
          merged.labelTemplate) as LayoutNode['labelTemplate'],
      };
    };

    const sectionNode = (
      section: OgeFormTabs | OgeFormAccordion | OgeFormSteps,
      inherited: { readOnly?: boolean; disabled?: boolean },
    ): LayoutNode => {
      const id = `oge-form-section-${counter++}-${section.key() ?? section.nodeKind}`;
      // a section's children are groups; anything else is wrapped so every
      // panel still has a caption to show
      const children = walk(section.nodes(), inherited).map((child, index) =>
        child.kind === 'group'
          ? { ...child, sectionIndex: index }
          : {
              id: `${id}-panel-${index}`,
              kind: 'group' as const,
              caption: '',
              colSpan: 1,
              sectionIndex: index,
              children: [child],
            },
      );
      return {
        id,
        kind: section.nodeKind,
        visibleIndex: section.visibleIndex(),
        colSpan: Math.max(1, section.colSpan()),
        cssClass: section.cssClass(),
        section,
        children,
      };
    };

    const groupNode = (
      group: OgeFormGroup,
      inherited: { readOnly?: boolean; disabled?: boolean },
    ): LayoutNode => {
      const own = {
        readOnly: group.readOnly() ?? inherited.readOnly,
        disabled: group.disabled() ?? inherited.disabled,
      };
      return {
        id: `oge-form-group-${counter++}-${group.key() ?? group.caption()}`,
        kind: 'group',
        visibleIndex: group.visibleIndex(),
        caption: group.caption(),
        colCount: group.colCount(),
        colSpan: Math.max(1, group.colSpan()),
        cssClass: group.cssClass(),
        captionTemplate: group.captionTemplate()?.template,
        children: walk(group.nodes(), own),
      };
    };

    const slotsOf = (item: OgeFormItem) => ({
      itemTemplate: item.itemTemplate()?.template,
      editorTemplate: item.editorTemplate()?.template,
      labelTemplate: item.labelTemplate()?.template,
    });

    const walk = (
      children: readonly OgeFormNode[],
      inherited: { readOnly?: boolean; disabled?: boolean },
    ): LayoutNode[] =>
      children
        .filter((child) => child.visible())
        .map((child) => {
          switch (child.nodeKind) {
            case 'group':
              return groupNode(child as OgeFormGroup, inherited);
            case 'tabs':
            case 'accordion':
            case 'steps':
              return sectionNode(
                child as OgeFormTabs | OgeFormAccordion | OgeFormSteps,
                inherited,
              );
            default:
              return itemNode(
                this.itemDataOf(child as OgeFormItem),
                inherited,
                slotsOf(child as OgeFormItem),
              );
          }
        });

    const nodes: LayoutNode[] = [...walk(this.nodeChildren(), {})];

    // data-driven groups, then data-driven items attached to their group
    const groupNodes = new Map<
      string,
      LayoutNode & { children: LayoutNode[] }
    >();
    for (const node of nodes) {
      if (node.kind === 'group' && node.caption !== undefined) {
        groupNodes.set(
          node.caption,
          node as LayoutNode & { children: LayoutNode[] },
        );
      }
    }
    const dataGroups: readonly OgeFormGroupData[] = [
      ...(this.groups() ?? []),
      // groups a schema asked for through OGE_FORM_GROUP
      ...(this.items()
        ? []
        : this.schemaItems()
            .map((item) => item.group)
            .filter(
              (caption): caption is string =>
                caption !== undefined && !groupNodes.has(caption),
            )
            .filter((caption, index, all) => all.indexOf(caption) === index)
            .map((caption) => ({ caption }))),
    ];
    for (const group of dataGroups) {
      if (group.visible === false) continue;
      const key = group.key ?? group.caption;
      if (groupNodes.has(key)) continue;
      const node = {
        id: `oge-form-group-${counter++}-${key}`,
        kind: 'group' as const,
        visibleIndex: group.visibleIndex,
        caption: group.caption,
        colCount: group.colCount,
        colSpan: Math.max(1, group.colSpan ?? 1),
        cssClass: group.cssClass,
        children: [] as LayoutNode[],
      };
      groupNodes.set(key, node);
      nodes.push(node);
    }

    for (const source of this.items() ?? this.schemaItems()) {
      if (source.visible === false) continue;
      const target =
        source.group !== undefined ? groupNodes.get(source.group) : undefined;
      if (target) target.children.push(itemNode(source, {}));
      else nodes.push(itemNode(source, {}));
    }

    // `visibleIndex` orders each level on its own, the way the reference
    // libraries scope it — "in a form, group or tab", not across the whole
    // form. Applied last, so projected children and `items` entries that share
    // a level are ordered together rather than one source after the other.
    const orderLevels = (level: readonly LayoutNode[]): LayoutNode[] =>
      orderByVisibleIndex(level).map((node) =>
        node.kind === 'group'
          ? { ...node, children: orderLevels(node.children ?? []) }
          : node,
      );

    return { nodes: orderLevels(nodes), entries };
  });

  /**
   * Items derived from a bound schema's layout metadata, used only when the
   * caller declared no children and passed no `items`. Field keys are read
   * untracked — the model's *shape* is structure, not data — while the
   * metadata itself is tracked, so a reactive `metadata()` rule still moves
   * the layout.
   */
  private readonly schemaItems = computed<readonly OgeFormItemData[]>(() => {
    if (this.nodeChildren().length > 0) return [];
    const tree = this.fieldTree();
    if (!tree) return [];
    const keys = untracked(() => {
      const value = tree().value() as Record<string, unknown> | undefined;
      return value && typeof value === 'object' ? Object.keys(value) : [];
    });
    return keys.flatMap((key) => {
      const node = (tree as unknown as Record<string, OgeFormFieldNode>)[key];
      if (typeof node !== 'function') return [];
      const item = itemFromMetadata(key, node);
      return item ? [item] : [];
    });
  });

  /** Flat item sources in layout order — what the rule compiler reads. */
  private readonly itemSources = computed<readonly OgeFormItemData[]>(() =>
    this.layout().entries.map((entry) => entry.source),
  );

  /** The internally owned Signal Forms tree backing `[(formData)]`. */
  private readonly dataModel = linkedSignal<T>(
    () => this.formData() ?? ({} as T),
  );

  private readonly internalTree = computed<OgeFormFieldTree | undefined>(() => {
    if (this.mode() !== 'formData') return undefined;
    const rules: readonly RuleSource[] = this.itemSources();
    return untracked(() =>
      runInInjectionContext(this.injector, () =>
        form(this.dataModel, schemaFromRules(rules)),
      ),
    ) as OgeFormFieldTree;
  });

  /** The tree the form actually binds — the caller's, or the internal one. */
  private readonly activeTree = computed<OgeFormFieldTree | undefined>(
    () => this.fieldTree() ?? this.internalTree(),
  );

  private readonly resolvedItems = computed<readonly OgeResolvedFormItem[]>(
    () => {
      const data = this.sourceData();
      const inherited = {
        readOnly: this.readOnly(),
        disabled: this.disabled(),
      };
      return this.layout().entries.map((entry) =>
        resolveItem(
          entry.source,
          entry.id,
          readPath(data, entry.source.field),
          inherited,
        ),
      );
    },
  );

  /** The layout tree with the resolved items attached — what the template walks. */
  protected readonly nodes = computed<readonly FormNode[]>(() => {
    const byId = new Map(this.resolvedItems().map((item) => [item.id, item]));
    const invalidFields = new Set(this.errors().map((error) => error.field));

    const attach = (nodes: readonly LayoutNode[]): readonly FormNode[] =>
      nodes.flatMap<FormNode>((node) => {
        if (node.kind === 'item') {
          const item = node.itemId ? byId.get(node.itemId) : undefined;
          if (!item) return [];
          return [
            {
              ...node,
              item,
              colSpan: item.colSpan,
              errorCount: invalidFields.has(item.field) ? 1 : 0,
            },
          ];
        }
        const children = attach(node.children ?? []);
        const errorCount = children.reduce(
          (total, child) => total + (child.errorCount ?? 0),
          0,
        );
        return [{ ...node, children, errorCount }];
      });
    return attach(this.layout().nodes);
  });

  protected readonly hasItems = computed(() => this.resolvedItems().length > 0);

  /** `true` once a submit failed, which is when the summary appears. */
  private readonly submitAttempted = signal(false);

  /**
   * Bumped on every `FormGroup` event. `AbstractControl.invalid` is a plain
   * property, so without this the error computeds would never re-run in
   * `formGroup` mode (the grid hit the same thing in its editing model).
   */
  private readonly controlRevision = signal(0);

  /** Previous model snapshot, so `fieldChanged` can report what actually moved. */
  private lastSnapshot: unknown;
  protected readonly summaryVisible = computed(
    () => this.showValidationSummary() && this.submitAttempted(),
  );

  /** One entry per invalid field, in layout order — regardless of display gating. */
  readonly errors = computed<readonly OgeFormErrorEntry[]>(() =>
    this.resolvedItems().flatMap((item) => {
      const message = this.messageFor(item, false);
      return message === null
        ? []
        : [{ field: item.field, label: item.label, message }];
    }),
  );

  /** Whether every bound field currently validates. */
  readonly valid = computed(() => this.errors().length === 0);

  /** Whether any bound field has been edited since it was last reset. */
  readonly dirty = computed(() => {
    const group = this.formGroup();
    if (group) {
      this.controlRevision();
      return group.dirty;
    }
    return this.activeTree()?.().dirty() ?? false;
  });

  protected readonly gridStyle = computed(() =>
    this.columnsFor(this.colCount()),
  );

  protected readonly breakpointStyle = computed<Record<string, string>>(() => {
    const byScreen = this.colCountByScreen();
    const style: Record<string, string> = {
      '--oge-form-min-col': `${this.minColWidth()}px`,
    };
    if (!byScreen) return style;
    for (const size of BREAKPOINTS) {
      const count = byScreen[size];
      if (count !== undefined) {
        style[`--oge-form-cols-${size}`] = this.columnsFor(count);
      }
    }
    return style;
  });

  constructor() {
    effect((onCleanup) => {
      const group = this.formGroup();
      if (!group) return;
      const subscription = group.events.subscribe(() =>
        this.controlRevision.update((value) => value + 1),
      );
      onCleanup(() => subscription.unsubscribe());
    });

    // `[(formData)]` two-way: Signal Forms writes the model, we mirror it out.
    effect(() => {
      const next = this.dataModel();
      untracked(() => {
        if (this.mode() !== 'formData') return;
        if (Object.is(this.formData(), next)) return;
        this.formData.set(next);
      });
    });

    // one diff for every binding mode, so `fieldChanged` does not depend on
    // which source the caller happened to bind
    effect(() => {
      const next = this.sourceData();
      untracked(() => {
        const previous = this.lastSnapshot;
        this.lastSnapshot = next;
        if (previous === undefined) return;
        this.emitFieldChanges(previous, next);
      });
    });

    if (isDevMode()) {
      effect(() => {
        if (this.mode() === 'formData') return;
        const declared = this.itemSources().some(
          (item) =>
            item.isRequired === true ||
            (item.validationRules?.length ?? 0) > 0 ||
            item.disabled !== undefined ||
            item.readOnly !== undefined,
        );
        if (!declared) return;
        console.warn(
          '[oge-form] validationRules / isRequired / disabled / readOnly on an ' +
            'item are ignored when the form is bound with [fieldTree] or ' +
            '[formGroup] — the bound form owns that state. Express it in the ' +
            'schema (required(), disabled(), readonly()) or on the control.',
        );
      });
    }
  }

  // --- public methods --------------------------------------------------------

  /**
   * Validates, emits the cancelable `submitting` event and — when it survives
   * both — emits `submitted`. Resolves `false` when the form was invalid or
   * the submit was canceled, and moves focus to the first invalid field.
   */
  async submit(event?: Event): Promise<boolean> {
    event?.preventDefault();
    this.submitAttempted.set(true);
    this.markAllAsTouched();
    const valid = this.validate();
    const data = this.currentData();
    const pre: OgeFormSubmittingEvent<T> = {
      data,
      valid,
      cancel: false,
      event,
    };
    this.submitting.emit(pre);
    if (pre.cancel || !valid) {
      this.focusFirstInvalid();
      return false;
    }
    const tree = this.activeTree();
    if (tree) {
      // the structural tree alias erases the model type; submit() needs the
      // real one, and the value it carries is the caller's either way
      await submitField(tree as unknown as FieldTree<T>, async () => undefined);
    }
    this.submitted.emit({ data, event });
    return true;
  }

  /** Re-reads validity and emits `validated`. Does not touch focus. */
  validate(): boolean {
    const errors = this.errors();
    this.validated.emit({ valid: errors.length === 0, errors });
    return errors.length === 0;
  }

  /** Resets every field to `values`, or to the form's initial data. */
  reset(values?: Partial<T>): void {
    this.submitAttempted.set(false);
    const group = this.formGroup();
    if (group) {
      group.reset(values as Record<string, unknown> | undefined);
      return;
    }
    const tree = this.activeTree();
    if (!tree) return;
    if (values) {
      this.patchTree(tree, values as Record<string, unknown>);
    }
    tree().reset();
  }

  /** Empties every editor without changing validation state. */
  clear(): void {
    this.submitAttempted.set(false);
    const group = this.formGroup();
    if (group) {
      group.reset();
      return;
    }
    const tree = this.activeTree();
    if (!tree) return;
    const empty: Record<string, unknown> = {};
    for (const item of this.resolvedItems()) {
      empty[item.field] = this.emptyValueFor(item);
    }
    this.patchTree(tree, empty as Record<string, unknown>);
  }

  /** Focuses a named field, or the first one when called with no argument. */
  focus(field?: string): void {
    const target =
      field === undefined
        ? this.fields()[0]
        : this.fields().find((f) => f.item().field === field);
    target?.focus();
  }

  /**
   * Focuses — and, with `scrollToFirstInvalid`, scrolls to — the first invalid
   * field, opening the tab or accordion panel that holds it first. Returns
   * whether there was an invalid field at all; when the field had to be
   * revealed, the focus itself lands after the next render.
   */
  focusFirstInvalid(): boolean {
    const first = this.errors()[0];
    if (!first) return false;
    const revealed = this.revealSectionFor(first.field);
    if (revealed) {
      afterNextRender(() => this.focusField(first.field), {
        injector: this.injector,
      });
      return true;
    }
    return this.focusField(first.field);
  }

  /**
   * Opens every section that holds `field`, outermost first. Returns whether
   * anything actually had to change — a field already on screen needs no
   * render pass before it can take focus.
   */
  private revealSectionFor(field: string): boolean {
    const path = this.sectionPathFor(field);
    let changed = false;
    for (const step of path) {
      if (step.section.nodeKind === 'tabs') {
        const tabs = step.section as OgeFormTabs;
        if (tabs.selectedIndex() !== step.index) {
          tabs.selectedIndex.set(step.index);
          changed = true;
        }
        continue;
      }
      if (step.section.nodeKind === 'steps') {
        const steps = step.section as OgeFormSteps;
        if (steps.activeIndex() !== step.index) {
          steps.activeIndex.set(step.index);
          changed = true;
        }
        continue;
      }
      const accordion = step.section as OgeFormAccordion;
      if (!accordion.expandedKeys().includes(step.groupId)) {
        accordion.expandedKeys.update((keys) => [...keys, step.groupId]);
        changed = true;
      }
    }
    return changed;
  }

  /** Outermost-first list of the sections that hide `field`. */
  private sectionPathFor(field: string): readonly {
    section: OgeFormTabs | OgeFormAccordion | OgeFormSteps;
    index: number;
    groupId: string;
  }[] {
    const wanted = this.resolvedItems().find((item) => item.field === field);
    if (!wanted) return [];
    const path: {
      section: OgeFormTabs | OgeFormAccordion | OgeFormSteps;
      index: number;
      groupId: string;
    }[] = [];

    const walk = (
      nodes: readonly LayoutNode[],
      trail: readonly {
        section: OgeFormTabs | OgeFormAccordion | OgeFormSteps;
        index: number;
        groupId: string;
      }[],
    ): boolean => {
      for (const node of nodes) {
        if (node.kind === 'item') {
          if (node.itemId === wanted.id) {
            path.push(...trail);
            return true;
          }
          continue;
        }
        if (node.kind === 'group') {
          if (walk(node.children ?? [], trail)) return true;
          continue;
        }
        const section = node.section;
        if (!section) continue;
        for (const panel of node.children ?? []) {
          const step = {
            section,
            index: panel.sectionIndex ?? 0,
            groupId: panel.id,
          };
          if (walk(panel.children ?? [], [...trail, step])) return true;
        }
      }
      return false;
    };

    walk(this.layout().nodes, []);
    return path;
  }

  private focusField(field: string): boolean {
    const target = this.fields().find((f) => f.item().field === field);
    if (!target) return false;
    target.focus();
    if (this.scrollToFirstInvalid()) {
      target.element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    return true;
  }

  /** The resolved configuration of one item, as the form renders it. */
  itemOption(field: string): OgeResolvedFormItem | undefined {
    return this.resolvedItems().find((item) => item.field === field);
  }

  /** Merges a partial object, or one field's value, into the bound data. */
  updateData(fieldOrData: string | Partial<T>, value?: unknown): void {
    const patch: Record<string, unknown> =
      typeof fieldOrData === 'string'
        ? { [fieldOrData]: value }
        : (fieldOrData as Record<string, unknown>);
    const group = this.formGroup();
    if (group) {
      group.patchValue(patch);
      return;
    }
    const tree = this.activeTree();
    if (!tree) return;
    this.patchTree(tree, patch as Record<string, unknown>);
  }

  // --- template callbacks ----------------------------------------------------

  protected onSubmit(event: Event): void {
    void this.submit(event);
  }

  protected onEnterKey(field: string, event: Event): void {
    this.editorEnterKey.emit({ field, event });
  }

  protected onSummaryClick(entry: OgeFormErrorEntry): void {
    this.focus(entry.field);
  }

  /** Form-level slot refs the template falls back to per node. */
  protected readonly itemTemplate = computed(
    () => this.formItemTemplate()?.template,
  );
  protected readonly editorTemplate = computed(
    () => this.formEditorTemplate()?.template,
  );
  protected readonly labelTemplate = computed(
    () => this.formLabelTemplate()?.template,
  );
  protected readonly captionTemplate = computed(
    () => this.formCaptionTemplate()?.template,
  );

  /** Error count badge for a tab, or `undefined` when the panel is clean. */
  protected badgeFor(section: FormNode, panel: FormNode): number | undefined {
    const tabs = section.section as OgeFormTabs | undefined;
    if (!tabs?.showErrorBadges()) return undefined;
    const count = panel.errorCount ?? 0;
    return count > 0 ? count : undefined;
  }

  /** Whether an accordion panel or a wizard step holds an invalid field. */
  protected invalidSection(section: FormNode, panel: FormNode): boolean {
    const owner = section.section as
      OgeFormAccordion | OgeFormSteps | undefined;
    if (!owner?.showInvalidSections()) return false;
    return (panel.errorCount ?? 0) > 0;
  }

  /**
   * A wizard step is complete when nothing under it is invalid. `errorCount`
   * is the ungated count, which is what `linear` wants: a step whose required
   * fields are still empty must not be passed, even though the user has not
   * been shown an error yet.
   */
  protected stepComplete(_section: FormNode, panel: FormNode): boolean {
    return (panel.errorCount ?? 0) === 0;
  }

  /**
   * Touches the leaving step's fields as the user advances, so the steps ahead
   * stay quiet. Runs on the cancelable pre-event, before the stepper commits.
   */
  protected onFormStepChanging(
    section: FormNode,
    event: { fromIndex: number; toIndex: number },
  ): void {
    const steps = section.section as OgeFormSteps | undefined;
    if (!steps?.touchOnLeave() || event.toIndex <= event.fromIndex) return;
    const leaving = section.children?.[event.fromIndex];
    if (leaving) this.markNodeAsTouched(leaving);
  }

  protected nodeOf(node: FormNode): OgeResolvedFormItem {
    // the template only calls this inside the `item` branch
    return node.item as OgeResolvedFormItem;
  }

  protected fieldNodeFor(
    item: OgeResolvedFormItem,
  ): OgeFormFieldNode | undefined {
    const tree = this.activeTree();
    if (!tree) return undefined;
    let current: unknown = tree;
    for (const key of item.field.split('.')) {
      if (current == null) return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return current as OgeFormFieldNode | undefined;
  }

  protected controlFor(
    item: OgeResolvedFormItem,
  ): FormControl<unknown> | undefined {
    const group = this.formGroup();
    if (!group) return undefined;
    const control = group.get(item.field);
    return control instanceof FormControl
      ? (control as FormControl<unknown>)
      : undefined;
  }

  protected columnsFor(colCount: OgeFormColCount | undefined): string {
    if (colCount === undefined || colCount === 'auto') {
      return 'repeat(auto-fit, minmax(var(--oge-form-min-col), 1fr))';
    }
    return `repeat(${Math.max(1, Math.floor(colCount))}, minmax(0, 1fr))`;
  }

  protected columnsOf(colCount: OgeFormColCount | undefined): number {
    const effective = colCount ?? this.colCount();
    return typeof effective === 'number' ? Math.max(1, effective) : 12;
  }

  /**
   * The error text a field would show. `gated` applies the display rule — an
   * untouched, pristine field stays quiet until a submit has been attempted —
   * which is why `errors()` and `valid()` ask for the ungated answer and the
   * rendered field asks for the gated one.
   */
  private messageFor(item: OgeResolvedFormItem, gated: boolean): string | null {
    const messages = this.inputsConfig.messages;
    const group = this.formGroup();
    if (group) {
      this.controlRevision();
      const control = group.get(item.field);
      if (!control || !control.invalid) return null;
      if (
        gated &&
        !control.touched &&
        !control.dirty &&
        !this.submitAttempted()
      ) {
        return null;
      }
      return resolveErrorMessage([], control.errors, messages);
    }
    const node = this.fieldNodeFor(item);
    if (!node) return null;
    const state = node();
    const errors = state.errors() as readonly OgeFieldError[];
    if (errors.length === 0) return null;
    if (
      gated &&
      !state.touched() &&
      !state.dirty() &&
      !this.submitAttempted()
    ) {
      return null;
    }
    return resolveErrorMessage(errors, null, messages);
  }

  protected errorFor(item: OgeResolvedFormItem): string | null {
    return this.messageFor(item, true);
  }

  // --- internals -------------------------------------------------------------

  private itemDataOf(child: OgeFormItem, group?: string): OgeFormItemData {
    return {
      field: child.field(),
      key: child.key(),
      label: child.label(),
      labelVisible: child.labelVisible(),
      hint: child.hint(),
      placeholder: child.placeholder(),
      dataType: child.dataType(),
      editorType: child.editorType(),
      editorOptions: child.editorOptions(),
      colSpan: child.colSpan(),
      visible: child.visible(),
      visibleIndex: child.visibleIndex(),
      isRequired: child.isRequired(),
      validationRules: child.validationRules(),
      readOnly: child.readOnly(),
      disabled: child.disabled(),
      cssClass: child.cssClass(),
      group,
    };
  }

  /**
   * Merges a patch into the bound tree's value. The Signal Forms setter is
   * typed on the exact model shape, so a partial merge needs exactly one cast,
   * and it lives here rather than at three call sites.
   */
  private patchTree(
    tree: OgeFormFieldTree,
    patch: Record<string, unknown>,
  ): void {
    const next = { ...(tree().value() as object), ...patch } as T;
    (tree().value.set as (value: T) => void)(next);
  }

  private currentData(): T {
    const group = this.formGroup();
    if (group) return group.value as T;
    const tree = this.activeTree();
    return tree ? (tree().value() as T) : (this.formData() ?? ({} as T));
  }

  private markAllAsTouched(): void {
    const group = this.formGroup();
    if (group) {
      group.markAllAsTouched();
      return;
    }
    this.activeTree()?.().markAsTouched();
  }

  /**
   * Touches only the fields under one layout node.
   *
   * A wizard needs this: `markAllAsTouched()` would light up every step the
   * user has not reached yet, so leaving step 1 would paint step 3 red. All
   * three binding modes are covered — the reactive branch walks the group, the
   * other two share the Signal Forms tree.
   */
  protected markNodeAsTouched(node: FormNode): void {
    const group = this.formGroup();
    for (const field of this.fieldsUnder(node)) {
      if (group) {
        group.get(field)?.markAsTouched();
        continue;
      }
      const item = this.resolvedItems().find((i) => i.field === field);
      if (item) this.fieldNodeFor(item)?.().markAsTouched();
    }
    if (group) this.controlRevision.update((v) => v + 1);
  }

  /** Field paths of every item in a node's subtree, in layout order. */
  private fieldsUnder(node: FormNode): readonly string[] {
    if (node.kind === 'item') return node.item ? [node.item.field] : [];
    return (node.children ?? []).flatMap((child) => this.fieldsUnder(child));
  }

  private emptyValueFor(item: OgeResolvedFormItem): unknown {
    switch (item.dataType) {
      case 'boolean':
        return false;
      case 'number':
        return null;
      case 'date':
      case 'datetime':
        return null;
      case 'dateRange':
        return [null, null];
      case 'array':
        return [];
      default:
        return '';
    }
  }

  private emitFieldChanges(previous: unknown, next: unknown): void {
    for (const item of untracked(() => this.resolvedItems())) {
      const before = readPath(previous, item.field);
      const after = readPath(next, item.field);
      if (Object.is(before, after)) continue;
      this.fieldChanged.emit({
        field: item.field,
        value: after,
        previousValue: before,
      });
    }
  }
}
