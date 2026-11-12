/** Code samples rendered on the dates and time zones guide. */

export const INSTANT = `<!-- an instant: the moment an order was placed, a meeting starts -->
<!-- shown on the office's clocks wherever the browser is -->
<oge-date-box type="datetime" timeZone="Europe/Istanbul" [(value)]="meetingAt" />

<oge-grid [data]="orders" keyField="id" timeZone="Europe/Istanbul">
  <oge-column field="placedAt" dataType="datetime" />
</oge-grid>`;

export const DATE_ONLY_UTC = `<!-- a date-only value the server keeps as UTC midnight (2026-03-05T00:00:00Z) -->
<!-- read and write it on UTC's clocks, so no browser zone shifts the day -->
<oge-date-box timeZone="UTC" [(value)]="birthday" />

<oge-grid [data]="people" keyField="id">
  <oge-column field="birthday" dataType="date" timeZone="UTC" />
</oge-grid>`;

export const DATE_ONLY_STRING = `import { serializeLikeOriginal, toLocalDate } from '@oge-ui/core';

// a date-only value kept as 'yyyy-MM-dd': parse it as a LOCAL calendar day —
// never with new Date('2026-03-05'), which reads it as UTC midnight
const due = toLocalDate(row.due); // Thu Mar 05 2026 00:00 local

// write it back in the same shape after an edit
row.due = serializeLikeOriginal(picked, row.due); // '2026-03-20'`;

export const SERVER = `// the grid sends instants: a day filter on a column with timeZone="Europe/Istanbul"
{ type: 'and', operands: [
  { type: 'binary', field: 'placedAt', op: 'ge', value: '2026-03-04T21:00:00.000Z' },
  { type: 'binary', field: 'placedAt', op: 'lt', value: '2026-03-05T21:00:00.000Z' },
] }
// compare them as instants (timestamptz / DateTimeOffset) — no zone math on the server`;
