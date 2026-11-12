/**
 * Linear barcodes: Code 128 (sets B and C, switching to C for runs of
 * digits) and EAN-13 (with its check digit). Both encode to a run of
 * module-wide bars; quiet zones are the caller's.
 */

/** A linear symbol: `modules` is one entry per module, `true` for a bar. */
export interface OgeLinearBarcode {
  readonly modules: readonly boolean[];
  /** The text printed under the bars (EAN-13 with its check digit). */
  readonly text: string;
}

// Bar/space widths of the 107 Code 128 symbols (values 0–105 and Stop).
// prettier-ignore
const CODE128 = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
  '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
  '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
  '114131','311141','411131','211412','211214','211232','2331112',
];
const START_B = 104;
const START_C = 105;
const CODE_B = 100;
const CODE_C = 99;
const STOP = 106;

/** Exposed for the spec: every symbol is 11 modules wide (Stop 13). */
export const OGE_CODE128_PATTERNS: readonly string[] = CODE128;

function widths(pattern: string, out: boolean[]): void {
  let bar = true;
  for (const digit of pattern) {
    for (let i = 0; i < Number(digit); i++) out.push(bar);
    bar = !bar;
  }
}

/** Length of the run of digits starting at `from`. */
function digitRun(text: string, from: number): number {
  let end = from;
  while (end < text.length && text[end] >= '0' && text[end] <= '9') end++;
  return end - from;
}

/**
 * Encodes printable ASCII (32–126) as Code 128 — set C (two digits a
 * symbol) for runs of four or more digits, set B otherwise. Throws
 * `RangeError` for any other character or an empty text.
 */
export function ogeEncodeCode128(text: string): OgeLinearBarcode {
  if (!text) throw new RangeError('Code 128 needs at least one character.');
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (char.length !== 1 || code < 32 || code > 126)
      throw new RangeError(`Code 128 cannot encode "${char}".`);
  }
  const values: number[] = [];
  let set: 'B' | 'C';
  let i = 0;
  const startRun = digitRun(text, 0);
  if (startRun >= 4 || (startRun === text.length && startRun % 2 === 0)) {
    set = 'C';
    values.push(START_C);
  } else {
    set = 'B';
    values.push(START_B);
  }
  while (i < text.length) {
    const run = digitRun(text, i);
    if (set === 'B' && run >= 4) {
      // an odd run keeps its first digit in set B
      if (run % 2 === 1) {
        values.push(text.charCodeAt(i) - 32);
        i++;
      }
      values.push(CODE_C);
      set = 'C';
      continue;
    }
    if (set === 'C') {
      if (run >= 2) {
        values.push(Number(text.slice(i, i + 2)));
        i += 2;
        continue;
      }
      values.push(CODE_B);
      set = 'B';
      continue;
    }
    values.push(text.charCodeAt(i) - 32);
    i++;
  }
  const check =
    values.reduce((sum, value, k) => sum + value * (k === 0 ? 1 : k), 0) % 103;
  values.push(check, STOP);
  const modules: boolean[] = [];
  for (const value of values) widths(CODE128[value], modules);
  return { modules, text };
}

// EAN-13 digit patterns: L (odd parity), G (even parity) and R codes.
// prettier-ignore
const EAN_L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
// prettier-ignore
const EAN_G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
// prettier-ignore
const EAN_R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
// The parity of the left six digits, set by the first digit.
// prettier-ignore
const EAN_PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];

/** The EAN-13 check digit of twelve digits. */
export function ogeEan13CheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * (i % 2 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}

/**
 * Encodes twelve digits (the check digit is added) or thirteen (the check
 * digit is verified) as EAN-13. Throws `RangeError` otherwise.
 */
export function ogeEncodeEan13(value: string): OgeLinearBarcode {
  const digits = value.replace(/\s/g, '');
  if (!/^\d{12,13}$/.test(digits))
    throw new RangeError('EAN-13 needs 12 or 13 digits.');
  const check = ogeEan13CheckDigit(digits);
  if (digits.length === 13 && Number(digits[12]) !== check)
    throw new RangeError(`EAN-13 check digit should be ${check}.`);
  const full = digits.slice(0, 12) + check;
  const parity = EAN_PARITY[Number(full[0])];
  let bits = '101';
  for (let i = 1; i <= 6; i++)
    bits += (parity[i - 1] === 'L' ? EAN_L : EAN_G)[Number(full[i])];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += EAN_R[Number(full[i])];
  bits += '101';
  return { modules: [...bits].map((b) => b === '1'), text: full };
}
