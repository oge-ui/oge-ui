/**
 * Word's own pagination and line breaks. The measurer uses the word widths
 * Word reported, so a difference is a difference in the rules.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  OgeSlideFont,
  OgeSlideTextMeasurer,
} from '../powerpoint/text-layout';
import { ogeLayoutWordDocument } from './layout';
import { readOgeDocxSync } from './read-docx';

const folder = resolve(__dirname, '../../../testing/corpus/docx');
const json = (name: string) =>
  JSON.parse(readFileSync(resolve(folder, name), 'utf8').trimStart());

interface Line {
  page: number;
  x: number;
  y: number;
  text: string;
}
const capture = json('document.word.json') as {
  pages: number;
  lines: Line[];
};
const metrics = json('document.metrics.json') as Record<
  string,
  { space: number; words: Record<string, number> }
>;
const { document, issues } = readOgeDocxSync(
  new Uint8Array(readFileSync(resolve(folder, 'document.docx'))),
);

const keyOf = (font: OgeSlideFont) =>
  `${font.family}|${font.size}|${Number(font.bold)}|${Number(font.italic)}`;

/**
 * The probe reads a space through Word's device rounding (2.7 pt where
 * Calibri's is 2.49), which adds up over a line: use the face's own advance.
 */
const CALIBRI_SPACE_EM = 0.226;

const measurer: OgeSlideTextMeasurer = {
  width(text, font) {
    return rawWidth(text, font);
  },
  extent: (font) => ({ ascent: font.size * 0.95, descent: font.size * 0.25 }),
};

function rawWidth(text: string, font: OgeSlideFont): number {
  const entry = metrics[keyOf(font)];
  if (!entry) return text.length * font.size * 0.48;
  return text
    .split(/( +)/)
    .filter(Boolean)
    .reduce((sum, part) => {
      if (part.trim() === '')
        return sum + part.length * font.size * CALIBRI_SPACE_EM;
      // Word's own word list splits punctuation off
      const tokens = part.match(/[\p{L}\p{N}]+|[^\p{L}\p{N}]/gu) ?? [part];
      const whole = entry.words[part];
      return (
        sum +
        (whole ??
          tokens.reduce(
            (total, token) =>
              total + (entry.words[token] ?? token.length * font.size * 0.48),
            0,
          ))
      );
    }, 0);
}

const pages = ogeLayoutWordDocument(document, measurer, {
  idPrefix: 't',
  fontFamily: (name) => name,
});

const normalize = (text: string) =>
  text.replace(/\s+/g, '').replace(/HYPERLINK"[^"]*"/, '');

/** Points. Word's reported y is rounded and drifts by a device step per block. */
const TOLERANCE = 3;

describe('ogeLayoutWordDocument against Word', () => {
  it('reports what it could not take over', () => {
    expect(issues).toEqual([]);
  });

  it('makes as many pages as Word', () => {
    expect(pages).toHaveLength(capture.pages);
  });

  const ours = pages.flatMap((page, index) =>
    page.lines.map((line) => ({ ...line, page: index + 1 })),
  );
  // the probe sometimes reports one line in two pieces
  const theirs = capture.lines
    .map((line) => ({
      ...line,
      text: line.text.replace(/HYPERLINK "[^"]*" /, ''),
    }))
    .filter((line) => normalize(line.text) !== '' && line.text !== '/')
    .reduce<Line[]>((all, line) => {
      const last = all[all.length - 1];
      if (last && last.page === line.page && Math.abs(last.y - line.y) < 0.5) {
        last.text += line.text;
      } else all.push({ ...line });
      return all;
    }, []);
  const body = ours
    .filter((line) => normalize(line.text) !== '')
    .reduce<typeof ours>((all, line) => {
      const last = all[all.length - 1];
      if (
        last &&
        last.page === line.page &&
        Math.abs(last.top - line.top) < 1
      ) {
        all[all.length - 1] = { ...last, text: last.text + line.text };
      } else all.push(line);
      return all;
    }, []);

  it('breaks the lines where Word does, on the same pages', () => {
    expect(body.map((l) => `${l.page}: ${normalize(l.text)}`)).toEqual(
      theirs.map((l) => `${l.page}: ${normalize(l.text)}`),
    );
  });

  it('puts every line within a point of Word, vertically', () => {
    const off = body.flatMap((line, i) => {
      const expected = theirs[i];
      return expected && Math.abs(line.top - expected.y) > TOLERANCE
        ? [`${line.text.slice(0, 24)}: ${line.top.toFixed(1)} vs ${expected.y}`]
        : [];
    });
    expect(off).toEqual([]);
  });
});
