import { highlight } from './highlight';

describe('highlight', () => {
  it('wraps keywords, strings and numbers without leaking placeholders', () => {
    const out = highlight(`const size = 15; // width\nconst name = 'Ali';`, 'ts');
    expect(out).toContain('<span class="tok-keyword">const</span>');
    expect(out).toContain('<span class="tok-number">15</span>');
    expect(out).toContain(`<span class="tok-string">'Ali'</span>`);
    expect(out).toContain('<span class="tok-comment">// width</span>');
    // no private-use placeholder characters may survive
    expect(/[\uE000-\uE019]/.test(out)).toBe(false);
    // no stray brace/number artifacts from nested stashing
    expect(out).not.toMatch(/\{\s*\d+\s*\}/);
  });

  it('highlights html tags and attribute bindings', () => {
    const out = highlight('<oge-grid [data]="rows" keyField="id">', 'html');
    expect(out).toContain('<span class="tok-tag">oge-grid</span>');
    expect(out).toContain('<span class="tok-attr">[data]</span>');
    expect(out).toContain('<span class="tok-string">"id"</span>');
    expect(/[\uE000-\uE019]/.test(out)).toBe(false);
  });

  it('escapes html so the output is injection-safe', () => {
    const out = highlight('<script>alert(1)</script>', 'ts');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;');
  });

  it('handles many tokens (index > 9) without corruption', () => {
    const code = Array.from({ length: 30 }, (_, i) => `const v${i} = ${i};`).join('\n');
    const out = highlight(code, 'ts');
    expect(/[\uE000-\uE019]/.test(out)).toBe(false);
    expect(out).toContain('<span class="tok-number">29</span>');
  });
});
