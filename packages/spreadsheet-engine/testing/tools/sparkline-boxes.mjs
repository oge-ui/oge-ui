// Turns sparkline-capture.ps1's screenshots into testing/corpus/sparklines.boxes.json:
// per sparkline cell, its inside (the pixels between its gridlines) and every
// run of one of the corpus's pure part colours there, as a connected
// component — [colour, x0, x1, y0, y1, pixels], cell-relative and inclusive.
// Anti-aliased pixels (a line's edges, a marker's rim) belong to no colour.
//
//   node sparkline-boxes.mjs <pictures folder> <corpus folder>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

const [pictures, corpus] = process.argv.slice(2);

/** The part colours of sparkline-sources.ts. */
const NAMES = new Map([
  [0x0000ff, 'series'],
  [0xff0000, 'negative'],
  [0x00ff00, 'axis'],
  [0xff00ff, 'markers'],
  [0x00ffff, 'first'],
  [0xffff00, 'last'],
  [0x800000, 'high'],
  [0x008000, 'low'],
]);
const GRIDLINE = 0xe0e0e0;
/** PowerShell writes its JSON with a byte-order mark. */
const BOM = new RegExp(`^${String.fromCharCode(0xfeff)}`);

/** An 8-bit RGB or RGBA, non-interlaced PNG (what System.Drawing writes). */
function decodePng(bytes) {
  let at = 8;
  let width = 0,
    height = 0,
    type = 0;
  const data = [];
  while (at < bytes.length) {
    const length = bytes.readUInt32BE(at);
    const kind = bytes.toString('latin1', at + 4, at + 8);
    const body = bytes.subarray(at + 8, at + 8 + length);
    if (kind === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8 || body[12] !== 0)
        throw new Error('only 8-bit, non-interlaced PNGs');
      type = body[9];
    } else if (kind === 'IDAT') data.push(body);
    else if (kind === 'IEND') break;
    at += 12 + length;
  }
  const channels = type === 6 ? 4 : type === 2 ? 3 : 0;
  if (!channels) throw new Error(`unsupported PNG colour type ${type}`);
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const rgb = new Uint32Array(width * height);
  const prev = new Uint8Array(stride);
  const line = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = src[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a),
          pb = Math.abs(p - b),
          pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = v & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const i = x * channels;
      rgb[y * width + x] = (line[i] << 16) | (line[i + 1] << 8) | line[i + 2];
    }
    prev.set(line);
  }
  return { width, height, rgb };
}

/**
 * Where a right-to-left sheet's cells are: COM's screen pixels for it run left
 * to right, the screen's columns the other way, so a box [x0, x1) shows at
 * [m − x1, m − x0). m is the shift that puts the most of the boxes' edges on
 * the gridlines across the first box's row.
 */
function mirrorOf(cells, at, width) {
  const y = cells[0].y0 + 3;
  const lines = new Set();
  for (let x = 0; x < width; x++) if (at(x, y) === GRIDLINE) lines.add(x);
  let best = 0;
  let most = -1;
  for (let m = 0; m < 2 * width; m++) {
    let hits = 0;
    for (const c of cells) {
      if (c.y0 !== cells[0].y0) continue;
      if (lines.has(m - c.x1 - 1)) hits++;
      if (lines.has(m - c.x0 - 1)) hits++;
    }
    if (hits > most) {
      most = hits;
      best = m;
    }
  }
  return best;
}

const screens = JSON.parse(
  readFileSync(join(pictures, 'sparklines.screens.json'), 'utf8').replace(
    BOM,
    '',
  ),
);
const out = { sheets: [] };
for (const sheet of screens.sheets) {
  const image = decodePng(readFileSync(join(pictures, sheet.png)));
  const at = (x, y) => image.rgb[y * image.width + x];
  // COM's screen positions can be a pixel off: find the gridline near each edge
  const near = (expected, fixed, horizontal) => {
    for (const d of [0, -1, 1, -2, 2]) {
      const p = expected + d;
      if ((horizontal ? at(p, fixed) : at(fixed, p)) === GRIDLINE) return p;
    }
    return null;
  };
  const cells = [];
  const mirror = sheet.rtl ? mirrorOf(sheet.cells, at, image.width) : null;
  for (const box of sheet.cells) {
    const x0 = mirror === null ? box.x0 : mirror - box.x1;
    const x1 = mirror === null ? box.x1 : mirror - box.x0;
    const left = near(x0 - 1, box.y0 + 3, true);
    const right = near(x1 - 1, box.y0 + 3, true);
    const top = near(box.y0 - 1, x0 + 3, false);
    const bottom = near(box.y1 - 1, x0 + 3, false);
    if (left === null || right === null || top === null || bottom === null) {
      cells.push({ r: box.r, c: box.c, error: 'no gridlines' });
      continue;
    }
    const ix = left + 1,
      iy = top + 1,
      w = right - left - 1,
      h = bottom - top - 1;
    const seen = new Uint8Array(w * h);
    const found = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const name = NAMES.get(at(ix + x, iy + y));
        if (!name || seen[y * w + x]) continue;
        const colour = at(ix + x, iy + y);
        const part = [name, x, x, y, y, 0];
        const stack = [x, y];
        seen[y * w + x] = 1;
        while (stack.length) {
          const py = stack.pop(),
            px = stack.pop();
          part[5]++;
          if (px < part[1]) part[1] = px;
          if (px > part[2]) part[2] = px;
          if (py < part[3]) part[3] = py;
          if (py > part[4]) part[4] = py;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const qx = px + dx,
              qy = py + dy;
            if (qx < 0 || qy < 0 || qx >= w || qy >= h || seen[qy * w + qx])
              continue;
            if (at(ix + qx, iy + qy) !== colour) continue;
            seen[qy * w + qx] = 1;
            stack.push(qx, qy);
          }
        }
        found.push(part);
      }
    found.sort(
      (a, b) => a[1] - b[1] || a[3] - b[3] || a[0].localeCompare(b[0]),
    );
    cells.push({ r: box.r, c: box.c, w, h, parts: found });
  }
  out.sheets.push({
    name: sheet.name,
    zoom: sheet.zoom,
    ...(sheet.rtl ? { rtl: true } : {}),
    cells,
  });
  console.log(
    `${sheet.name}: ${cells.length} cells, ${cells.filter((c) => c.error).length} without gridlines`,
  );
}
// one cell per line keeps the diff of a re-capture readable
const json =
  '{"sheets":[\n' +
  out.sheets
    .map(
      (s) =>
        `{"name":${JSON.stringify(s.name)},"zoom":${s.zoom},${s.rtl ? '"rtl":true,' : ''}"cells":[\n` +
        s.cells.map((c) => JSON.stringify(c)).join(',\n') +
        '\n]}',
    )
    .join(',\n') +
  '\n]}\n';
writeFileSync(join(corpus, 'sparklines.boxes.json'), json);
console.log('sparklines.boxes.json written');
