# @oge-ui/forms

Form layout for the [OGE](https://ogeui.com) Angular UI suite. Signal-based,
standalone, zoneless-ready, MIT.

The package ships **`OgeForm`** with its renderless children
**`OgeFormItem`** / **`OgeFormGroup`**, and the standalone
**`OgeValidationSummary`**. It lays out the `@oge-ui/inputs` editors — it does
not re-implement them, and it does not re-implement validation either.

```sh
npm install @oge-ui/forms
```

## Three ways to bind, one component

The mode is derived from what you bind, never configured.

```html
<!-- 1. Angular Signal Forms — the schema owns validity, required, disabled, readonly -->
<oge-form [fieldTree]="profile" [colCount]="2">
  <oge-form-item field="name" label="Name" />
  <oge-form-item field="email" label="E-mail" />
</oge-form>

<!-- 2. Reactive forms -->
<oge-form [formGroup]="group" [items]="fields" />

<!-- 3. A plain signal model -->
<oge-form [(formData)]="employee" [colCount]="2">
  <oge-form-item field="firstName" label="First name" [isRequired]="true" />
  <oge-form-item field="notes" editorType="textArea" [colSpan]="2" />
</oge-form>
```

## Features

- **Declarative or data-driven, or both** — projected `<oge-form-item>`
  children render first, then any `[items]` entries; `visible` and
  `visibleIndex` apply across both sources.
- **One validation engine** — Angular's Signal Forms. `validationRules`
  (`required` / `email` / `numeric` / `stringLength` / `pattern` / `range` /
  `custom` / `async`) is declarative sugar compiled into a schema, so
  `[(formData)]` and `[fieldTree]` run the same code path. A `custom` rule sees
  the whole model, which is how cross-field checks work.
- **Editor selection** — `dataType` picks the editor and is itself inferred
  from the model value; an `editorOptions.items` list beats it, and an explicit
  `editorType` beats everything.
- **Responsive by container query** — `colCount: 'auto'` fits by
  `minColWidth`, and `colCountByScreen` keys off the **form's own** inline
  size. A form inside a dialog, a drawer or a grid cell lays out correctly with
  no resize listener.
- **Real groups** — `<oge-form-group caption>` renders a `<fieldset>` with a
  `<legend>`, nests, and carries its own column count.
- **Accessible validation** — `<oge-validation-summary>` is a `role="alert"`
  list whose rows are real buttons that focus their field; a failed submit
  marks everything touched, focuses the first invalid field and scrolls it into
  view.
- **Template slots** — `[ogeFormItemTemplate]` replaces a whole field,
  `[ogeFormEditorTemplate]` replaces only the control while keeping the label,
  required mark and error chrome, `[ogeFormLabelTemplate]` and
  `[ogeFormGroupCaptionTemplate]` replace the label and legend content. Each is
  legal at form level or on a single item, where it wins.
- **Sections** — wrap the groups in `<oge-form-tabs>` or
  `<oge-form-accordion>` and each becomes a tab or a panel, rendered by
  `@oge-ui/tabs` / `@oge-ui/layout`. A tab holding invalid fields gets a count
  badge, a panel gets the accordion's invalid indicator, and a failed submit
  opens the right one before focusing the field.
- **The schema can be the layout** — attach `OGE_FORM_LABEL`, `OGE_FORM_GROUP`,
  `OGE_FORM_COL_SPAN`, `OGE_FORM_EDITOR` and friends with Angular's
  `metadata()`, and `<oge-form [fieldTree]>` generates the whole form with no
  items array at all.
- **Chrome for the bare controls** — check box, switch and radio group render
  no field chrome of their own, so the form supplies their label, hint and
  error.
- **Theming** — logical properties throughout for RTL, and the shared
  `--oge-*` design tokens.

See the [API reference](https://ogeui.com/components/forms/api) for the full
surface.

## For AI coding assistants

The complete machine-readable API reference ships inside the package at
`node_modules/@oge-ui/forms/llms.txt` — conventions, every documented member and
copy-pasteable demos in one file. Online: <https://ogeui.com/llms.txt> (index) and
<https://ogeui.com/llms-full.txt> (the whole suite).

## License

MIT
