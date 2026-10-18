/**
 * The docs' offline demo model, AI-column half: a keyword stand-in for a
 * real model that reads the rows and the allowed values out of the real
 * request and answers one value per row. Not part of any package.
 */

const POSITIVE =
  /\b(love[ds]?|great|excellent|fast|perfect|amazing|helpful|friendly|recommend|smooth)\b|harika|mükemmel|hızlı|güzel/i;
const NEGATIVE =
  /\b(terrible|awful|slow|broken|late|bad|rude|never again|refund|worst|damaged)\b|kötü|berbat|geç|bozuk/i;

/** Reviews the AI-column demos classify. */
export interface AiReview {
  id: number;
  product: string;
  review: string;
  stars: number;
}

export const AI_DEMO_REVIEWS: AiReview[] = [
  {
    id: 1,
    product: 'Desk lamp',
    review: 'Loved it — bright, sturdy and arrived fast.',
    stars: 5,
  },
  {
    id: 2,
    product: 'Office chair',
    review: 'Arrived damaged and support was rude. Never again.',
    stars: 1,
  },
  {
    id: 3,
    product: 'Keyboard',
    review: 'Does the job. Keys are a bit loud.',
    stars: 3,
  },
  {
    id: 4,
    product: 'Monitor arm',
    review: 'Excellent build, smooth movement, would recommend.',
    stars: 5,
  },
  {
    id: 5,
    product: 'Webcam',
    review: 'Picture is fine, the mount feels cheap.',
    stars: 3,
  },
  {
    id: 6,
    product: 'Headset',
    review: 'Terrible microphone and the delivery was late.',
    stars: 2,
  },
  {
    id: 7,
    product: 'Mouse pad',
    review: 'Harika, kaymıyor ve çok güzel görünüyor.',
    stars: 5,
  },
  {
    id: 8,
    product: 'USB hub',
    review: 'Bir haftada bozuldu, berbat.',
    stars: 1,
  },
];

export const AI_DEMO_SENTIMENTS = [
  { value: 'positive', text: 'Positive' },
  { value: 'neutral', text: 'Neutral' },
  { value: 'negative', text: 'Negative' },
];

/** One AI-column request → one reply object, the way the system prompt asks for it. */
export function demoAiColumnReply(
  user: string,
  system: string,
): Record<string, unknown> {
  let rows: Record<string, unknown>[] = [];
  try {
    rows = JSON.parse(user.replace(/^Rows: /, '')) as Record<string, unknown>[];
  } catch {
    rows = [];
  }
  const allowed = [...system.matchAll(/"([^"]+)" \(/g)].map((m) => m[1]);
  const pick = (wanted: string) =>
    allowed.length === 0 || allowed.includes(wanted) ? wanted : null;
  return {
    values: rows.map((row) => {
      const text = Object.entries(row)
        .filter(([field]) => field !== 'key')
        .map(([, value]) => String(value ?? ''))
        .join(' ');
      const positive = POSITIVE.test(text);
      const negative = NEGATIVE.test(text);
      const value =
        positive && !negative
          ? pick('positive')
          : negative && !positive
            ? pick('negative')
            : pick('neutral');
      return { key: row['key'], value };
    }),
  };
}
