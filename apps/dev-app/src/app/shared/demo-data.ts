export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  city: string;
  salary: number;
  hireDate: string;
}

const FIRST_NAMES = [
  'Ali',
  'Ayşe',
  'Mehmet',
  'Zeynep',
  'Emre',
  'Elif',
  'Can',
  'Deniz',
  'Mert',
  'Selin',
];
const LAST_NAMES = [
  'Yılmaz',
  'Kaya',
  'Demir',
  'Şahin',
  'Çelik',
  'Arslan',
  'Doğan',
  'Kılıç',
  'Aydın',
  'Öztürk',
];
const DEPARTMENTS = ['Engineering', 'Sales', 'HR', 'Finance', 'Support'];
const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya'];

/** Deterministic pseudo-random generator so demos and tests are reproducible. */
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

/**
 * Generates the employee at a given index on demand — lets demos expose
 * millions of rows without ever materializing the full array.
 */
export function makeEmployeeAt(index: number, seed = 42): Employee {
  const rand = mulberry32(seed + index * 7919);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)];
  const year = 2015 + Math.floor(rand() * 10);
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  return {
    id: index + 1,
    firstName: pick(FIRST_NAMES),
    lastName: pick(LAST_NAMES),
    department: pick(DEPARTMENTS),
    city: pick(CITIES),
    salary: 30000 + Math.floor(rand() * 90) * 1000,
    hireDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

export function makeEmployees(count: number, seed = 42): Employee[] {
  const rand = mulberry32(seed);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)];
  return Array.from({ length: count }, (_, i) => {
    const year = 2015 + Math.floor(rand() * 10);
    const month = 1 + Math.floor(rand() * 12);
    const day = 1 + Math.floor(rand() * 28);
    return {
      id: i + 1,
      firstName: pick(FIRST_NAMES),
      lastName: pick(LAST_NAMES),
      department: pick(DEPARTMENTS),
      city: pick(CITIES),
      salary: 30000 + Math.floor(rand() * 90) * 1000,
      hireDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    };
  });
}
