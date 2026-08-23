# @oge-ui/react-forms

React form layout from the OGE UI suite, running the **same** framework-free
item model, the same declarative rule evaluator, the same config defaults, the
same message catalog and the same stylesheet as the Angular `@oge-ui/forms`
package.

The OGE suite is one component engine with a native render layer per
framework: nothing here wraps Angular, and a rule that fails in the Angular
form fails with the same message in the React one — literally the same
function decides.

## What ships

- **`<OgeForm>`** — responsive column layout (`colCount`, `colCountByScreen`
  and `'auto'` columns keyed to the **form's own** width, not the window's),
  labels above or beside the fields, nestable `<fieldset>` groups, and the
  sixteen `@oge-ui/react-inputs` editors picked automatically from each item's
  data type.
- **Sections** — tabbed, accordion and wizard layouts over the same items,
  with per-panel invalid-field counts, and a wizard that touches only the step
  the user is leaving so the steps ahead stay quiet.
- **Declarative validation** — `isRequired` plus `required` / `email` /
  `numeric` / `stringLength` / `pattern` / `range` / `custom` / `async` rules,
  evaluated by `@oge-ui/behavior` and worded from the inputs package's message
  table.
- **`<OgeValidationSummary>`** — `role="alert"` error list whose rows focus
  their field; `<OgeForm showValidationSummary>` renders one after a failed
  submit.
- **Render props** — `renderItem`, `renderEditor`, `renderLabel` and
  `renderGroupCaption`, per item or form-wide: the React counterparts of the
  Angular package's four `ng-template` slots.
- **`<OgeFormsConfigProvider>`** — the React counterpart of
  `provideOgeFormsConfig()`; defaults and strings are single-sourced in
  `@oge-ui/behavior`.

## Installation

```sh
npm install @oge-ui/react-forms
```

Requires React 18 or 19. Import the stylesheets once at your app entry:

```ts
import '@oge-ui/react-forms/styles.css';
import '@oge-ui/react-inputs/styles.css'; // the editors the form renders
import '@oge-ui/react-overlay/styles.css'; // dropdown editors and pickers
```

## Quick start

```tsx
'use client';

import { useRef, useState } from 'react';
import { OgeForm, type OgeFormHandle } from '@oge-ui/react-forms';

interface Employee {
  firstName: string;
  email: string;
  hireDate: Date | null;
}

export function EmployeeForm() {
  const form = useRef<OgeFormHandle<Employee>>(null);
  const [data, setData] = useState<Employee>({
    firstName: '',
    email: '',
    hireDate: null,
  });

  return <OgeForm ref={form} formData={data} onFormDataChange={setData} colCount={2} showValidationSummary items={[{ field: 'firstName', isRequired: true }, { field: 'email', validationRules: [{ type: 'email' }] }, { field: 'hireDate' }]} onSubmitted={({ data }) => save(data)} actions={<button type="submit">Save</button>} />;
}
```

## Docs

Live demos and the full API reference: <https://ogeui.com/components/forms>
(pick **React** in the header switch). Machine-readable docs ship inside the
package at `node_modules/@oge-ui/react-forms/llms.txt`.

## License

MIT
