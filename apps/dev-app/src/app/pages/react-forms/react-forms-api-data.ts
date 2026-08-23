import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/forms/src/lib/** — the React face of
 * `../forms/forms-api-data.ts`, block for block and member for member, so the
 * parity gate (`docs-tools:parity`) can diff the two tables.
 *
 * The item model, the rule evaluator, the defaults and every message live in
 * `@oge-ui/behavior` (ADR 0001); what differs here is only the idiom —
 * controlled/uncontrolled prop pairs instead of two-way models, callbacks
 * instead of outputs, an imperative handle instead of public methods, render
 * props instead of `TemplateRef` slots, and a `layout` array instead of
 * projected children.
 */

const FORM_PROPERTY_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Binding',
    entries: [
      {
        name: 'formData',
        type: 'T | undefined',
        default: 'undefined',
        description:
          'The bound model — controlled when provided. The form compiles each item&#39;s <code>validationRules</code> with the shared evaluator from <code>&#64;oge-ui/behavior</code>, the very code the Angular schema runs.',
      },
      {
        name: 'defaultFormData',
        type: 'T | undefined',
        default: 'undefined',
        description:
          'Uncontrolled starting model. Give one of <code>formData</code> / <code>defaultFormData</code>.',
      },
      {
        name: 'onFormDataChange',
        type: '(data: T) =&gt; void',
        description:
          'The controlled half of <code>formData</code> — fires on every model change.',
      },
      {
        name: 'items',
        type: 'readonly OgeFormItemDefinition[] | undefined',
        default: 'undefined',
        description:
          'Data-driven items, rendered after the <code>layout</code> tree.',
      },
      {
        name: 'groups',
        type: 'readonly OgeFormGroupData[] | undefined',
        default: 'undefined',
        description:
          'Data-driven groups, matched to items by <code>key</code> (or <code>caption</code>) through an item&#39;s <code>group</code>.',
      },
      {
        name: 'layout',
        type: 'readonly OgeFormNodeDefinition[] | undefined',
        default: 'undefined',
        description:
          'The nested layout — items, groups and tabbed/accordion/wizard sections. React&#39;s stand-in for Angular&#39;s projected <code>&lt;oge-form-item&gt;</code> / <code>&lt;oge-form-group&gt;</code> / <code>&lt;oge-form-tabs&gt;</code> children.',
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
          '<code>&#39;top&#39;</code> keeps each editor&#39;s own label chrome; the side values hand the label to the form, which draws a real <code>&lt;label htmlFor&gt;</code> in its own column.',
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
      {
        name: 'className / style / id',
        type: 'string | CSSProperties | undefined',
        default: 'undefined',
        description:
          'Host attributes. React&#39;s idiom for what an Angular host element takes natively.',
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
          'Makes every editor read-only, overridable per group and per item.',
      },
      {
        name: 'disabled',
        type: 'boolean',
        default: 'false',
        description:
          'Wraps the fields in a <code>&lt;fieldset disabled&gt;</code>, overridable per group and per item.',
      },
      {
        name: 'showValidationSummary',
        type: 'boolean',
        default: 'false',
        description:
          'Renders an <code>&lt;OgeValidationSummary&gt;</code> above the fields once a submit has failed.',
      },
      {
        name: 'scrollToFirstInvalid',
        type: 'boolean',
        default: 'true',
        description:
          'Scrolls the first invalid field into view when a submit fails. Focus moves there either way.',
      },
      {
        name: 'messages',
        type: 'Partial&lt;OgeFormsMessages&gt; | undefined',
        default: 'undefined',
        description:
          'Per-instance string overrides, merged over <code>&lt;OgeFormsConfigProvider&gt;</code>.',
      },
      {
        name: 'renderFormElement',
        type: 'boolean',
        default: 'true',
        description:
          'Whether the fields are wrapped in a real <code>&lt;form&gt;</code>. Set <code>false</code> inside another form — nested forms are invalid HTML. With <code>false</code> there is no native submit, so drive it with the handle&#39;s <code>submit()</code>.',
      },
    ],
  },
];

const FORM_METHOD_GROUPS: readonly ApiGroup[] = [
  {
    title: 'OgeFormHandle — via ref',
    entries: [
      {
        name: 'submit(event?: Event)',
        type: 'Promise&lt;boolean&gt;',
        description:
          'Marks every field touched, validates, fires <code>onSubmitting</code> and then <code>onSubmitted</code>. Resolves <code>false</code> when the form was invalid or the submit was canceled, and focuses the first invalid field.',
      },
      {
        name: 'validate()',
        type: 'boolean',
        description:
          'Re-reads validity and fires <code>onValidated</code>. Does not move focus.',
      },
      {
        name: 'reset(values?: Partial&lt;T&gt;)',
        type: 'void',
        description:
          'Resets every field to <code>values</code>, or to the data the form started with, and hides the validation summary.',
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
          'Reveals the section holding the first invalid field, focuses it — and, with <code>scrollToFirstInvalid</code>, scrolls to it. Returns <code>false</code> when the form is valid.',
      },
      {
        name: 'itemOption(field: string)',
        type: 'OgeResolvedFormItem | undefined',
        description:
          'The resolved configuration of one item, as the form actually renders it.',
      },
      {
        name: 'updateData(field: string, value: unknown)',
        type: 'void',
        description:
          'Writes one field. The overload <code>updateData(partial)</code> merges an object into the bound data.',
      },
      {
        name: 'errors',
        type: 'readonly OgeFormErrorEntry[]',
        description:
          'One entry per invalid field, in layout order, regardless of whether the field is showing its error yet.',
      },
      {
        name: 'valid',
        type: 'boolean',
        description: 'Whether every bound field currently validates.',
      },
      {
        name: 'dirty',
        type: 'boolean',
        description:
          'Whether any bound field has been edited since the last reset.',
      },
      {
        name: 'data',
        type: 'T',
        description: 'The bound model, as the form currently holds it.',
      },
    ],
  },
];

const FORM_EVENT_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'onSubmitting',
        type: '(event: OgeFormSubmittingEvent&lt;T&gt;) =&gt; void',
        description:
          'Cancelable pre-submit — <code>{ data, valid, cancel, event }</code>. Set <code>cancel</code> to stop the submit.',
      },
      {
        name: 'onSubmitted',
        type: '(event: OgeFormSubmittedEvent&lt;T&gt;) =&gt; void',
        description:
          'Fires after a submit passed validation and was not canceled.',
      },
      {
        name: 'onFieldChanged',
        type: '(event: OgeFormFieldChangedEvent) =&gt; void',
        description:
          'One field&#39;s value changed — <code>{ field, value, previousValue }</code>.',
      },
      {
        name: 'onValidated',
        type: '(event: OgeFormValidatedEvent) =&gt; void',
        description:
          'Fires after <code>validate()</code> or a submit attempt — <code>{ valid, errors }</code>.',
      },
      {
        name: 'onEditorEnterKey',
        type: '(event: OgeFormKeyEvent) =&gt; void',
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
        name: 'OgeFormDataType',
        type: "'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'dateRange' | 'array' | 'object'",
        description:
          'Value shape of an item. Inferred from the model value when not set.',
      },
      {
        name: 'OgeFormEditorType',
        type: "'textBox' | 'textArea' | 'numberBox' | 'selectBox' | 'tagBox' | 'autocomplete' | 'treeSelect' | 'dateBox' | 'dateRangeBox' | 'calendar' | 'checkBox' | 'switch' | 'radioGroup'",
        description:
          'Which <code>&#64;oge-ui/react-inputs</code> editor renders an item. The same string union both layers share from <code>&#64;oge-ui/behavior</code>.',
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
          'A declarative rule, evaluated by <code>evaluateOgeValidationRules()</code> in <code>&#64;oge-ui/behavior</code> — the same function Angular&#39;s schema calls, so a rule can never be worded differently in the two layers.',
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
      {
        name: 'OgeFormNodeDefinition',
        type: 'OgeFormItemDefinition | OgeFormGroupDefinition | OgeFormSectionDefinition',
        description: 'One node of the <code>layout</code> tree.',
      },
    ],
  },
];

export const OGE_REACT_FORM_API: ApiSections = {
  properties: FORM_PROPERTY_GROUPS,
  methods: FORM_METHOD_GROUPS,
  events: FORM_EVENT_GROUPS,
  types: FORM_TYPE_GROUPS,
};

export const OGE_REACT_FORM_SECTIONS_API: ApiSections = {
  properties: [
    {
      title: "Tabs — { kind: 'tabs' }",
      entries: [
        {
          name: 'activeIndex / defaultActiveIndex / onActiveIndexChange',
          type: 'number | ((index: number) =&gt; void)',
          default: '0',
          description:
            'Open tab — the controlled pair, or its uncontrolled half. A failed submit selects the tab holding the first invalid field.',
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
      title: "Wizard — { kind: 'steps' }",
      entries: [
        {
          name: 'activeIndex',
          type: 'number',
          default: '0',
          description:
            'Active step — controlled with <code>onActiveIndexChange</code>, as on the tabs section. A failed submit moves to the step holding the first invalid field.',
        },
        {
          name: 'linear',
          type: 'boolean',
          default: 'false',
          description:
            'Blocks moving past a step that still has invalid fields. Completion comes from the form&#39;s own per-step error rollup.',
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
            'Touches only the leaving step&#39;s fields on each advance, so the steps ahead stay quiet instead of turning red.',
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
          description: 'See the tabs section — same defaults, same reasoning.',
        },
        {
          name: 'key / visible / visibleIndex / colSpan / cssClass',
          type: 'string | boolean | number | undefined',
          description: 'The same section-level knobs a group has.',
        },
      ],
    },
    {
      title: "Accordion — { kind: 'accordion' }",
      entries: [
        {
          name: 'expandedKeys / defaultExpandedKeys / onExpandedKeysChange',
          type: 'readonly string[] | ((keys: readonly string[]) =&gt; void)',
          default: '[]',
          description:
            'Expanded panels — the controlled pair, or its uncontrolled half. A failed submit adds the panel holding the first invalid field.',
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
            'Drives the accordion&#39;s own invalid indicator — danger rail, dot and screen-reader label — from the panel&#39;s field errors.',
        },
        {
          name: 'deferRendering / keepAlive',
          type: 'boolean',
          description: 'As on the tabs section.',
        },
      ],
    },
  ],
};

export const OGE_REACT_FORM_TEMPLATE_API: ApiSections = {
  properties: [
    {
      title: 'Render props',
      entries: [
        {
          name: 'renderItem',
          type: '(context: OgeFormItemContext) =&gt; ReactNode',
          description:
            'Replaces a field entirely: label, editor and subscript. Legal on <code>&lt;OgeForm&gt;</code> (every item) or on one item definition, where it wins.',
        },
        {
          name: 'renderEditor',
          type: '(context: OgeFormItemContext) =&gt; ReactNode',
          description:
            'Replaces only the control, keeping the form&#39;s label, required mark and error chrome. The context carries <code>editorId</code>, so a custom control keeps the <code>&lt;label htmlFor&gt;</code> association.',
        },
        {
          name: 'renderLabel',
          type: '(context: OgeFormLabelContext) =&gt; ReactNode',
          description:
            'Replaces the label content. The surrounding <code>&lt;label htmlFor&gt;</code> stays, so the control association and the required mark survive.',
        },
        {
          name: 'renderGroupCaption',
          type: '(context: OgeFormGroupCaptionContext) =&gt; ReactNode',
          description:
            'Replaces the content of a group&#39;s <code>&lt;legend&gt;</code>. A group definition&#39;s own <code>renderCaption</code> wins over it.',
        },
        {
          name: 'actions',
          type: 'ReactNode',
          description:
            'Rendered under the fields — the action bar (submit, reset, …) Angular projects into <code>[ogeFormActions]</code>.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeFormItemContext',
          type: '{ item: OgeResolvedFormItem; value; setValue; error; editorId }',
          description:
            'Context of the item and editor slots. <code>setValue</code> writes straight into the bound model, and <code>editorId</code> is the id the form&#39;s label points at.',
        },
        {
          name: 'OgeFormLabelContext',
          type: '{ label: string; item; required; editorId }',
          description: 'Context of the label slot.',
        },
        {
          name: 'OgeFormGroupCaptionContext',
          type: '{ caption: string; colCount }',
          description: 'Context of the group caption slot.',
        },
      ],
    },
  ],
};

export const OGE_REACT_FORM_ITEM_API: ApiSections = {
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
            'A curated, typed subset of editor props (<code>items</code>, <code>displayExpr</code>, <code>min</code>, <code>max</code>, <code>rows</code>, …). Supplying <code>items</code> selects a select box or tag box.',
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
            'Declarative rules, run by the shared evaluator in <code>&#64;oge-ui/behavior</code>. <code>async</code> rules are scheduled by the form and reported when they settle.',
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

export const OGE_REACT_FORM_GROUP_API: ApiSections = {
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
          name: 'kind',
          type: "'group' | undefined",
          default: "'group'",
          description:
            'Discriminates a group from a section inside the <code>layout</code> array. Optional — a node with <code>caption</code> or <code>children</code> and no section kind is a group.',
        },
        {
          name: 'children',
          type: 'readonly OgeFormNodeDefinition[] | undefined',
          default: 'undefined',
          description:
            'Items, nested groups and sections inside this group — React&#39;s stand-in for the projected children.',
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
            'Explicit ordering among this group&#39;s siblings. Ordering is scoped per level.',
        },
        {
          name: 'cssClass',
          type: 'string | undefined',
          default: 'undefined',
          description: 'Extra class on the fieldset.',
        },
        {
          name: 'renderCaption',
          type: '(context: OgeFormGroupCaptionContext) =&gt; ReactNode',
          default: 'undefined',
          description:
            'Per-group caption slot; wins over the form-level <code>renderGroupCaption</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_VALIDATION_SUMMARY_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'errors',
          type: 'readonly OgeFormErrorEntry[]',
          default: '[]',
          description:
            'One entry per invalid field, in layout order. Pass <code>handle.errors</code>.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeFormsMessages&gt; | undefined',
          default: 'undefined',
          description: 'Per-instance string overrides.',
        },
        {
          name: 'className / style',
          type: 'string | CSSProperties | undefined',
          default: 'undefined',
          description:
            'Host attributes. React&#39;s idiom for what an Angular host element takes natively.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onErrorClick',
          type: '(entry: OgeFormErrorEntry) =&gt; void',
          description:
            'A summary row was activated. Wire it to <code>handle.focus(entry.field)</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_FORMS_CONFIG_API: ApiSections = {
  properties: [
    {
      title: '&lt;OgeFormsConfigProvider&gt;',
      entries: [
        {
          name: 'labelLocation',
          type: 'OgeFormLabelLocation | undefined',
          default: "'top'",
          description:
            'Application-wide default for the prop of the same name.',
        },
        {
          name: 'minColWidth',
          type: 'number | undefined',
          default: '220',
          description:
            'Application-wide default for the prop of the same name.',
        },
        {
          name: 'showRequiredMark',
          type: 'boolean | undefined',
          default: 'true',
          description:
            'Application-wide default for the prop of the same name.',
        },
        {
          name: 'showOptionalMark',
          type: 'boolean | undefined',
          default: 'false',
          description:
            'Application-wide default for the prop of the same name.',
        },
        {
          name: 'showColonAfterLabel',
          type: 'boolean | undefined',
          default: 'false',
          description:
            'Application-wide default for the prop of the same name.',
        },
        {
          name: 'useOgeFormsConfig()',
          type: 'OgeFormsConfig',
          description:
            'Reads the resolved configuration — defaults merged with the nearest provider.',
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
