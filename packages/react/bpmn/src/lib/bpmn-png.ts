import { bpmnSvgSize, type OgeBpmnPngExportOptions } from '@oge-ui/bpmn-engine';

/**
 * Rasterizes the engine's static SVG export to a PNG blob on a canvas — no
 * library, nothing leaves the page. Resolves null where there is no canvas
 * (server rendering, jsdom). The engine stays DOM-free; this lives in the
 * render package (its Angular twin is `packages/bpmn/src/lib/editor/bpmn-png.ts`).
 */
export async function rasterizeBpmnSvg(
  svg: string,
  options: OgeBpmnPngExportOptions = {},
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const ratio = options.pixelRatio ?? 2;
  const { width, height } = bpmnSvgSize(svg);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null; // jsdom without the canvas package
  }
  if (ctx === null) return null;
  ctx.fillStyle = options.background ?? '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        ctx?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve();
      };
      image.onerror = () => reject(new Error('BPMN SVG rasterization failed'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
}
