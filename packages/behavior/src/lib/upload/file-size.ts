/**
 * Byte formatting for the uploader's file rows.
 *
 * Framework-free by contract — see the `src/lib/engine` lint block.
 */

/** Options for {@link formatFileSize}. */
export interface OgeFormatFileSizeOptions {
  /**
   * BCP 47 tag used for the number's decimal separator. Defaults to the
   * host's locale, so `1.5 KB` in `en-US` and `1,5 KB` in `tr-TR`.
   */
  readonly locale?: string;
  /**
   * `true` switches to the 1024-based IEC units (`KiB`, `MiB`, …). The default
   * is the 1000-based SI units every reference library prints.
   */
  readonly binary?: boolean;
  /** Significant decimals for values below 10 in their unit. Defaults to 1. */
  readonly precision?: number;
}

const SI_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;
const IEC_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'] as const;

/**
 * Formats a byte count the way a file row reads it: `0 B`, `812 B`, `1.5 MB`.
 *
 * Bytes are printed whole (a `1.0 B` row is noise), and anything larger keeps
 * `precision` decimals until it reaches double digits in its unit, where the
 * extra decimal stops carrying information — `9.4 MB`, then `12 MB`.
 *
 * The public mirror of PrimeNG's `formatSize` and Syncfusion's `bytesToSize`;
 * exported from the package so a custom file template can print sizes the same
 * way the built-in row does.
 */
export function formatFileSize(
  bytes: number,
  options: OgeFormatFileSizeOptions = {},
): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return `0 ${SI_UNITS[0]}`;
  }

  const units = options.binary ? IEC_UNITS : SI_UNITS;
  const base = options.binary ? 1024 : 1000;
  const precision = options.precision ?? 1;

  let value = bytes;
  let unit = 0;
  while (value >= base && unit < units.length - 1) {
    value /= base;
    unit += 1;
  }

  // Whole bytes, and no decimal once the mantissa reaches double digits.
  const decimals = unit === 0 || value >= 10 ? 0 : precision;
  const text = new Intl.NumberFormat(options.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return `${text} ${units[unit]}`;
}
