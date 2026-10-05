import {
  buildGanttMsProjectXml,
  downloadMsProjectXml,
  type OgeGanttMsProjectExportOptions,
} from '@oge-ui/gantt-engine/export-msproject';
import type { OgeGanttHandle } from './lib/gantt-types';

// The MSPDI reader/writer is the framework-free one both render layers share;
// re-exported so this entry point stands on its own.
export {
  buildGanttMsProjectXml,
  buildMsProjectXml,
  importMsProjectXml,
  parseMsProjectXml,
  type MsProjectDependencyItem,
  type MsProjectExportOptions,
  type MsProjectImportResult,
  type MsProjectResourceItem,
  type MsProjectTaskItem,
  type OgeGanttMsProjectExportOptions,
} from '@oge-ui/gantt-engine/export-msproject';

/**
 * Exports the Gantt as MS Project XML (MSPDI) — the React face of
 * `@oge-ui/gantt/export-msproject`. Takes the Gantt's imperative handle;
 * downloads the file and returns the XML (`download: false` only returns it).
 *
 * ```tsx
 * const { exportGanttToMsProject } = await import('@oge-ui/react-gantt/export-msproject');
 * exportGanttToMsProject(gantt.current!, { filename: 'plan.xml' });
 * ```
 *
 * `importMsProjectXml(text)` returns plain `tasks`, `dependencies`,
 * `resources` and `workCalendar` in the default field names — set them as
 * props.
 */
export function exportGanttToMsProject<
  T extends object,
  D extends object = Record<string, unknown>,
>(
  gantt: OgeGanttHandle<T, D>,
  options: OgeGanttMsProjectExportOptions = {},
): string {
  const xml = buildGanttMsProjectXml(gantt.getExportData(), options);
  if (options.download !== false) {
    downloadMsProjectXml(xml, options.filename ?? 'project.xml');
  }
  return xml;
}
