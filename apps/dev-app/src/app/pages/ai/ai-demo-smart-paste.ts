/**
 * The docs' offline demo model, smart-paste half: a rule-based stand-in for a
 * real model that reads the field catalog back out of the real system prompt
 * and recognises the shapes a model would — labelled lines, an email address,
 * a phone number, a name, a company suffix, a date, a count, a listed value.
 * Not part of any package.
 */

interface DemoFormField {
  field: string;
  label: string;
  type: string;
  values: { value: unknown; text: string }[];
}

const lower = (s: string) => s.toLocaleLowerCase('tr-TR');

/** Strips the `Pasted text:\n<<<\n … \n>>>` fence the request puts around the text. */
export function unfencePastedText(content: string): string {
  const open = '<<<\n';
  const close = '\n>>>';
  const start = content.indexOf(open);
  const end = content.lastIndexOf(close);
  return start >= 0 && end > start
    ? content.slice(start + open.length, end)
    : content;
}

/** Reads the smart-paste field catalog back out of its system prompt. */
function parseFormFields(system: string): DemoFormField[] {
  const out: DemoFormField[] = [];
  for (const line of system.split('\n')) {
    const match = /^- (\S+) \("([^"]*)", ([\w ]+?)(?:, required)?\)/.exec(line);
    if (!match) continue;
    const values: DemoFormField['values'] = [];
    const list = /values: (.*)$/.exec(line)?.[1] ?? '';
    for (const item of list.matchAll(
      /(-?\d+(?:\.\d+)?|"[^"]*")(?: = "([^"]*)")?/g,
    )) {
      const value: unknown = JSON.parse(item[1]);
      values.push({ value, text: item[2] ?? String(value) });
    }
    out.push({ field: match[1], label: match[2], type: match[3], values });
  }
  return out;
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const pad = (value: string | number) => String(value).padStart(2, '0');

function findDate(text: string): string | undefined {
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso) return iso[0];
  const dotted = /\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/.exec(text);
  if (dotted) return `${dotted[3]}-${pad(dotted[2])}-${pad(dotted[1])}`;
  const words = new RegExp(
    `\\b(\\d{1,2}) (${MONTHS.join('|')}) (\\d{4})\\b`,
    'i',
  ).exec(text);
  if (words) {
    const month = MONTHS.indexOf(words[2].toLowerCase()) + 1;
    return `${words[3]}-${pad(month)}-${pad(words[1])}`;
  }
  return undefined;
}

const COMPANY =
  /\b(Ltd|GmbH|Inc|Corp|LLC|AG|SA|Labs|Media|Software|Mimarlık)\b|A\.Ş\./;
const PERSON = /^\p{Lu}[\p{L}'-]+(?: \p{Lu}[\p{L}'-]+){1,2}$/u;

/** One smart-paste request → one reply object, the way the system prompt asks for it. */
export function demoSmartPasteReply(
  text: string,
  system: string,
): Record<string, unknown> {
  const fields = parseFormFields(system);
  const values: Record<string, unknown> = {};
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const lowerText = lower(text);

  // labelled lines first: "Company: Acme"
  for (const line of lines) {
    const match = /^([\p{L} ]{2,30}):\s*(.+)$/u.exec(line);
    if (!match) continue;
    const key = lower(match[1]);
    const field = fields.find(
      (f) => lower(f.label) === key || lower(f.field) === key,
    );
    if (field && !(field.field in values)) values[field.field] = match[2];
  }

  for (const field of fields) {
    if (field.field in values) continue;
    const name = lower(`${field.field} ${field.label}`);
    if (field.values.length) {
      const hit = field.values.find((v) => lowerText.includes(lower(v.text)));
      if (hit) values[field.field] = hit.value;
    } else if (/mail/.test(name)) {
      const email = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(text)?.[0];
      if (email) values[field.field] = email;
    } else if (/phone|tel|mobile/.test(name)) {
      const phone = /\+?\d[\d ()-]{7,}\d/.exec(text)?.[0];
      if (phone) values[field.field] = phone.replace(/\s+/g, ' ');
    } else if (/company|organi[sz]ation|firm/.test(name)) {
      const company = lines.find((l) => COMPANY.test(l));
      if (company) values[field.field] = company;
    } else if (field.type === 'date' || field.type === 'datetime') {
      const date = findDate(text);
      if (date) values[field.field] = date;
    } else if (field.type === 'number') {
      const count =
        /(\d+)\s*(?:seats?|licen[cs]es?|users?|people|kişi|adet|lisans)/i.exec(
          text,
        )?.[1];
      if (count) values[field.field] = Number(count);
    } else if (/name/.test(name)) {
      const person = lines.find((l) => PERSON.test(l) && !COMPANY.test(l));
      if (person) values[field.field] = person;
    }
  }

  const turkish = /[çğıöşü]/.test(lowerText);
  const count = Object.keys(values).length;
  return count
    ? {
        status: 'apply',
        summary: turkish
          ? `Metinden ${count} alan okundu.`
          : `Read ${count} fields from the text.`,
        values,
      }
    : {
        status: 'unsupported',
        summary: turkish
          ? 'Çevrimdışı demo model bu metinde forma uyan bir şey bulamadı.'
          : 'The offline demo model found nothing for this form in the text.',
      };
}

/** The sample the smart-paste demos fill from — a typical signature block. */
export const SMART_PASTE_SAMPLE = `Hi, we would like 12 seats on the Pro plan from 01.11.2026.

Ada Lovelace
Analytical Engines Ltd
ada@engines.example
+44 20 7946 0958`;
