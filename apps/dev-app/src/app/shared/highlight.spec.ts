import { highlight } from './highlight';

/** Inverse of the renderer: strip spans, unescape entities. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const REAL_HTML_SNIPPET = `<oge-grid [data]="employees" keyField="id"
          [paging]="{ pageSize: 15, pageSizes: [15, 25, 50] }"
          [sorting]="{ mode: 'multi', allowUnsorting: true }"
          [(filterValue)]="filter" (rowClick)="onRow($event)">
  <!-- a comment with <brackets> & ampersands -->
  <oge-column field="salary" dataType="number" />
  <span>{{ row.name }} & more</span>
</oge-grid>`;

const REAL_TS_SNIPPET = `import { Component } from '@angular/core';

@Component({ selector: 'app-x' })
export class X<T extends object> {
  money = (v: unknown) => \`₺\${(v as number).toLocaleString('tr-TR')}\`;
  sizes = [15, 25, 50];
  // comment with { braces: 12 } and "quotes"
}`;

describe('highlight — textContent round-trip invariant', () => {
  it('html output text is exactly the input', () => {
    expect(textOf(highlight(REAL_HTML_SNIPPET, 'html'))).toBe(REAL_HTML_SNIPPET);
  });

  it('ts output text is exactly the input', () => {
    expect(textOf(highlight(REAL_TS_SNIPPET, 'ts'))).toBe(REAL_TS_SNIPPET);
  });

  it('css and sh outputs round-trip too', () => {
    const css = `.oge-grid { --oge-header-bg: #eef2f8; width: 100%; } /* note */`;
    const sh = `npm install @oge-ui/grid # peers too`;
    expect(textOf(highlight(css, 'css'))).toBe(css);
    expect(textOf(highlight(sh, 'sh'))).toBe(sh);
  });

  it('many tokens (index > 9) stay uncorrupted', () => {
    const code = Array.from({ length: 40 }, (_, i) => `const v${i} = ${i};`).join('\n');
    expect(textOf(highlight(code, 'ts'))).toBe(code);
  });
});

describe('highlight — tokenization', () => {
  it('wraps keywords, strings, numbers and comments', () => {
    const out = highlight(`const size = 15; // width\nconst name = 'Ali';`, 'ts');
    expect(out).toContain('<span class="tok-keyword">const</span>');
    expect(out).toContain('<span class="tok-number">15</span>');
    expect(out).toContain(`<span class="tok-string">'Ali'</span>`);
    expect(out).toContain('<span class="tok-comment">// width</span>');
  });

  it('highlights html tags, bindings and interpolation', () => {
    const out = highlight(REAL_HTML_SNIPPET, 'html');
    expect(out).toContain('<span class="tok-tag">oge-grid</span>');
    expect(out).toContain('<span class="tok-attr">[data]</span>');
    expect(out).toContain('<span class="tok-attr">[(filterValue)]</span>');
    expect(out).toContain('<span class="tok-attr">(rowClick)</span>');
    expect(out).toContain('tok-interp');
    expect(out).toContain('tok-comment');
  });

  it('does not tokenize inside earlier tokens (string beats number/keyword)', () => {
    const out = highlight(`const s = 'const 42';`, 'ts');
    expect(out).toContain(`<span class="tok-string">'const 42'</span>`);
    // the 42 inside the string must NOT get its own span
    expect(out).not.toContain('<span class="tok-number">42</span>');
  });

  it('escapes html so the output is injection-safe', () => {
    const out = highlight('<script>alert(1)</script>', 'ts');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;');
  });
});
