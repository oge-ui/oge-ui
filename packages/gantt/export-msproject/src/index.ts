import type { OgeGantt } from '@oge-ui/gantt';
import {
  buildGanttMsProjectXml,
  downloadMsProjectXml,
  type OgeGanttMsProjectExportOptions,
} from '@oge-ui/gantt-engine/export-msproject';

// The MSPDI reader/writer is framework-free, so it lives in
// `@oge-ui/gantt-engine` and both render layers call the same one.
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
 * Exports the Gantt as MS Project XML (MSPDI): tasks with WBS, outline
 * levels, manual mode, constraints, deadlines and baselines; links with lag;
 * resources, assignments with units and the work calendar. Downloads the
 * file and returns the XML (`download: false` only returns it).
 *
 * ```ts
 * const { exportGanttToMsProject } = await import('@oge-ui/gantt/export-msproject');
 * exportGanttToMsProject(this.gantt(), { filename: 'plan.xml', title: 'Plan' });
 * ```
 *
 * The reverse is `importMsProjectXml(text)`: plain `tasks`, `dependencies`,
 * `resources` and `workCalendar` in the Gantt's default field names — bind
 * them to the inputs.
 */
export function exportGanttToMsProject<
  T extends object,
  D extends object = Record<string, unknown>,
>(gantt: OgeGantt<T, D>, options: OgeGanttMsProjectExportOptions = {}): string {
  const xml = buildGanttMsProjectXml(gantt.getExportData(), options);
  if (options.download !== false) {
    downloadMsProjectXml(xml, options.filename ?? 'project.xml');
  }
  return xml;
}
