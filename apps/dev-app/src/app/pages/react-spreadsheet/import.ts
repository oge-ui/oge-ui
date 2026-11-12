import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import {
  OgeImportWizard,
  type OgeImportWizardHandle,
} from '@oge-ui/react-spreadsheet/import';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  DEMO_EMPLOYEE_FIELDS,
  DEMO_PRODUCT_FIELDS,
  DEMO_PRODUCT_PARSE,
  DEMO_PRODUCTS_CSV,
  demoSampleFile,
  type DemoEmployee,
} from '../spreadsheet/import-demo-data';
import { IMPORT_DEMOS } from './import-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_IMPORT_SECTIONS = [
  'Getting started',
  'Parsing options',
] as const;

const BUTTON =
  'rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600';
const LINK = 'text-indigo-600 underline dark:text-indigo-400';

function EmployeesDemo(): ReactNode {
  const [saved, setSaved] = useState<readonly DemoEmployee[]>([]);
  const wizard = useRef<OgeImportWizardHandle>(null);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap items-center gap-2 text-sm' },
      createElement('span', null, 'Sample files:'),
      createElement(
        'a',
        { className: LINK, href: '/demo/import/contacts.csv', download: true },
        'contacts.csv',
      ),
      createElement(
        'a',
        { className: LINK, href: '/demo/import/contacts.xlsx', download: true },
        'contacts.xlsx',
      ),
      createElement(
        'button',
        {
          type: 'button',
          className: BUTTON,
          onClick: async () =>
            wizard.current?.load(await demoSampleFile('contacts.xlsx')),
        },
        'Load contacts.xlsx',
      ),
    ),
    createElement(OgeImportWizard<DemoEmployee>, {
      ref: wizard,
      fields: DEMO_EMPLOYEE_FIELDS,
      onImported: (event) => setSaved(event.records),
    }),
    createElement(
      'p',
      { className: 'mt-2 text-sm text-slate-600 dark:text-slate-300' },
      `${saved.length} records saved`,
    ),
  );
}

function ProductsDemo(): ReactNode {
  const wizard = useRef<OgeImportWizardHandle>(null);
  return createElement(
    'div',
    null,
    createElement(
      'button',
      {
        type: 'button',
        className: `mb-3 ${BUTTON}`,
        onClick: () =>
          void wizard.current?.load(
            new Blob([DEMO_PRODUCTS_CSV]),
            'products.csv',
          ),
      },
      'Load products.csv',
    ),
    createElement(OgeImportWizard<Record<string, unknown>>, {
      ref: wizard,
      fields: DEMO_PRODUCT_FIELDS,
      parse: DEMO_PRODUCT_PARSE,
    }),
  );
}

@Component({
  selector: 'app-react-import-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React wizard carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/react/spreadsheet/src/styles.scss'],
  template: `
    <app-demo-card
      [chips]="['fields', 'onImported', 'xlsx']"
      heading="Getting started"
      description="Give <code>fields</code> and listen to <code>onImported</code>. Try the sample files: four rows have problems — a bad email, a salary that is not a number, a missing name and an impossible date."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="employees" />
    </app-demo-card>

    <app-demo-card
      [chips]="['parse', 'decimal comma', 'aliases']"
      heading="Parsing options"
      description="<code>parse</code> sets how text cells read: <code>1.234,50</code> with a decimal comma, <code>04.03.2026</code> day first, and extra words for yes and no. Aliases match the Turkish headers."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="products" />
    </app-demo-card>
  `,
})
export class ReactImportDemos {
  protected readonly demos = IMPORT_DEMOS;
  protected readonly employees = () => createElement(EmployeesDemo);
  protected readonly products = () => createElement(ProductsDemo);
}
