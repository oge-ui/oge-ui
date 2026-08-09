import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/forms/src/lib/** — keep in sync with the source
 * TSDoc when the public API changes.
 */

const FORM_PROPERTY_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Binding',
    entries: [
      {
        name: 'fieldTree',
        type: 'FieldTree&lt;T&gt; | undefined',
        default: 'undefined',
        description:
          'An Angular Signal Forms tree, as returned by <code>form()</code>. The caller owns validation, required marks, disabled and readonly state.',
      },
      {
        name: 'formGroup',
        type: 'FormGroup | undefined',
        default: 'undefined',
        description:
          'A reactive <code>FormGroup</code>. Each item binds its matching control through the editors&#39; control-value-accessor path.',
      },
      {
        name: 'formData',
        type: 'T | undefined',
        default: 'undefined',
        description:
          'A plain model object — two-way. The form builds its own Signal Forms tree over it, compiling each item&#39;s <code>validationRules</code> into the schema.',
      },
      {
        name: 'items',
        type: 'readonly OgeFormItemData[] | undefined',
        default: 'undefined',
        description:
          'Data-driven items, rendered after the projected <code>&lt;oge-form-item&gt;</code> children.',
      },
      {
        name: 'groups',
        type: 'readonly OgeFormGroupData[] | undefined',
        default: 'undefined',
        description:
          'Data-driven groups, matched to items by <code>key</code> (or <code>caption</code>) through an item&#39;s <code>group</code>.',
      },
      {
        name: 'mode',
        type: 'Signal&lt;OgeFormMode&gt;',
        description:
          'Read-only: which binding the form resolved to. Derived from the bound inputs, never configured.',
      },
    ],
  },
  {
    title: 'Layout',
    entries: [
      {
        name: 'colCount',
        type: "number | 'auto'",
        default: "'auto'",
        description:
          'Layout columns. <code>&#39;auto&#39;</code> fits as many <code>minColWidth</code> tracks as the form is wide.',
      },
      {
        name: 'colCountByScreen',
        type: 'Partial&lt;Record&lt;OgeFormScreenSize, number&gt;&gt; | undefined',
        default: 'undefined',
        description:
          'Column count per breakpoint. Implemented as container queries on the form itself, so a form in a dialog or a grid cell sizes from its own width — not the window&#39;s.',
      },
      {
        name: 'minColWidth',
        type: 'number',
        default: '220',
        description:
          'Narrowest column <code>colCount: &#39;auto&#39;</code> will produce, in pixels.',
      },
      {
        name: 'labelLocation',
        type: "'top' | 'start' | 'end'",
        default: "'top'",
        description:
          '<code>&#39;top&#39;</code> keeps each editor&#39;s own label chrome; the side values hand the label to the form, which draws a real <code>&lt;label for&gt;</code> in its own column.',
      },
      {
        name: 'labelMode',
        type: "'static' | 'floating' | 'hidden' | 'outside'",
        default: "'static'",
        description:
          'Forwarded to every editor. Forced to <code>&#39;hidden&#39;</code> when <code>labelLocation</code> is a side value, so no label renders twice.',
      },
      {
        name: 'alignItemLabels',
        type: 'boolean',
        default: 'true',
        description:
          'Gives side labels one shared column width so the editors line up.',
      },
      {
        name: 'showColonAfterLabel',
        type: 'boolean',
        default: 'false',
        description: 'Appends <code>messages.labelColon</code> to every label.',
      },
      {
        name: 'showRequiredMark',
        type: 'boolean',
        default: 'true',
        description:
          'Renders <code>messages.requiredMark</code> after a required label, <code>aria-hidden</code>, with a screen-reader-only word beside it.',
      },
      {
        name: 'showOptionalMark',
        type: 'boolean',
        default: 'false',
        description:
          'Renders <code>messages.optionalMark</code> after every non-required label.',
      },
      {
        name: 'size',
        type: "'sm' | 'md' | 'lg'",
        default: "'md'",
        description: 'Forwarded to every editor.',
      },
      {
        name: 'stylingMode',
        type: "'outlined' | 'filled' | 'underlined'",
        default: "'outlined'",
        description: 'Forwarded to every editor.',
      },
      {
        name: 'subscriptSizing',
        type: "'fixed' | 'dynamic' | 'none'",
        default: "'fixed'",
        description:
          'Forwarded to every editor. <code>&#39;fixed&#39;</code> reserves the hint/error line so an appearing error never shifts the layout.',
      },
    ],
  },
  {
    title: 'State',
    entries: [
      {
        name: 'readOnly',
        type: 'boolean',
        default: 'false',
        description:
          'Makes every editor read-only, overridable per group and per item. In <code>[fieldTree]</code> mode use the schema&#39;s <code>readonly()</code> instead.',
      },
      {
        name: 'disabled',
        type: 'boolean',
        default: 'false',
        description:
          'Wraps the fields in a <code>&lt;fieldset disabled&gt;</code>. In <code>[fieldTree]</code> mode use the schema&#39;s <code>disabled()</code> — the <code>FormField</code> directive writes the editor&#39;s <code>disabled</code> input itself.',
      },
      {
        name: 'showValidationSummary',
        type: 'boolean',
        default: 'false',
        description:
          'Renders an <code>&lt;oge-validation-summary&gt;</code> above the fields once a submit has failed.',
      },
      {
        name: 'scrollToFirstInvalid',
        type: 'boolean',
        default: 'true',
        description:
          'Scrolls the first invalid field into view when a submit fails. Focus moves there either way.',
      },
      {
        name: 'errors',
        type: 'Signal&lt;readonly OgeFormErrorEntry[]&gt;',
        description:
          'Read-only: one entry per invalid field, in layout order, regardless of whether the field is showing its error yet.',
      },
      {
        name: 'valid',
        type: 'Signal&lt;boolean&gt;',
        description:
          'Read-only: whether every bound field currently validates.',
      },
      {
        name: 'dirty',
        type: 'Signal&lt;boolean&gt;',
        description:
          'Read-only: whether any bound field has been edited since the last reset. Works in all three binding modes.',
      },
      {
        name: 'messages',
        type: 'Partial&lt;OgeFormsMessages&gt; | undefined',
        default: 'undefined',
        description:
          'Per-instance string overrides, merged over <code>provideOgeFormsConfig()</code>.',
      },
      {
        name: 'renderFormElement',
        type: 'boolean',
        default: 'true',
        description:
          'Whether the fields are wrapped in a real <code>&lt;form&gt;</code>. Set <code>false</code> inside another form \u2014 nested forms are invalid HTML; the grid&#39;s row editor does exactly this. With <code>false</code> there is no native submit, so drive it with <code>submit()</code>.',
      },
    ],
  },
];

const FORM_METHOD_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'submit(event?: Event)',
        type: 'Promise&lt;boolean&gt;',
        description:
          'Marks every field touched, validates, emits <code>submitting</code> and then <code>submitted</code>. Resolves <code>false</code> when the form was invalid or the submit was canceled, and focuses the first invalid field.',
      },
      {
        name: 'validate()',
        type: 'boolean',
        description:
          'Re-reads validity and emits <code>validated</code>. Does not move focus.',
      },
      {
        name: 'reset(values?: Partial&lt;T&gt;)',
        type: 'void',
        description:
          'Resets every field to <code>values</code>, or to the bound form&#39;s initial data, and hides the validation summary.',
      },
      {
        name: 'clear()',
        type: 'void',
        description:
          'Empties every editor using the per-<code>dataType</code> empty value (<code>&#39;&#39;</code>, <code>null</code>, <code>false</code>, <code>[]</code>).',
      },
      {
        name: 'focus(field?: string)',
        type: 'void',
        description:
          'Focuses a named field, or the first one when called with no argument.',
      },
      {
        name: 'focusFirstInvalid()',
        type: 'boolean',
        description:
          'Focuses — and, with <code>scrollToFirstInvalid</code>, scrolls to — the first invalid field. Returns <code>false</code> when the form is valid.',
      },
      {
        name: 'itemOption(field: string)',
        type: 'OgeResolvedFormItem | undefined',
        description:
          'The resolved configuration of one item, as the form actually renders it. Replaces the reference libraries&#39; <code>getEditor()</code>, which hands out a component instance.',
      },
      {
        name: 'updateData(field: string, value: unknown)',
        type: 'void',
        description:
          'Writes one field. The overload <code>updateData(partial)</code> merges an object into the bound data.',
      },
    ],
  },
];

const FORM_EVENT_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'submitting',
        type: 'OgeFormSubmittingEvent&lt;T&gt;',
        description:
          'Cancelable pre-submit — <code>{ data, valid, cancel, event }</code>. Set <code>cancel</code> to stop the submit.',
      },
      {
        name: 'submitted',
        type: 'OgeFormSubmittedEvent&lt;T&gt;',
        description:
          'Emitted after a submit passed validation and was not canceled.',
      },
      {
        name: 'fieldChanged',
        type: 'OgeFormFieldChangedEvent',
        description:
          'One field&#39;s value changed — <code>{ field, value, previousValue }</code>.',
      },
      {
        name: 'validated',
        type: 'OgeFormValidatedEvent',
        description:
          'Emitted after <code>validate()</code> or a submit attempt — <code>{ valid, errors }</code>.',
      },
      {
        name: 'editorEnterKey',
        type: 'OgeFormKeyEvent',
        description:
          'Enter pressed inside an editor — <code>{ field, event }</code>.',
      },
    ],
  },
];

const FORM_TYPE_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'OgeFormMode',
        type: "'fieldTree' | 'formGroup' | 'formData'",
        description: 'Which binding the form resolved to.',
      },
      {
        name: 'OgeFormDataType',
        type: "'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'dateRange' | 'array' | 'object'",
        description:
          'Value shape of an item. Inferred from the model value when not set.',
      },
      {
        name: 'OgeFormEditorType',
        type: "'textBox' | 'textArea' | 'numberBox' | 'selectBox' | 'tagBox' | 'autocomplete' | 'treeSelect' | 'dateBox' | 'dateRangeBox' | 'calendar' | 'checkBox' | 'switch' | 'radioGroup'",
        description:
          'Which <code>&#64;oge-ui/inputs</code> editor renders an item. House camelCase names, not the reference libraries&#39; class names.',
      },
      {
        name: 'OgeFormLabelLocation',
        type: "'top' | 'start' | 'end'",
        description: 'Where an item&#39;s label sits relative to its editor.',
      },
      {
        name: 'OgeFormScreenSize',
        type: "'xs' | 'sm' | 'md' | 'lg' | 'xl'",
        description:
          'Container-query breakpoints: under 480, then 480 / 720 / 960 / 1200 pixels of form width.',
      },
      {
        name: 'OgeFormColCount',
        type: "number | 'auto'",
        description:
          'A fixed track count, or auto-fit by <code>minColWidth</code>.',
      },
      {
        name: 'OgeValidationRule',
        type: "{ type: 'required' | 'email' | 'numeric' | 'stringLength' | 'pattern' | 'range' | 'custom' | 'async'; … }",
        description:
          'A declarative rule. Compiled into an Angular Signal Forms schema — there is no second validation engine.',
      },
      {
        name: 'OgeValidationContext',
        type: '{ value: unknown; data: Record&lt;string, unknown&gt; }',
        description:
          'What a <code>custom</code> rule sees: its own value and the whole model, which is what makes cross-field rules possible.',
      },
      {
        name: 'OgeFormErrorEntry',
        type: '{ field: string; label: string; message: string }',
        description: 'One row of the validation summary.',
      },
      {
        name: 'OgeResolvedFormItem',
        type: 'interface',
        description:
          'An item after label defaulting, dataType inference, editor selection and state inheritance — what <code>itemOption()</code> returns.',
      },
    ],
  },
];

export const OGE_FORM_API: ApiSections = {
  properties: FORM_PROPERTY_GROUPS,
  methods: FORM_METHOD_GROUPS,
  events: FORM_EVENT_GROUPS,
  types: FORM_TYPE_GROUPS,
};

export const OGE_FORM_SECTIONS_API: ApiSections = {
  properties: [
    {
      title: 'OgeFormTabs \u2014 <oge-form-tabs>',
      entries: [
        {
          name: 'selectedIndex',
          type: 'number',
          default: '0',
          description:
            'Open tab \u2014 two-way. A failed submit sets it to the tab holding the first invalid field.',
        },
        {
          name: 'deferRendering',
          type: 'boolean',
          default: 'false',
          description:
            'Deliberately the opposite of the tab panel&#39;s own default: a form usually wants every field in the DOM. Validation runs on the model either way.',
        },
        {
          name: 'keepAlive',
          type: 'boolean',
          default: 'true',
          description:
            'Keeps a rendered tab&#39;s fields mounted while it is hidden.',
        },
        {
          name: 'showErrorBadges',
          type: 'boolean',
          default: 'true',
          description:
            'Shows each tab&#39;s invalid-field count as a badge on the tab.',
        },
        {
          name: 'key / visible / visibleIndex / colSpan / cssClass',
          type: 'string | boolean | number | undefined',
          description: 'The same section-level knobs a group has.',
        },
      ],
    },
    {
      title: 'OgeFormSteps \u2014 <oge-form-steps>',
      entries: [
        {
          name: 'activeIndex',
          type: 'number',
          default: '0',
          description:
            'Active step \u2014 two-way. A failed submit moves to the step holding the first invalid field.',
        },
        {
          name: 'linear',
          type: 'boolean',
          default: 'false',
          description:
            'Blocks moving past a step that still has invalid fields. Completion comes from the form&#39;s own per-step error rollup, so it behaves identically in all three binding modes.',
        },
        {
          name: 'orientation',
          type: "'horizontal' | 'vertical'",
          default: "'horizontal'",
          description: 'Passed through to the stepper.',
        },
        {
          name: 'showNavigation',
          type: 'boolean',
          default: 'true',
          description:
            'Renders the stepper&#39;s built-in Back / Next bar. On by default here, because a wizard inside a form almost always wants one.',
        },
        {
          name: 'touchOnLeave',
          type: 'boolean',
          default: 'true',
          description:
            'Touches only the leaving step&#39;s fields on each advance, so the steps ahead stay quiet instead of turning red \u2014 which a plain <code>markAllAsTouched()</code> would cause.',
        },
        {
          name: 'showInvalidSections',
          type: 'boolean',
          default: 'true',
          description:
            'Flags a step whose fields are invalid, driving the stepper&#39;s error indicator.',
        },
        {
          name: 'deferRendering / keepAlive',
          type: 'boolean',
          description:
            'See <code>OgeFormTabs</code> \u2014 same defaults, same reasoning.',
        },
        {
          name: 'key / visible / visibleIndex / colSpan / cssClass',
          type: 'string | boolean | number | undefined',
          description: 'The same section-level knobs a group has.',
        },
      ],
    },
    {
      title: 'OgeFormAccordion \u2014 <oge-form-accordion>',
      entries: [
        {
          name: 'expandedKeys',
          type: 'readonly string[]',
          default: '[]',
          description:
            'Expanded panels \u2014 two-way. A failed submit adds the panel holding the first invalid field.',
        },
        {
          name: 'multiple',
          type: 'boolean',
          default: 'true',
          description: 'Whether more than one panel may be open at a time.',
        },
        {
          name: 'collapsible',
          type: 'boolean',
          default: 'true',
          description: 'Whether the open panel may be closed again.',
        },
        {
          name: 'showInvalidSections',
          type: 'boolean',
          default: 'true',
          description:
            'Drives the accordion&#39;s own invalid indicator \u2014 danger rail, dot and screen-reader label \u2014 from the panel&#39;s field errors.',
        },
        {
          name: 'deferRendering / keepAlive',
          type: 'boolean',
          description: 'As on <code>&lt;oge-form-tabs&gt;</code>.',
        },
      ],
    },
  ],
};

export const OGE_FORM_METADATA_API: ApiSections = {
  properties: [
    {
      title: 'Schema-carried layout',
      entries: [
        {
          name: 'OGE_FORM_LABEL',
          type: 'MetadataKey&lt;string&gt;',
          description:
            'Label text, set with <code>metadata(path, OGE_FORM_LABEL, () =&gt; &#39;\u2026&#39;)</code> in a Signal Forms schema.',
        },
        {
          name: 'OGE_FORM_HINT',
          type: 'MetadataKey&lt;string&gt;',
          description: 'Help text under the editor.',
        },
        {
          name: 'OGE_FORM_PLACEHOLDER',
          type: 'MetadataKey&lt;string&gt;',
          description: 'Editor placeholder.',
        },
        {
          name: 'OGE_FORM_COL_SPAN',
          type: 'MetadataKey&lt;number&gt;',
          description: 'Layout columns the field spans.',
        },
        {
          name: 'OGE_FORM_EDITOR',
          type: 'MetadataKey&lt;OgeFormEditorType&gt;',
          description: 'Explicit editor for the field.',
        },
        {
          name: 'OGE_FORM_EDITOR_OPTIONS',
          type: 'MetadataKey&lt;OgeFormEditorOptions&gt;',
          description: 'Curated editor inputs.',
        },
        {
          name: 'OGE_FORM_DATA_TYPE',
          type: 'MetadataKey&lt;OgeFormDataType&gt;',
          description:
            'Value shape, when the live value is not descriptive enough.',
        },
        {
          name: 'OGE_FORM_GROUP',
          type: 'MetadataKey&lt;string&gt;',
          description:
            'Caption of the group the field belongs to; the group is created on demand.',
        },
        {
          name: 'OGE_FORM_ORDER',
          type: 'MetadataKey&lt;number&gt;',
          description:
            'Ordering hint, equivalent to an item&#39;s <code>visibleIndex</code>.',
        },
        {
          name: 'itemFromMetadata(field, node)',
          type: 'OgeFormItemData | undefined',
          description:
            'Builds one item description from a field&#39;s metadata; <code>undefined</code> for a field the schema hid with <code>hidden()</code>.',
        },
      ],
    },
  ],
};

export const OGE_FORM_TEMPLATE_API: ApiSections = {
  properties: [
    {
      title: 'Slots',
      entries: [
        {
          name: 'ogeFormItemTemplate',
          type: 'directive — [ogeFormItemTemplate]',
          description:
            'Replaces a field entirely: label, editor and error text. Legal at form level (every item) or inside one <code>&lt;oge-form-item&gt;</code>, where it wins.',
        },
        {
          name: 'ogeFormEditorTemplate',
          type: 'directive — [ogeFormEditorTemplate]',
          description:
            'Replaces only the control, keeping the form&#39;s label, required mark and error chrome. The escape hatch for anything <code>editorOptions</code> cannot express.',
        },
        {
          name: 'ogeFormLabelTemplate',
          type: 'directive — [ogeFormLabelTemplate]',
          description:
            'Replaces the label content. The surrounding <code>&lt;label for&gt;</code> stays, so the control association and the required mark survive.',
        },
        {
          name: 'ogeFormGroupCaptionTemplate',
          type: 'directive — [ogeFormGroupCaptionTemplate]',
          description:
            'Replaces the content of a group&#39;s <code>&lt;legend&gt;</code>. The fieldset/legend pair itself stays — that is what makes the section a labelled group.',
        },
        {
          name: 'ogeFormActions',
          type: 'directive — [ogeFormActions]',
          description:
            'Marks the projected action bar (submit, reset, …). A typed marker rather than a bare attribute.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeFormItemTemplateContext',
          type: '{ $implicit: OgeResolvedFormItem; item; field; control; error; editorId }',
          description:
            'Context of the item and editor slots. <code>field</code> is the Signal Forms node (bind with <code>[formField]</code>), <code>control</code> the reactive one, and <code>editorId</code> the id the form&#39;s <code>&lt;label for&gt;</code> points at.',
        },
        {
          name: 'OgeFormLabelTemplateContext',
          type: '{ $implicit: string; item; required; editorId }',
          description:
            'Context of the label slot; <code>$implicit</code> is the resolved label text.',
        },
        {
          name: 'OgeFormGroupCaptionTemplateContext',
          type: '{ $implicit: string }',
          description: 'Context of the group caption slot.',
        },
      ],
    },
  ],
};

export const OGE_FORM_ITEM_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'field',
          type: 'string',
          description:
            'Required. Model property this item edits; dot-notation reaches nested objects.',
        },
        {
          name: 'key',
          type: 'string | undefined',
          default: 'undefined',
          description: 'Stable identity; defaults to <code>field</code>.',
        },
        {
          name: 'label',
          type: 'string | undefined',
          default: 'undefined',
          description:
            'Label text. Defaults to a title-cased <code>field</code> — <code>postalCode</code> becomes “Postal code”.',
        },
        {
          name: 'labelVisible',
          type: 'boolean',
          default: 'true',
          description:
            'Set <code>false</code> to render the editor with no label.',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          default: 'undefined',
          description:
            'Help text under the editor. Chrome editors render it in their own subscript; bare controls get it from the form.',
        },
        {
          name: 'placeholder',
          type: 'string | undefined',
          default: 'undefined',
          description: 'Placeholder forwarded to the editor.',
        },
        {
          name: 'dataType',
          type: 'OgeFormDataType | undefined',
          default: 'undefined',
          description:
            'Value shape. Inferred from the current model value when omitted.',
        },
        {
          name: 'editorType',
          type: 'OgeFormEditorType | undefined',
          default: 'undefined',
          description:
            'Explicit editor; beats both <code>editorOptions.items</code> and <code>dataType</code>.',
        },
        {
          name: 'editorOptions',
          type: 'OgeFormEditorOptions | undefined',
          default: 'undefined',
          description:
            'A curated, typed subset of editor inputs (<code>items</code>, <code>displayExpr</code>, <code>min</code>, <code>max</code>, <code>rows</code>, …). Supplying <code>items</code> selects a select box or tag box.',
        },
        {
          name: 'colSpan',
          type: 'number',
          default: '1',
          description:
            'Layout columns the item spans, clamped to the column count in force.',
        },
        {
          name: 'visible',
          type: 'boolean',
          default: 'true',
          description:
            'A hidden item is dropped from the layout entirely — no hidden input, no stale DOM value.',
        },
        {
          name: 'visibleIndex',
          type: 'number | undefined',
          default: 'undefined',
          description:
            'Items with an index come first, in index order; everything else keeps its declaration order behind them.',
        },
        {
          name: 'isRequired',
          type: 'boolean',
          default: 'false',
          description:
            'Adds a <code>required</code> rule and shows the required mark.',
        },
        {
          name: 'validationRules',
          type: 'readonly OgeValidationRule[] | undefined',
          default: 'undefined',
          description:
            'Declarative rules, compiled into the form&#39;s Signal Forms schema. Ignored — with a dev-mode warning — when the form is bound with <code>[fieldTree]</code> or <code>[formGroup]</code>.',
        },
        {
          name: 'readOnly',
          type: 'boolean | undefined',
          default: 'undefined',
          description:
            '<code>undefined</code> falls back to the enclosing group, then the form.',
        },
        {
          name: 'disabled',
          type: 'boolean | undefined',
          default: 'undefined',
          description:
            '<code>undefined</code> falls back to the enclosing group, then the form.',
        },
        {
          name: 'cssClass',
          type: 'string | undefined',
          default: 'undefined',
          description: 'Extra class on the item wrapper.',
        },
      ],
    },
  ],
};

export const OGE_FORM_GROUP_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'caption',
          type: 'string',
          default: "''",
          description:
            'Legend text. An empty caption renders an unlabelled section.',
        },
        {
          name: 'key',
          type: 'string | undefined',
          default: 'undefined',
          description: 'Stable identity; defaults to the caption.',
        },
        {
          name: 'colCount',
          type: 'OgeFormColCount | undefined',
          default: 'undefined',
          description:
            'Columns inside this group; <code>undefined</code> inherits the form&#39;s count.',
        },
        {
          name: 'colSpan',
          type: 'number',
          default: '1',
          description: 'Columns the group itself spans in its parent layout.',
        },
        {
          name: 'visible',
          type: 'boolean',
          default: 'true',
          description:
            'Drops the whole section, and its items, from the layout.',
        },
        {
          name: 'disabled',
          type: 'boolean | undefined',
          default: 'undefined',
          description:
            'Disables every item in the section, unless the item overrides it.',
        },
        {
          name: 'readOnly',
          type: 'boolean | undefined',
          default: 'undefined',
          description:
            'Makes every item in the section read-only, unless the item overrides it.',
        },
        {
          name: 'visibleIndex',
          type: 'number | undefined',
          default: 'undefined',
          description:
            'Explicit ordering among this group&#39;s siblings. Ordering is scoped per level, the way the reference libraries scope it.',
        },
        {
          name: 'cssClass',
          type: 'string | undefined',
          default: 'undefined',
          description: 'Extra class on the fieldset.',
        },
      ],
    },
  ],
};

export const OGE_VALIDATION_SUMMARY_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'errors',
          type: 'readonly OgeFormErrorEntry[]',
          default: '[]',
          description:
            'One entry per invalid field, in layout order. Bind <code>form.errors()</code>.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeFormsMessages&gt; | undefined',
          default: 'undefined',
          description: 'Per-instance string overrides.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'errorClick',
          type: 'OgeFormErrorEntry',
          description:
            'A summary row was activated. Bind it to <code>form.focus($event.field)</code>.',
        },
      ],
    },
  ],
};

export const OGE_FORMS_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'provideOgeFormsConfig()',
      entries: [
        {
          name: 'labelLocation',
          type: 'OgeFormLabelLocation | undefined',
          default: "'top'",
          description:
            'Application-wide default for the input of the same name.',
        },
        {
          name: 'minColWidth',
          type: 'number | undefined',
          default: '220',
          description:
            'Application-wide default for the input of the same name.',
        },
        {
          name: 'showRequiredMark',
          type: 'boolean | undefined',
          default: 'true',
          description:
            'Application-wide default for the input of the same name.',
        },
        {
          name: 'showOptionalMark',
          type: 'boolean | undefined',
          default: 'false',
          description:
            'Application-wide default for the input of the same name.',
        },
        {
          name: 'showColonAfterLabel',
          type: 'boolean | undefined',
          default: 'false',
          description:
            'Application-wide default for the input of the same name.',
        },
      ],
    },
    {
      title: 'OgeFormsMessages',
      entries: [
        {
          name: 'requiredMark',
          type: 'string',
          default: "'*'",
          description: 'Marker after a required label; rendered aria-hidden.',
        },
        {
          name: 'optionalMark',
          type: 'string',
          default: "'optional'",
          description: 'Marker after an optional label.',
        },
        {
          name: 'requiredLabel',
          type: 'string',
          default: "'required'",
          description: 'Screen-reader text beside the required mark.',
        },
        {
          name: 'optionalLabel',
          type: 'string',
          default: "'optional'",
          description: 'Screen-reader text beside the optional mark.',
        },
        {
          name: 'labelColon',
          type: 'string',
          default: "':'",
          description: 'Separator drawn when <code>showColonAfterLabel</code>.',
        },
        {
          name: 'validationSummaryTitle',
          type: 'string',
          default: "'{count} fields need your attention'",
          description: 'Summary heading; <code>{count}</code> is interpolated.',
        },
        {
          name: 'validationSummaryTitleOne',
          type: 'string',
          default: "'1 field needs your attention'",
          description: 'Summary heading when exactly one field is invalid.',
        },
        {
          name: 'validationSummaryLabel',
          type: 'string',
          default: "'Validation summary'",
          description: 'Accessible label of the summary region.',
        },
        {
          name: 'invalidError',
          type: 'string',
          default: "'This value is invalid'",
          description: 'Fallback text for an error with no resolvable message.',
        },
        {
          name: 'submitButton',
          type: 'string',
          default: "'Submit'",
          description: 'Label of the built-in submit button.',
        },
        {
          name: 'resetButton',
          type: 'string',
          default: "'Reset'",
          description: 'Label of the built-in reset button.',
        },
        {
          name: 'submitting',
          type: 'string',
          default: "'Submitting…'",
          description: 'Announced while an async submit handler is in flight.',
        },
        {
          name: 'noItems',
          type: 'string',
          default: "'No fields to display'",
          description: 'Shown when no visible item resolves.',
        },
      ],
    },
  ],
};
