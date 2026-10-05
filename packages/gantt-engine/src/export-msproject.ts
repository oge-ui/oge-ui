// `@oge-ui/gantt-engine/export-msproject` — MS Project XML (MSPDI) import /
// export, shared by both Gantt render layers. A separate entry point like the
// other exporters, although it has no peer dependency: a plan that never
// exchanges files with MS Project does not ship the reader/writer.
import {
  buildMsProjectXml,
  parseMsProjectXml,
  type MsProjectExportOptions,
} from './lib/engine/msproject';
import type { OgeGanttExportData } from './lib/gantt-types';

export {
  buildMsProjectXml,
  parseMsProjectXml,
  parseMsXml,
  type MsProjectDependencyItem,
  type MsProjectExportInput,
  type MsProjectExportOptions,
  type MsProjectImportResult,
  type MsProjectResource,
  type MsProjectResourceItem,
  type MsProjectTaskItem,
  type MsXmlElement,
} from './lib/engine/msproject';

/** Options of the Gantt MS Project export. */
export interface OgeGanttMsProjectExportOptions extends MsProjectExportOptions {
  /** Download file name. Default `'project.xml'`. */
  readonly filename?: string;
  /** `false` returns the XML without downloading. Default `true`. */
  readonly download?: boolean;
}

/**
 * MS Project XML of a Gantt's export snapshot (`getExportData()`): tasks in
 * tree order with WBS, outline levels, manual mode, constraints, deadlines
 * and baselines; links with lag; resources with capacity; assignments with
 * units; the work calendar.
 */
export function buildGanttMsProjectXml<T>(
  data: OgeGanttExportData<T>,
  options: MsProjectExportOptions = {},
): string {
  return buildMsProjectXml(
    {
      tasks: data.tasks,
      dependencies: data.dependencies ?? [],
      resources: data.resources ?? [],
      workCalendar: data.workCalendar ?? null,
    },
    options,
  );
}

/**
 * Saves `xml` as a file in the browser (no-op on the server). Shared by the
 * layers' `exportGanttToMsProject`.
 */
export function downloadMsProjectXml(xml: string, filename: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Re-exported for symmetry with the layers' `importMsProjectXml`. */
export const importMsProjectXml = parseMsProjectXml;
