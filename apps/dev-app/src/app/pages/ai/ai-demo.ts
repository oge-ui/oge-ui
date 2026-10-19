/**
 * Docs-only support for the AI pages: a deterministic order data set and a
 * **demo model** — a small rule-based transport that answers the grid
 * assistant without any network call, so every demo works offline and in the
 * e2e suite. It reads the column catalog from the system prompt exactly as a
 * real model would, which also makes it a living example of the request
 * format. Not part of any package.
 */
import {
  OgeAiError,
  type OgeAiRequest,
  type OgeAiResponse,
  type OgeAiTransport,
} from '@oge-ui/behavior';
import { demoSmartPasteReply, unfencePastedText } from './ai-demo-smart-paste';

export interface AiOrder {
  id: number;
  customer: string;
  city: string;
  status: number;
  amount: number;
  ordered: Date;
}

/** Lookup items of the `status` column. */
export const AI_DEMO_STATUSES = [
  { id: 1, label: 'Open' },
  { id: 2, label: 'Shipped' },
  { id: 3, label: 'Delivered' },
  { id: 4, label: 'Cancelled' },
] as const;

const CUSTOMERS = [
  'Acme Corp',
  'Bosphorus Foods',
  'Cappadocia Tours',
  'Delta Logistics',
  'Ege Textiles',
  'Fjord Media',
  'Galata Software',
  'Harbor Supplies',
  'Ionic Labs',
  'Kaya Mimarlık',
];
const CITIES = ['İstanbul', 'İzmir', 'Ankara', 'Berlin', 'London', 'Paris'];

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 80 orders over the last ~120 days, the same on every load. */
export function makeAiOrders(today = new Date()): AiOrder[] {
  const rand = mulberry32(7);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)];
  return Array.from({ length: 80 }, (_, i) => ({
    id: 1001 + i,
    customer: pick(CUSTOMERS),
    city: pick(CITIES),
    status: 1 + Math.floor(rand() * 4),
    amount: Math.round((40 + rand() * 1960) * 100) / 100,
    ordered: new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - Math.floor(rand() * 120),
    ),
  }));
}

/** Values the demo model "knows" for plain string columns. */
export const AI_DEMO_KNOWN_VALUES: Readonly<Record<string, readonly string[]>> =
  { city: CITIES, customer: CUSTOMERS };

interface DemoColumn {
  field: string;
  caption: string;
  type: string;
  values: { value: unknown; text: string }[];
}

/** Reads `- field ("Caption", type, …) values: 1 = "Open", …` lines back. */
function parseColumns(system: string): DemoColumn[] {
  const out: DemoColumn[] = [];
  for (const line of system.split('\n')) {
    const match = /^- (\S+) \("([^"]*)", (\w+)/.exec(line);
    if (!match) continue;
    const values: DemoColumn['values'] = [];
    const list = /values: (.*)$/.exec(line)?.[1] ?? '';
    for (const item of list.matchAll(
      /(-?\d+(?:\.\d+)?|"[^"]*") = "([^"]*)"/g,
    )) {
      values.push({ value: JSON.parse(item[1]), text: item[2] });
    }
    out.push({ field: match[1], caption: match[2], type: match[3], values });
  }
  return out;
}

function parseState(system: string): Record<string, unknown> {
  const match = /^Current state: (.*)$/m.exec(system);
  try {
    return match ? (JSON.parse(match[1]) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const lower = (s: string) => s.toLocaleLowerCase('tr-TR');

/** Words that point at a column of a type even when it is not named. */
const TYPE_WORDS: Record<string, RegExp> = {
  number:
    /amount|total|revenue|value|price|biggest|largest|highest|lowest|smallest|tutar|toplam|ciro|fiyat|büyük|yüksek|düşük|küçük/,
  date: /date|newest|oldest|latest|recent|earliest|tarih|yeni|eski|son/,
};

function mentioned(text: string, columns: DemoColumn[]): DemoColumn[] {
  return columns.filter(
    (c) => text.includes(lower(c.field)) || text.includes(lower(c.caption)),
  );
}

function columnFor(
  text: string,
  columns: DemoColumn[],
  type?: string,
): DemoColumn | undefined {
  const named = mentioned(text, columns).filter(
    (c) => !type || c.type === type,
  );
  if (named.length) return named[0];
  for (const c of columns) {
    if ((!type || c.type === type) && TYPE_WORDS[c.type]?.test(text)) return c;
  }
  return undefined;
}

function monthRange(today: Date, offset: number): [string, string] {
  const from = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const to =
    offset === 0
      ? today
      : new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
  return [iso(from), iso(to)];
}

/** One prompt → one reply object, the way the system prompt asks for it. */
export function demoReply(
  prompt: string,
  system: string,
  today: Date,
): Record<string, unknown> {
  const text = lower(prompt);
  const turkish = /[çğıöşü]|göre|sırala|grupla|göster|filtre/.test(text);
  const say = (en: string, tr: string) => (turkish ? tr : en);
  const columns = parseColumns(system);
  const state = parseState(system);
  const reply: Record<string, unknown> = { status: 'apply' };
  const parts: string[] = [];

  if (
    /\b(reset|clear|start over|show everything)\b|temizle|sıfırla|hepsini göster/.test(
      text,
    )
  ) {
    return {
      status: 'apply',
      summary: say(
        'Cleared sorting, grouping, filters and search.',
        'Sıralama, gruplama, filtreler ve arama temizlendi.',
      ),
      sort: [],
      group: [],
      filter: null,
      search: '',
      hiddenColumns: [],
    };
  }

  // grouping: "group by city", "şehre göre grupla"
  if (/group|grupla/.test(text)) {
    const after =
      /group(?:ed)?(?: it| them)? by ([\p{L} ]+)/u.exec(text)?.[1] ?? text;
    const column = columnFor(after, columns);
    if (column) {
      const interval =
        column.type === 'date'
          ? /week|hafta/.test(text)
            ? 'week'
            : 'month'
          : undefined;
      reply['group'] = [
        interval ? { field: column.field, interval } : { field: column.field },
      ];
      parts.push(
        say(
          `grouped by ${column.caption}`,
          `${column.caption} alanına göre gruplandı`,
        ),
      );
    }
  }

  // sorting: explicit "sort by …", or superlatives
  const desc =
    /desc|newest|latest|recent|highest|largest|biggest|top|most|en yüksek|en yeni|en büyük|azalan|büyükten/.test(
      text,
    );
  if (
    /sort|order by|sırala|newest|latest|oldest|earliest|highest|lowest|largest|smallest|biggest|top \d|en (yüksek|düşük|yeni|eski|büyük|küçük)/.test(
      text,
    )
  ) {
    const after = /(?:sort|order)(?:ed)? by ([\p{L} ]+)/u.exec(text)?.[1];
    const type = /newest|latest|oldest|earliest|recent|en (yeni|eski)/.test(
      text,
    )
      ? 'date'
      : /highest|lowest|largest|smallest|biggest|top \d|en (yüksek|düşük|büyük|küçük)/.test(
            text,
          )
        ? 'number'
        : undefined;
    const column =
      (after && columnFor(after, columns)) ||
      columnFor(text, columns, type) ||
      columnFor(text, columns);
    if (column && column.type !== 'boolean') {
      reply['sort'] = [{ field: column.field, dir: desc ? 'desc' : 'asc' }];
      parts.push(
        say(
          `sorted by ${column.caption}, ${desc ? 'highest/newest first' : 'lowest/oldest first'}`,
          `${column.caption} alanına göre ${desc ? 'büyükten küçüğe' : 'küçükten büyüğe'} sıralandı`,
        ),
      );
    }
  }

  // filters
  const conditions: Record<string, unknown>[] = [];
  const number = columns.find((c) => c.type === 'number' && !c.values.length);
  const over =
    /(?:over|above|more than|greater than|at least|>)\s*(\d[\d.,]*)/.exec(
      text,
    )?.[1] ??
    /(\d[\d.,]*)\s*(?:tl|€|\$|eur|usd)?\s*(?:üzeri|üstü|üzerinde|fazla)/.exec(
      text,
    )?.[1];
  const under =
    /(?:under|below|less than|at most|<)\s*(\d[\d.,]*)/.exec(text)?.[1] ??
    /(\d[\d.,]*)\s*(?:tl|€|\$|eur|usd)?\s*(?:altı|altında|az)/.exec(text)?.[1];
  if (number && over) {
    conditions.push({
      type: 'binary',
      field: number.field,
      op: 'gt',
      value: Number(over.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')),
    });
    parts.push(
      say(`${number.caption} over ${over}`, `${number.caption} ${over} üzeri`),
    );
  }
  if (number && under) {
    conditions.push({
      type: 'binary',
      field: number.field,
      op: 'lt',
      value: Number(under.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')),
    });
    parts.push(
      say(
        `${number.caption} under ${under}`,
        `${number.caption} ${under} altı`,
      ),
    );
  }
  const date = columns.find((c) => c.type === 'date' || c.type === 'datetime');
  if (date) {
    const range: [string, string] | null = /this month|bu ay/.test(text)
      ? monthRange(today, 0)
      : /last month|previous month|geçen ay|önceki ay/.test(text)
        ? monthRange(today, -1)
        : /last (\d+) days|son (\d+) gün/.test(text)
          ? (() => {
              const m = /last (\d+) days|son (\d+) gün/.exec(text);
              const days = Number(m?.[1] ?? m?.[2] ?? 30);
              const from = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate() - days,
              );
              return [iso(from), iso(today)] as [string, string];
            })()
          : /\btoday\b|bugün/.test(text)
            ? [iso(today), iso(today)]
            : null;
    if (range) {
      conditions.push({
        type: 'binary',
        field: date.field,
        op: 'between',
        value: range,
      });
      parts.push(
        say(
          `${date.caption} ${range[0]} – ${range[1]}`,
          `${date.caption} ${range[0]} – ${range[1]}`,
        ),
      );
    }
  }
  for (const column of columns) {
    const hits = column.values.filter((v) => text.includes(lower(v.text)));
    const known = (AI_DEMO_KNOWN_VALUES[column.field] ?? []).filter((v) =>
      text.includes(lower(v)),
    );
    const values = [...hits.map((h) => h.value), ...known];
    if (!values.length) continue;
    conditions.push(
      values.length === 1
        ? { type: 'binary', field: column.field, op: 'eq', value: values[0] }
        : { type: 'binary', field: column.field, op: 'in', value: values },
    );
    const texts = [...hits.map((h) => h.text), ...known].join(', ');
    parts.push(
      say(`${column.caption}: ${texts}`, `${column.caption}: ${texts}`),
    );
  }
  if (conditions.length) {
    const current = state['filter'];
    const additive =
      /^(and|also|plus|ayrıca|ve|bir de)\b/.test(text) && current;
    const all = additive ? [current, ...conditions] : conditions;
    reply['filter'] =
      all.length === 1 ? all[0] : { type: 'and', operands: all };
  }

  // search: anything in quotes
  const quoted = /["“”'‘’]([^"“”'‘’]+)["“”'‘’]/.exec(prompt)?.[1];
  if (quoted && !/sort|group|sırala|grupla/.test(text)) {
    reply['search'] = quoted;
    parts.push(say(`searching for “${quoted}”`, `“${quoted}” aranıyor`));
  }

  // columns: "hide city", "show all columns"
  const hide =
    /(?:hide|gizle)\s+([\p{L} ]+)/u.exec(text)?.[1] ??
    /([\p{L}]+) (?:sütununu|kolonunu) gizle/u.exec(text)?.[1];
  if (hide) {
    const column = columnFor(hide, columns);
    if (column) {
      const hidden = new Set(
        (state['hiddenColumns'] as string[] | undefined) ?? [],
      );
      hidden.add(column.field);
      reply['hiddenColumns'] = [...hidden];
      parts.push(say(`${column.caption} hidden`, `${column.caption} gizlendi`));
    }
  } else if (/show all columns|tüm sütunları göster/.test(text)) {
    reply['hiddenColumns'] = [];
    parts.push(say('all columns shown', 'tüm sütunlar gösterildi'));
  }

  if (!parts.length) {
    return {
      status: 'clarify',
      summary: say(
        'I am the offline demo model and only know simple requests — try “sort by amount, highest first”, “orders from İzmir this month” or “group by status”. Connect a real model below for anything else.',
        'Ben çevrimdışı demo modelim ve yalnızca basit istekleri anlıyorum — “tutara göre büyükten küçüğe sırala”, “bu ayki İzmir siparişleri” ya da “duruma göre grupla” deneyin. Diğer her şey için aşağıdan gerçek bir model bağlayın.',
      ),
    };
  }
  const sentence = parts.join(turkish ? ', ' : '; ');
  reply['summary'] =
    sentence.charAt(0).toLocaleUpperCase(turkish ? 'tr-TR' : 'en-US') +
    sentence.slice(1) +
    '.';
  return reply;
}

/**
 * The offline demo model as a transport. `delay` keeps the thinking state
 * visible long enough to see; the request honours the abort signal.
 */
export function createDemoAiTransport(
  options: { delay?: number; now?: () => Date } = {},
): OgeAiTransport {
  return {
    complete(request: OgeAiRequest, call): Promise<OgeAiResponse> {
      const system =
        request.messages.find((m) => m.role === 'system')?.content ?? '';
      const prompt =
        [...request.messages].reverse().find((m) => m.role === 'user')
          ?.content ?? '';
      const text = JSON.stringify(
        request.feature === 'smart-paste'
          ? demoSmartPasteReply(unfencePastedText(prompt), system)
          : demoReply(prompt, system, options.now?.() ?? new Date()),
      );
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ text }), options.delay ?? 650);
        call?.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new OgeAiError('aborted', 'The request was aborted.'));
        });
      });
    },
  };
}
