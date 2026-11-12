/**
 * The slice of pdf.js (`pdfjs-dist` 4 and later) the PDF viewer drives,
 * described structurally: the engine never imports pdf.js at build time, so
 * applications that do not show PDFs never load it, and tests can hand in a
 * fake.
 */

/** A viewport pdf.js computes for a page at a scale. */
export interface OgePdfJsViewport {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly rotation: number;
}

/** One run of text on a page, in PDF user space (origin bottom-left). */
export interface OgePdfJsTextItem {
  readonly str: string;
  /** `[a, b, c, d, e, f]`: `e` / `f` place the baseline start. */
  readonly transform: readonly number[];
  readonly width: number;
  readonly height: number;
}

export interface OgePdfJsTextContent {
  readonly items: readonly (OgePdfJsTextItem | { readonly type: string })[];
}

/** An in-flight page render. */
export interface OgePdfJsRenderTask {
  readonly promise: Promise<void>;
  cancel(): void;
}

export interface OgePdfJsPage {
  getViewport(params: { scale: number; rotation?: number }): OgePdfJsViewport;
  render(params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: OgePdfJsViewport;
    transform?: readonly number[];
  }): OgePdfJsRenderTask;
  getTextContent(): Promise<OgePdfJsTextContent>;
  cleanup?(): void;
}

export interface OgePdfJsDocument {
  readonly numPages: number;
  getPage(pageNumber: number): Promise<OgePdfJsPage>;
  destroy(): Promise<void>;
}

export interface OgePdfJsLoadingTask {
  readonly promise: Promise<OgePdfJsDocument>;
  destroy(): Promise<void>;
}

/** What `import('pdfjs-dist')` returns, as far as the viewer is concerned. */
export interface OgePdfJs {
  getDocument(params: {
    data: Uint8Array;
    password?: string;
    /** Never evaluate fonts as code (hardening; pdf.js 4+ honours it). */
    isEvalSupported?: boolean;
  }): OgePdfJsLoadingTask;
  readonly GlobalWorkerOptions?: { workerSrc: string };
  /** pdf.js's text layer, used for selection and screen readers when present. */
  readonly TextLayer?: new (params: {
    textContentSource: OgePdfJsTextContent;
    container: HTMLElement;
    viewport: OgePdfJsViewport;
  }) => { render(): Promise<unknown>; cancel(): void };
}
