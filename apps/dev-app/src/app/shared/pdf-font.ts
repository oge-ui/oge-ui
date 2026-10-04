import { getOgePdfDefaultFont, setOgePdfDefaultFont } from '@oge-ui/behavior';

let loading: Promise<void> | null = null;

/**
 * Registers Noto Sans (SIL OFL, `public/fonts/`) as the font of every PDF the
 * docs demos export, so Turkish `ğ ş ı İ` and other non-WinAnsi text renders.
 * Fetched once, on the first export — never on page load.
 */
export function loadDocsPdfFont(): Promise<void> {
  if (getOgePdfDefaultFont()) return Promise.resolve();
  loading ??= Promise.all(
    ['/fonts/NotoSans-Regular.ttf', '/fonts/NotoSans-Bold.ttf'].map((url) =>
      fetch(url).then((response) => {
        if (!response.ok) throw new Error(`${url}: ${response.status}`);
        return response.arrayBuffer();
      }),
    ),
  )
    .then(([normal, bold]) =>
      setOgePdfDefaultFont({ family: 'NotoSans', normal, bold }),
    )
    .catch((error: unknown) => {
      // fall back to the built-in font rather than failing the export
      loading = null;
      console.warn('[docs] PDF font not loaded', error);
    });
  return loading;
}
