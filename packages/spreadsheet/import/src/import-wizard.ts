import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import type {
  OgeSpreadsheetReactiveCell,
  OgeSpreadsheetReactivity,
} from '@oge-ui/spreadsheet-engine';
import {
  OgeImportWizardCore,
  ogeCheckSpreadsheetLicense,
  resolveOgeImportWizardConfig,
  type OgeImportEvent,
  type OgeImportField,
  type OgeImportParseOptions,
  type OgeImportStep,
  type OgeImportWizardMessages,
} from '@oge-ui/spreadsheet-engine/import';
import { OGE_IMPORT_WIZARD_CONFIG } from './config';

const SIGNAL_ADAPTER: OgeSpreadsheetReactivity = {
  cell<T>(initial: T): OgeSpreadsheetReactiveCell<T> {
    const state = signal(initial);
    const cell = (() => state()) as OgeSpreadsheetReactiveCell<T>;
    cell.set = (value) => state.set(value);
    return cell;
  },
  derived: (compute) => computed(compute),
};

let nextId = 0;

/**
 * A four-step import: choose a CSV, TSV or Excel file, match its columns to
 * your fields, review every row with its problems, and import the valid
 * records. Files are read in the browser; nothing is uploaded.
 *
 * ```html
 * <oge-import-wizard [fields]="fields" (imported)="save($event.records)" />
 * ```
 */
@Component({
  selector: 'oge-import-wizard',
  exportAs: 'ogeImportWizard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './import-wizard.scss',
  template: `
    <div class="oge-import" role="group" [attr.aria-labelledby]="id + '-title'">
      <h2 class="oge-import-file-input" [id]="id + '-title'">
        {{ core.messages().wizardLabel }}
      </h2>
      <ol class="oge-import-steps">
        @for (step of steps; track step.key; let i = $index) {
          <li
            class="oge-import-step"
            [class.oge-import-step-done]="i < core.stepIndex()"
            [attr.aria-current]="step.key === core.step() ? 'step' : null"
          >
            {{ core.messages()[step.label] }}
          </li>
        }
      </ol>

      <div class="oge-import-body">
        @switch (core.step()) {
          @case ('file') {
            <div
              class="oge-import-drop"
              [class.oge-import-drop-active]="dragging()"
              (dragover)="onDragOver($event)"
              (dragleave)="dragging.set(false)"
              (drop)="onDrop($event)"
            >
              <svg
                viewBox="0 0 24 24"
                width="32"
                height="32"
                aria-hidden="true"
              >
                <path
                  d="M12 16V4m0 0-4 4m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <p>
                {{ core.messages().dropHint }}
                <button
                  type="button"
                  class="oge-import-browse"
                  (click)="fileInput.click()"
                >
                  {{ core.messages().browse }}
                </button>
              </p>
              <p class="oge-import-hint">{{ core.messages().fileTypes }}</p>
              <input
                #fileInput
                class="oge-import-file-input"
                type="file"
                tabindex="-1"
                aria-hidden="true"
                [accept]="accept()"
                (change)="onPick($event)"
              />
            </div>
            <div role="status" aria-live="polite">
              @if (core.status() === 'reading') {
                <p class="oge-import-note">{{ core.readingText() }}</p>
              }
            </div>
            @if (core.status() === 'error') {
              <p class="oge-import-alert oge-import-alert-error" role="alert">
                {{ core.errorText() }}
              </p>
            }
          }
          @case ('map') {
            <div class="oge-import-options">
              @if (core.sheetNames().length > 1) {
                <label class="oge-import-option">
                  {{ core.messages().sheet }}
                  <select
                    class="oge-import-select oge-import-sheet"
                    (change)="core.selectSheet(+$any($event.target).value)"
                  >
                    @for (name of core.sheetNames(); track $index) {
                      <option
                        [value]="$index"
                        [selected]="$index === core.sheetIndex()"
                      >
                        {{ name }}
                      </option>
                    }
                  </select>
                </label>
              }
              <label class="oge-import-option">
                <input
                  type="checkbox"
                  class="oge-import-has-header"
                  [checked]="core.hasHeader()"
                  (change)="core.setHasHeader($any($event.target).checked)"
                />
                {{ core.messages().hasHeader }}
              </label>
            </div>
            <div
              class="oge-import-table-wrap"
              role="group"
              tabindex="0"
              [attr.aria-label]="core.messages().stepMap"
            >
              <table class="oge-import-table oge-import-mapping">
                <thead>
                  <tr>
                    <th scope="col">{{ core.messages().columnHeader }}</th>
                    <th scope="col">{{ core.messages().sampleHeader }}</th>
                    <th scope="col">{{ core.messages().fieldHeader }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (
                    header of core.headers();
                    track $index;
                    let col = $index
                  ) {
                    <tr>
                      <th scope="row" [id]="id + '-col-' + col">
                        {{ header }}
                      </th>
                      <td class="oge-import-sample">
                        {{ core.sampleOf(col) }}
                      </td>
                      <td>
                        <select
                          class="oge-import-select oge-import-field"
                          [attr.aria-labelledby]="id + '-col-' + col"
                          (change)="onMap(col, $any($event.target).value)"
                        >
                          <option
                            value=""
                            [selected]="core.mapping()[col] === null"
                          >
                            {{ core.messages().ignoreColumn }}
                          </option>
                          @for (field of core.fields(); track field.field) {
                            <option
                              [value]="field.field"
                              [selected]="core.mapping()[col] === field.field"
                            >
                              {{ field.label }}
                              @if (field.required) {
                                {{ core.messages().requiredMark }}
                              }
                            </option>
                          }
                        </select>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (core.missingText()) {
              <p class="oge-import-alert" role="status">
                {{ core.missingText() }}
              </p>
            }
          }
          @case ('review') {
            <div class="oge-import-summary" role="status">
              <span class="oge-import-count">{{ core.rowsSummary() }}</span>
              <span
                class="oge-import-count"
                [class.oge-import-count-problems]="core.problemCount() > 0"
                >{{ core.problemsSummary() }}</span
              >
            </div>
            <div class="oge-import-options">
              <label class="oge-import-option">
                <input
                  type="checkbox"
                  class="oge-import-problems-only"
                  [checked]="core.problemsOnly()"
                  [disabled]="core.problemCount() === 0"
                  (change)="core.setProblemsOnly($any($event.target).checked)"
                />
                {{ core.messages().showProblemsOnly }}
              </label>
              <label class="oge-import-option">
                <input
                  type="checkbox"
                  class="oge-import-skip"
                  [checked]="core.skipInvalid()"
                  (change)="core.setSkipInvalid($any($event.target).checked)"
                />
                {{ core.messages().skipInvalid }}
              </label>
            </div>
            <div
              class="oge-import-table-wrap"
              role="group"
              tabindex="0"
              [attr.aria-label]="core.messages().stepReview"
            >
              <table class="oge-import-table oge-import-review">
                <thead>
                  <tr>
                    <th scope="col">{{ core.messages().rowHeader }}</th>
                    @for (field of core.mappedFields(); track field.field) {
                      <th scope="col">{{ field.label }}</th>
                    }
                    <th scope="col">{{ core.messages().problemsHeader }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of core.previewRows(); track row.index) {
                    <tr>
                      <td class="oge-import-row-number">
                        {{ row.index + (core.hasHeader() ? 2 : 1) }}
                      </td>
                      @for (field of core.mappedFields(); track field.field) {
                        <td
                          [class.oge-import-cell-error]="
                            core.errorOf(row, field)
                          "
                          [attr.title]="core.errorOf(row, field) || null"
                        >
                          {{ core.cellOf(row, field) }}
                        </td>
                      }
                      <td>
                        @if (row.errors.length) {
                          <ul class="oge-import-problems">
                            @for (error of row.errors; track $index) {
                              <li>{{ error.message }}</li>
                            }
                          </ul>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (core.previewNote()) {
              <p class="oge-import-note">{{ core.previewNote() }}</p>
            }
          }
          @case ('done') {
            <div class="oge-import-done" role="status">
              <svg
                viewBox="0 0 24 24"
                width="40"
                height="40"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                />
                <path
                  d="m7.5 12.5 3 3 6-6.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <p class="oge-import-count">{{ core.doneText() }}</p>
            </div>
          }
        }
      </div>

      @if (core.step() !== 'file') {
        <div class="oge-import-footer">
          @if (core.step() === 'done') {
            <button
              type="button"
              class="oge-import-button oge-import-button-primary oge-import-again"
              (click)="core.reset()"
            >
              {{ core.messages().startOver }}
            </button>
          } @else {
            <button
              type="button"
              class="oge-import-button oge-import-back"
              (click)="core.back()"
            >
              {{ core.messages().back }}
            </button>
            @if (core.step() === 'map') {
              <button
                type="button"
                class="oge-import-button oge-import-button-primary oge-import-next"
                [disabled]="!core.canGoNext()"
                (click)="core.next()"
              >
                {{ core.messages().next }}
              </button>
            } @else {
              <button
                type="button"
                class="oge-import-button oge-import-button-primary oge-import-commit"
                [disabled]="!core.canImport()"
                (click)="core.import()"
              >
                {{ core.importLabel() }}
              </button>
            }
          }
        </div>
      }
    </div>
  `,
})
export class OgeImportWizard<T = Record<string, unknown>> {
  private readonly config = inject(OGE_IMPORT_WIZARD_CONFIG);

  /** The fields of the records to produce: key, label, type, required, checks. */
  readonly fields = input.required<readonly OgeImportField<T>[]>();
  /** File types the picker offers. Default CSV, TSV, text and xlsx. */
  readonly accept = input('.csv,.tsv,.txt,.xlsx,text/csv');
  /** How text cells are parsed (decimal separator, date order, boolean words). */
  readonly parse = input<OgeImportParseOptions>({});
  /** Overrides of the message catalog. */
  readonly messages = input<Partial<OgeImportWizardMessages>>({});

  /** The valid records (and every row with its problems) when the user imports. */
  readonly imported = output<OgeImportEvent<T>>();
  /** After each step change. */
  readonly stepChange = output<OgeImportStep>();

  protected readonly id = `oge-import-${nextId++}`;
  protected readonly dragging = signal(false);
  protected readonly steps = [
    { key: 'file', label: 'stepFile' },
    { key: 'map', label: 'stepMap' },
    { key: 'review', label: 'stepReview' },
    { key: 'done', label: 'stepDone' },
  ] as const;

  /** The wizard state the template binds. */
  protected readonly core = new OgeImportWizardCore<T>({
    reactivity: SIGNAL_ADAPTER,
    messages: this.config.messages,
    fields: [],
    onImport: (event) => this.imported.emit(event),
    onStepChange: (step) => this.stepChange.emit(step),
  });

  constructor() {
    ogeCheckSpreadsheetLicense();
    effect(() => {
      const fields = this.fields();
      untracked(() => this.core.setFields(fields));
    });
    effect(() => {
      const config = resolveOgeImportWizardConfig(
        { messages: this.messages(), parse: this.parse() },
        this.config,
      );
      untracked(() => {
        this.core.setMessages(config.messages);
        this.core.setParseOptions(config.parse);
      });
    });
  }

  /** Reads a file as if the user had dropped it. */
  load(file: Blob, name?: string): Promise<void> {
    return this.core.load(file, name);
  }

  /** Back to the first step. */
  reset(): void {
    this.core.reset();
  }

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void this.core.load(file);
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.core.load(file);
  }

  protected onMap(column: number, value: string): void {
    this.core.setMapping(column, value === '' ? null : value);
  }
}
