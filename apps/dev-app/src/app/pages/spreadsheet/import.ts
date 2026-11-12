import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  OgeImportWizard,
  type OgeImportEvent,
} from '@oge-ui/spreadsheet/import';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_IMPORT_SECTIONS,
  ReactImportDemos,
} from '../react-spreadsheet/import';
import {
  DEMO_EMPLOYEE_FIELDS,
  DEMO_PRODUCT_FIELDS,
  DEMO_PRODUCT_PARSE,
  DEMO_PRODUCTS_CSV,
  demoSampleFile,
  type DemoEmployee,
} from './import-demo-data';
import {
  IMPORT_GETTING_STARTED_SNIPPET,
  IMPORT_PARSING_SNIPPET,
} from './import-snippets';

const SECTIONS = ['Getting started', 'Parsing options'] as const;

@Component({
  selector: 'app-import-page',
  imports: [
    DemoCard,
    DocHeader,
    OgeImportWizard,
    PageToc,
    ReactImportDemos,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Import wizard"
      category="Spreadsheet"
      categoryLink="/components/spreadsheet"
      [chips]="['CSV', 'Excel', 'column mapping', 'validation']"
    >
      <p>
        A four-step import for bulk data: choose a CSV, TSV or Excel file, match
        its columns to your fields, review every row with its problems, and hand
        the valid records to your code. Files are read in the browser by the
        spreadsheet engine's own xlsx reader — nothing is uploaded until you
        send the records yourself.
      </p>
      <p>
        Columns match by header text (the field key, its label or an alias,
        ignoring case, accents and punctuation). Each field converts its cells —
        <code>text</code>, <code>number</code>, <code>date</code> or
        <code>boolean</code> — and can add its own <code>validate</code> check.
        It ships as its own entry point of the spreadsheet packages and is
        covered by the same
        <a
          routerLink="/license"
          class="text-indigo-600 underline dark:text-indigo-400"
          >license</a
        >.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-import-demos />
    } @else {
      <app-demo-card
        [chips]="['fields', 'imported', 'xlsx']"
        heading="Getting started"
        description="Give <code>fields</code> and listen to <code>(imported)</code>. Try the sample files: four rows have problems — a bad email, a salary that is not a number, a missing name and an impossible date."
        [code]="gettingStartedSnippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span>Sample files:</span>
          <a
            class="text-indigo-600 underline dark:text-indigo-400"
            href="/demo/import/contacts.csv"
            download
            >contacts.csv</a
          >
          <a
            class="text-indigo-600 underline dark:text-indigo-400"
            href="/demo/import/contacts.xlsx"
            download
            >contacts.xlsx</a
          >
          <button
            type="button"
            class="rounded border border-slate-300 px-2 py-1 dark:border-slate-600"
            (click)="loadSample('contacts.xlsx')"
          >
            Load contacts.xlsx
          </button>
        </div>
        <oge-import-wizard
          #employees
          [fields]="employeeFields"
          (imported)="save($event)"
        />
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {{ saved().length }} records saved
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['parse', 'decimal comma', 'aliases']"
        heading="Parsing options"
        description="<code>[parse]</code> sets how text cells read: <code>1.234,50</code> with a decimal comma, <code>04.03.2026</code> day first, and extra words for yes and no. Aliases match the Turkish headers."
        [code]="parsingSnippet"
        language="ts"
      >
        <button
          type="button"
          class="mb-3 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600"
          (click)="loadProducts()"
        >
          Load products.csv
        </button>
        <oge-import-wizard
          #products
          [fields]="productFields"
          [parse]="productParse"
        />
      </app-demo-card>
    }
  `,
})
export class ImportPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_IMPORT_SECTIONS;
  protected readonly employeeFields = DEMO_EMPLOYEE_FIELDS;
  protected readonly productFields = DEMO_PRODUCT_FIELDS;
  protected readonly productParse = DEMO_PRODUCT_PARSE;
  protected readonly saved = signal<readonly DemoEmployee[]>([]);
  protected readonly gettingStartedSnippet = IMPORT_GETTING_STARTED_SNIPPET;
  protected readonly parsingSnippet = IMPORT_PARSING_SNIPPET;
  private readonly employees =
    viewChild<OgeImportWizard<DemoEmployee>>('employees');
  private readonly products = viewChild<OgeImportWizard>('products');

  protected save(event: OgeImportEvent<DemoEmployee>): void {
    this.saved.set(event.records);
  }

  protected async loadSample(name: string): Promise<void> {
    await this.employees()?.load(await demoSampleFile(name));
  }

  protected loadProducts(): void {
    void this.products()?.load(new Blob([DEMO_PRODUCTS_CSV]), 'products.csv');
  }
}
