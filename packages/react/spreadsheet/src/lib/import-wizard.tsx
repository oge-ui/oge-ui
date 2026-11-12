'use client';
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactElement,
  type Ref,
} from 'react';
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
import { useOgeImportWizardConfig } from './import-wizard-config';
import { createSpreadsheetRxAdapter } from './rx-adapter';

/** What a `ref` on {@link OgeImportWizard} reaches. */
export interface OgeImportWizardHandle {
  /** Reads a file as if the user had dropped it. */
  load(file: Blob, name?: string): Promise<void>;
  /** Back to the first step. */
  reset(): void;
}

/** Props of {@link OgeImportWizard}. */
export interface OgeImportWizardProps<T = Record<string, unknown>> {
  /** The fields of the records to produce: key, label, type, required, checks. */
  fields: readonly OgeImportField<T>[];
  /** File types the picker offers. Default CSV, TSV, text and xlsx. */
  accept?: string;
  /** How text cells are parsed (decimal separator, date order, boolean words). */
  parse?: OgeImportParseOptions;
  /** Overrides of the message catalog. */
  messages?: Partial<OgeImportWizardMessages>;
  /** The valid records (and every row with its problems) when the user imports. */
  onImported?: (event: OgeImportEvent<T>) => void;
  /** After each step change. */
  onStepChange?: (step: OgeImportStep) => void;
  className?: string;
  style?: CSSProperties;
}

const STEPS = [
  { key: 'file', label: 'stepFile' },
  { key: 'map', label: 'stepMap' },
  { key: 'review', label: 'stepReview' },
  { key: 'done', label: 'stepDone' },
] as const;

function ImportWizardRender<T>(
  props: OgeImportWizardProps<T>,
  ref: Ref<OgeImportWizardHandle>,
): ReactElement {
  const {
    fields,
    accept = '.csv,.tsv,.txt,.xlsx,text/csv',
    parse,
    messages,
    className,
    style,
  } = props;
  const config = useOgeImportWizardConfig();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const latest = useRef(props);
  latest.current = props;
  const id = `oge-import-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const coreRef = useRef<OgeImportWizardCore<T> | null>(null);
  if (coreRef.current === null) {
    coreRef.current = new OgeImportWizardCore<T>({
      reactivity: createSpreadsheetRxAdapter(() => rerender()),
      messages: config.messages,
      fields,
      onImport: (event) => latest.current.onImported?.(event),
      onStepChange: (step) => latest.current.onStepChange?.(step),
    });
  }
  const core = coreRef.current;

  useImperativeHandle(
    ref,
    () => ({
      load: (file: Blob, name?: string) => core.load(file, name),
      reset: () => core.reset(),
    }),
    [core],
  );

  useEffect(() => {
    ogeCheckSpreadsheetLicense();
  }, []);

  useEffect(() => {
    core.setFields(fields);
  }, [core, fields]);

  useEffect(() => {
    const resolved = resolveOgeImportWizardConfig({ messages, parse }, config);
    core.setMessages(resolved.messages);
    core.setParseOptions(resolved.parse);
  }, [core, config, messages, parse]);

  const text = core.messages();
  const step = core.step();
  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) void core.load(file);
  };

  return (
    <div
      role="group"
      className={['oge-import', className].filter(Boolean).join(' ')}
      style={style}
      aria-labelledby={`${id}-title`}
    >
      <h2 className="oge-import-file-input" id={`${id}-title`}>
        {text.wizardLabel}
      </h2>
      <ol className="oge-import-steps">
        {STEPS.map((s, i) => (
          <li
            key={s.key}
            className={
              i < core.stepIndex()
                ? 'oge-import-step oge-import-step-done'
                : 'oge-import-step'
            }
            aria-current={s.key === step ? 'step' : undefined}
          >
            {text[s.label]}
          </li>
        ))}
      </ol>

      <div className="oge-import-body">
        {step === 'file' && (
          <>
            <div
              className={
                dragging
                  ? 'oge-import-drop oge-import-drop-active'
                  : 'oge-import-drop'
              }
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
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
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p>
                {text.dropHint}{' '}
                <button
                  type="button"
                  className="oge-import-browse"
                  onClick={() => fileInput.current?.click()}
                >
                  {text.browse}
                </button>
              </p>
              <p className="oge-import-hint">{text.fileTypes}</p>
              <input
                ref={fileInput}
                className="oge-import-file-input"
                type="file"
                tabIndex={-1}
                aria-hidden="true"
                accept={accept}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void core.load(file);
                  event.target.value = '';
                }}
              />
            </div>
            <div role="status" aria-live="polite">
              {core.status() === 'reading' && (
                <p className="oge-import-note">{core.readingText()}</p>
              )}
            </div>
            {core.status() === 'error' && (
              <p
                className="oge-import-alert oge-import-alert-error"
                role="alert"
              >
                {core.errorText()}
              </p>
            )}
          </>
        )}

        {step === 'map' && (
          <>
            <div className="oge-import-options">
              {core.sheetNames().length > 1 && (
                <label className="oge-import-option">
                  {text.sheet}
                  <select
                    className="oge-import-select oge-import-sheet"
                    value={core.sheetIndex()}
                    onChange={(event) =>
                      core.selectSheet(Number(event.target.value))
                    }
                  >
                    {core.sheetNames().map((name, index) => (
                      <option key={index} value={index}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="oge-import-option">
                <input
                  type="checkbox"
                  className="oge-import-has-header"
                  checked={core.hasHeader()}
                  onChange={(event) => core.setHasHeader(event.target.checked)}
                />
                {text.hasHeader}
              </label>
            </div>
            <div
              className="oge-import-table-wrap"
              role="group"
              tabIndex={0}
              aria-label={text.stepMap}
            >
              <table className="oge-import-table oge-import-mapping">
                <thead>
                  <tr>
                    <th scope="col">{text.columnHeader}</th>
                    <th scope="col">{text.sampleHeader}</th>
                    <th scope="col">{text.fieldHeader}</th>
                  </tr>
                </thead>
                <tbody>
                  {core.headers().map((header, col) => (
                    <tr key={col}>
                      <th scope="row" id={`${id}-col-${col}`}>
                        {header}
                      </th>
                      <td className="oge-import-sample">
                        {core.sampleOf(col)}
                      </td>
                      <td>
                        <select
                          className="oge-import-select oge-import-field"
                          aria-labelledby={`${id}-col-${col}`}
                          value={core.mapping()[col] ?? ''}
                          onChange={(event) =>
                            core.setMapping(col, event.target.value || null)
                          }
                        >
                          <option value="">{text.ignoreColumn}</option>
                          {core.fields().map((field) => (
                            <option key={field.field} value={field.field}>
                              {field.required
                                ? `${field.label} ${text.requiredMark}`
                                : field.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {core.missingText() && (
              <p className="oge-import-alert" role="status">
                {core.missingText()}
              </p>
            )}
          </>
        )}

        {step === 'review' && (
          <>
            <div className="oge-import-summary" role="status">
              <span className="oge-import-count">{core.rowsSummary()}</span>
              <span
                className={
                  core.problemCount() > 0
                    ? 'oge-import-count oge-import-count-problems'
                    : 'oge-import-count'
                }
              >
                {core.problemsSummary()}
              </span>
            </div>
            <div className="oge-import-options">
              <label className="oge-import-option">
                <input
                  type="checkbox"
                  className="oge-import-problems-only"
                  checked={core.problemsOnly()}
                  disabled={core.problemCount() === 0}
                  onChange={(event) =>
                    core.setProblemsOnly(event.target.checked)
                  }
                />
                {text.showProblemsOnly}
              </label>
              <label className="oge-import-option">
                <input
                  type="checkbox"
                  className="oge-import-skip"
                  checked={core.skipInvalid()}
                  onChange={(event) =>
                    core.setSkipInvalid(event.target.checked)
                  }
                />
                {text.skipInvalid}
              </label>
            </div>
            <div
              className="oge-import-table-wrap"
              role="group"
              tabIndex={0}
              aria-label={text.stepReview}
            >
              <table className="oge-import-table oge-import-review">
                <thead>
                  <tr>
                    <th scope="col">{text.rowHeader}</th>
                    {core.mappedFields().map((field) => (
                      <th key={field.field} scope="col">
                        {field.label}
                      </th>
                    ))}
                    <th scope="col">{text.problemsHeader}</th>
                  </tr>
                </thead>
                <tbody>
                  {core.previewRows().map((row) => (
                    <tr key={row.index}>
                      <td className="oge-import-row-number">
                        {row.index + (core.hasHeader() ? 2 : 1)}
                      </td>
                      {core.mappedFields().map((field) => {
                        const error = core.errorOf(row, field);
                        return (
                          <td
                            key={field.field}
                            className={
                              error ? 'oge-import-cell-error' : undefined
                            }
                            title={error || undefined}
                          >
                            {core.cellOf(row, field)}
                          </td>
                        );
                      })}
                      <td>
                        {row.errors.length > 0 && (
                          <ul className="oge-import-problems">
                            {row.errors.map((error, n) => (
                              <li key={n}>{error.message}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {core.previewNote() && (
              <p className="oge-import-note">{core.previewNote()}</p>
            )}
          </>
        )}

        {step === 'done' && (
          <div className="oge-import-done" role="status">
            <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="m7.5 12.5 3 3 6-6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="oge-import-count">{core.doneText()}</p>
          </div>
        )}
      </div>

      {step !== 'file' && (
        <div className="oge-import-footer">
          {step === 'done' ? (
            <button
              type="button"
              className="oge-import-button oge-import-button-primary oge-import-again"
              onClick={() => core.reset()}
            >
              {text.startOver}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="oge-import-button oge-import-back"
                onClick={() => core.back()}
              >
                {text.back}
              </button>
              {step === 'map' ? (
                <button
                  type="button"
                  className="oge-import-button oge-import-button-primary oge-import-next"
                  disabled={!core.canGoNext()}
                  onClick={() => core.next()}
                >
                  {text.next}
                </button>
              ) : (
                <button
                  type="button"
                  className="oge-import-button oge-import-button-primary oge-import-commit"
                  disabled={!core.canImport()}
                  onClick={() => core.import()}
                >
                  {core.importLabel()}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A four-step import: choose a CSV, TSV or Excel file, match its columns to
 * your fields, review every row with its problems, and import the valid
 * records. Files are read in the browser; nothing is uploaded.
 */
export const OgeImportWizard = forwardRef(ImportWizardRender) as <
  T = Record<string, unknown>,
>(
  props: OgeImportWizardProps<T> & { ref?: Ref<OgeImportWizardHandle> },
) => ReactElement;
