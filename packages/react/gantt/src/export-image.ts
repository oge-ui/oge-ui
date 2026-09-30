import {
  buildGanttCanvas,
  type OgeGanttImageExportOptions,
} from '@oge-ui/gantt-engine/export-image';
import type { OgeGanttHandle } from './lib/gantt-types';

// The canvas drawing is the framework-free one both render layers share;
// re-exported so this entry point stands on its own.
export {
  buildGanttCanvas,
  ganttImageSize,
  type OgeGanttImageExportOptions,
} from '@oge-ui/gantt-engine/export-image';

/**
 * Exports the Gantt (tasks in tree order, collapse ignored) as a `.png`
 * download — the React face of `@oge-ui/gantt/export-image`. No external
 * dependencies — plain canvas drawing:
 *
 * ```tsx
 * const { exportGanttToPng } = await import('@oge-ui/react-gantt/export-image');
 * await exportGanttToPng(gantt.current!, { filename: 'plan.png' });
 * ```
 */
export async function exportGanttToPng<
  T extends object,
  D extends object = Record<string, unknown>,
>(
  gantt: OgeGanttHandle<T, D>,
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
