import type { OgeGantt } from '@oge-ui/gantt';
import {
  buildGanttCanvas,
  type OgeGanttImageExportOptions,
} from '@oge-ui/gantt-engine/export-image';

// The canvas drawing is framework-free, so it lives in `@oge-ui/gantt-engine`
// and both render layers call the same one. Re-exported here so this entry
// point's public API is unchanged.
export {
  buildGanttCanvas,
  ganttImageSize,
  type OgeGanttImageExportOptions,
} from '@oge-ui/gantt-engine/export-image';

/**
 * Exports the Gantt (tasks in tree order, collapse ignored) as a `.png`
 * download. No external dependencies — plain canvas drawing.
 *
 * ```ts
 * const { exportGanttToPng } = await import('@oge-ui/gantt/export-image');
 * await exportGanttToPng(this.gantt(), { filename: 'plan.png' });
 * ```
 */
export async function exportGanttToPng<
  T extends object,
  D extends object = Record<string, unknown>,
>(
  gantt: OgeGantt<T, D>,
  options: OgeGanttImageExportOptions = {},
): Promise<void> {
  if (typeof document === 'undefined') return;
  const canvas = buildGanttCanvas(gantt.getExportData(), options);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (blob === null) return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options.filename ?? 'gantt.png';
  anchor.click();
  URL.revokeObjectURL(url);
}
