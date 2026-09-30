/**
 * The demo rows of the pivot-grid pages, shared by the Angular view and its
 * React mirror (`../react-pivot/`) so both render the identical example.
 */
export interface Sale {
  region: string;
  country: string;
  city: string;
  date: string;
  amount: number;
  units: number;
}

const REGIONS: Record<string, Record<string, string[]>> = {
  Europe: {
    Germany: ['Berlin', 'Munich'],
    France: ['Paris', 'Lyon'],
  },
  Americas: {
    USA: ['New York', 'Austin'],
    Brazil: ['São Paulo'],
  },
  Asia: {
    Japan: ['Tokyo'],
    Singapore: ['Singapore'],
  },
};

/** Overview page rows: three-level region › country › city geography. */
export function makeOverviewSales(count: number): Sale[] {
  const flat: { region: string; country: string; city: string }[] = [];
  for (const [region, countries] of Object.entries(REGIONS)) {
    for (const [country, cities] of Object.entries(countries)) {
      for (const city of cities) flat.push({ region, country, city });
    }
  }
  return Array.from({ length: count }, (_, i) => {
    const place = flat[i % flat.length];
    return {
      ...place,
      date: `${String(2022 + (i % 4))}-${String(1 + (i % 12)).padStart(2, '0')}-15`,
      amount: 500 + ((i * 7919) % 9500),
      units: 1 + (i % 20),
    };
  });
}

const PLACES: { region: string; country: string; city: string }[] = [
  { region: 'Europe', country: 'Germany', city: 'Berlin' },
  { region: 'Europe', country: 'Germany', city: 'Munich' },
  { region: 'Europe', country: 'France', city: 'Paris' },
  { region: 'Europe', country: 'Spain', city: 'Madrid' },
  { region: 'Americas', country: 'USA', city: 'New York' },
  { region: 'Americas', country: 'USA', city: 'Austin' },
  { region: 'Americas', country: 'Canada', city: 'Toronto' },
  { region: 'Asia', country: 'Japan', city: 'Tokyo' },
  { region: 'Asia', country: 'Korea', city: 'Seoul' },
  { region: 'Asia', country: 'Singapore', city: 'Singapore' },
];

/** Analytics page rows: ten cities across three regions. */
export function makeAnalyticsSales(count: number): Sale[] {
  return Array.from({ length: count }, (_, i) => ({
    ...PLACES[i % PLACES.length],
    date: `${String(2022 + (i % 4))}-${String(1 + (i % 12)).padStart(2, '0')}-15`,
    amount: 500 + ((i * 7919) % 9500),
    units: 1 + (i % 20),
  }));
}

/** The pages' currency formatter. */
export const money = (value: unknown): string =>
  typeof value === 'number'
    ? `₺${Math.round(value).toLocaleString('tr-TR')}`
    : String(value ?? '');
