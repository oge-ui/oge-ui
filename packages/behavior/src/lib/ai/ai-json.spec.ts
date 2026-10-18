import { describe, expect, it } from 'vitest';
import { extractOgeAiJson } from './ai-json';

describe('extractOgeAiJson', () => {
  it('parses a bare object', () => {
    expect(extractOgeAiJson('{"status":"apply","sort":[]}')).toEqual({
      status: 'apply',
      sort: [],
    });
  });

  it('takes the fenced block and ignores surrounding prose', () => {
    const text = 'Sure! Here you go:\n```json\n{"summary":"a } b"}\n```\nDone.';
    expect(extractOgeAiJson(text)).toEqual({ summary: 'a } b' });
  });

  it('finds the first balanced object in prose, skipping braces in strings', () => {
    const text = 'Result: {"summary":"say \\"{hi}\\"","n":{"x":1}} trailing {';
    expect(extractOgeAiJson(text)).toEqual({
      summary: 'say "{hi}"',
      n: { x: 1 },
    });
  });

  it('rejects prototype keys at any depth', () => {
    expect(extractOgeAiJson('{"a":{"__proto__":{"x":1}}}')).toBeUndefined();
    expect(extractOgeAiJson('{"constructor":{}}')).toBeUndefined();
  });

  it('returns undefined for no object, broken JSON or a top-level array', () => {
    expect(extractOgeAiJson('no json here')).toBeUndefined();
    expect(extractOgeAiJson('{"a":')).toBeUndefined();
    expect(extractOgeAiJson('{"a":1,}')).toBeUndefined();
    expect(extractOgeAiJson('[1,2]')).toBeUndefined();
  });
});
