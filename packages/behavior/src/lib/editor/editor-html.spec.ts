import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ogeEditorFromHtml,
  ogeEditorFromText,
  ogeEditorNormalizeLinkInput,
  ogeEditorSafeColor,
  ogeEditorSafeHref,
  ogeEditorSafeImageSrc,
  ogeEditorToHtml,
  ogeSanitizeEditorHtml,
} from './editor-html';
import {
  OGE_EDITOR_TRUSTED_TYPES_POLICY,
  resetOgeEditorTrustedTypesPolicyForTests,
} from './editor-trusted-types';

const clean = (html: string, options = {}) =>
  ogeSanitizeEditorHtml(html, options);

const TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'code',
  'ul',
  'ol',
  'li',
  'hr',
  'br',
  'img',
  'a',
  'strong',
  'em',
  'u',
  's',
  'sub',
  'sup',
  'span',
]);
const ATTRS = new Set([
  'href',
  'title',
  'target',
  'rel',
  'src',
  'alt',
  'width',
  'height',
  'style',
  'dir',
]);

/**
 * No executable surface may survive, whatever the payload: the output is
 * re-parsed and every element, attribute, URL and style is checked against
 * the editor's allowlist (text that merely *reads* like markup is fine — it
 * is escaped). A raw-text regex alone would not do: the second parse is
 * where mutation XSS happens.
 */
function expectInert(output: string): void {
  expect(output).not.toMatch(
    /<script|<style|<svg|<math|<iframe|<template|<noscript/i,
  );
  const doc = new DOMParser().parseFromString(output, 'text/html');
  expect(doc.head.childNodes.length).toBe(0);
  for (const element of Array.from(doc.body.querySelectorAll('*'))) {
    expect(TAGS.has(element.localName), element.localName).toBe(true);
    for (const attr of Array.from(element.attributes)) {
      expect(ATTRS.has(attr.name), attr.name).toBe(true);
      if (attr.name === 'href' || attr.name === 'src') {
        expect(attr.value).not.toMatch(
          /^\s*(javascript|vbscript|data|blob|file):/i,
        );
      }
      if (attr.name === 'style') {
        for (const declaration of attr.value.split(';')) {
          const name = declaration.split(':')[0].trim();
          expect(['color', 'background-color', 'text-align']).toContain(name);
          expect(declaration).not.toMatch(/url\(|expression|var\(/i);
        }
      }
    }
  }
}

describe('editor HTML — XSS corpus', () => {
  const corpus: readonly string[] = [
    '<script>alert(1)</script>',
    '<p onclick="alert(1)">x</p>',
    '<img src=x onerror=alert(1)>',
    '<img src="javascript:alert(1)">',
    '<a href="javascript:alert(1)">x</a>',
    '<a href="JaVaScRiPt:alert(1)">x</a>',
    '<a href="java\tscript:alert(1)">x</a>',
    '<a href="java&#x09;script:alert(1)">x</a>',
    '<a href="&#106;avascript:alert(1)">x</a>',
    '<a href=" javascript:alert(1)">x</a>',
    '<a href="vbscript:msgbox(1)">x</a>',
    '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
    '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+">',
    '<img src="data:text/html,<script>alert(1)</script>">',
    '<svg><script>alert(1)</script></svg>',
    '<svg onload=alert(1)><p>x</p></svg>',
    '<math><mi xlink:href="javascript:alert(1)">x</mi></math>',
    '<style>@import "https://evil.test/x.css";</style><p>y</p>',
    '<p style="background:url(javascript:alert(1))">x</p>',
    '<span style="color: expression(alert(1))">x</span>',
    '<span style="color: red; background-image: url(https://evil.test)">x</span>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '<object data="javascript:alert(1)"></object>',
    '<embed src="javascript:alert(1)">',
    '<form action="javascript:alert(1)"><button formaction="javascript:alert(1)">x</button></form>',
    '<details open ontoggle=alert(1)>x</details>',
    '<body onload=alert(1)>x</body>',
    '<template><img src=x onerror=alert(1)></template>',
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>',
    // mutation XSS classics: payloads that only become active on re-parse
    '<svg><p><style><img src=x onerror=alert(1)></style></p></svg>',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
    '<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>',
    '<a href="https://ok.test" title="&quot;><img src=x onerror=alert(1)>">x</a>',
    '<img alt="<img src=x onerror=alert(1)>" src="https://i.test/a.png">',
    '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    '<!--<img src=x onerror=alert(1)>-->',
    '<![CDATA[<img src=x onerror=alert(1)>]]>',
    '<xmp><img src=x onerror=alert(1)></xmp>',
    '<a href="https://ok.test" target="_top" ping="https://evil.test">x</a>',
    '<base href="javascript:alert(1)//"><a href="/x">x</a>',
    '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    '<link rel="stylesheet" href="https://evil.test/x.css">',
    '<video><source onerror="alert(1)"></video>',
    '<input autofocus onfocus=alert(1)>',
    '<p id="x" class="evil" data-x="1" aria-hidden="true" role="button">x</p>',
  ];

  it.each(corpus)('neutralizes %s', (payload) => {
    expectInert(clean(payload));
  });

  // the server (and React's first render) tokenizes with the portable parser
  it.each(corpus)('neutralizes %s through the portable parser', (payload) => {
    expectInert(clean(payload, { parser: 'portable' }));
  });

  it('keeps escaped text as text', () => {
    expect(clean('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    );
  });

  it('re-escapes attribute values, so quotes cannot break out', () => {
    expect(
      clean(
        '<a href="https://ok.test" title="&quot;><img src=x onerror=alert(1)>">x</a>',
      ),
    ).toBe(
      '<p><a href="https://ok.test" title="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;">x</a></p>',
    );
  });

  it('drops every attribute outside the allowlist', () => {
    expect(
      clean(
        '<p id="x" class="evil" data-x="1" aria-hidden="true" role="button">x</p>',
      ),
    ).toBe('<p>x</p>');
  });

  it('a link that loses its href keeps its text', () => {
    expect(clean('<a href="javascript:alert(1)">click</a>')).toBe(
      '<p>click</p>',
    );
  });

  it('only _blank survives as a target, always with rel', () => {
    expect(clean('<a href="https://a.test" target="_top">x</a>')).toBe(
      '<p><a href="https://a.test">x</a></p>',
    );
  });

  it('is idempotent', () => {
    for (const payload of corpus) {
      const once = clean(payload);
      expect(clean(once)).toBe(once);
    }
  });

  it('does not nest deeper than its limit (no stack overflow)', () => {
    // jsdom's own parser is quadratic in depth — 600 is past MAX_DEPTH (256)
    const deep = '<span>'.repeat(600) + 'x' + '</span>'.repeat(600);
    expect(clean(deep)).toBe('<p>x</p>');
  });
});

describe('editor HTML — URLs and colours', () => {
  it('normalizes what people type into a link field', () => {
    expect(ogeEditorNormalizeLinkInput('ogeui.com/docs')).toBe(
      'https://ogeui.com/docs',
    );
    expect(ogeEditorNormalizeLinkInput(' a@b.test ')).toBe('mailto:a@b.test');
    expect(ogeEditorNormalizeLinkInput('/docs')).toBe('/docs');
    expect(ogeEditorNormalizeLinkInput('#top')).toBe('#top');
    expect(ogeEditorNormalizeLinkInput('https://x.test')).toBe(
      'https://x.test',
    );
    expect(ogeEditorNormalizeLinkInput('javascript:alert(1)')).toBe(
      'javascript:alert(1)',
    );
    expect(ogeEditorNormalizeLinkInput('notes')).toBe('notes');
  });

  it('allows the default link schemes and relative links', () => {
    expect(ogeEditorSafeHref('https://a.test')).toBe('https://a.test');
    expect(ogeEditorSafeHref('mailto:a@b.test')).toBe('mailto:a@b.test');
    expect(ogeEditorSafeHref('/docs#x')).toBe('/docs#x');
    expect(ogeEditorSafeHref('javascript:alert(1)')).toBeNull();
    expect(ogeEditorSafeHref('web+app:open')).toBeNull();
    expect(
      ogeEditorSafeHref('web+app:open', { allowedSchemes: ['web+app'] }),
    ).toBe('web+app:open');
  });

  it('images: http(s) and relative only, data images by opt-in, never blob or markup', () => {
    expect(ogeEditorSafeImageSrc('https://i.test/a.png')).toBe(
      'https://i.test/a.png',
    );
    expect(ogeEditorSafeImageSrc('data:image/png;base64,AAAA')).toBeNull();
    expect(
      ogeEditorSafeImageSrc('data:image/png;base64,AAAA', {
        allowDataImages: true,
      }),
    ).toBe('data:image/png;base64,AAAA');
    expect(
      ogeEditorSafeImageSrc('data:image/svg+xml;base64,AAAA', {
        allowDataImages: true,
      }),
    ).toBeNull();
    expect(ogeEditorSafeImageSrc('blob:https://a.test/uuid')).toBeNull();
    expect(ogeEditorSafeImageSrc('file:///C:/Users/x/image001.png')).toBeNull();
  });

  it('accepts plain colour values and refuses everything with a function or a quote', () => {
    expect(ogeEditorSafeColor('#C00')).toBe('#c00');
    expect(ogeEditorSafeColor('rgb(10, 20, 30)')).toBe('rgb(10, 20, 30)');
    expect(ogeEditorSafeColor('hsl(120deg 50% 50% / 0.5)')).toBe(
      'hsl(120deg 50% 50% / 0.5)',
    );
    expect(ogeEditorSafeColor('rebeccapurple')).toBe('rebeccapurple');
    expect(ogeEditorSafeColor('var(--x)')).toBeNull();
    expect(ogeEditorSafeColor('url(x)')).toBeNull();
    expect(ogeEditorSafeColor('red;background:url(x)')).toBeNull();
    expect(ogeEditorSafeColor('transparent')).toBeNull();
  });
});

describe('editor HTML — round trip', () => {
  const canonical = [
    '<p>plain</p>',
    '<h1>A</h1><h6>F</h6>',
    '<p><strong>b</strong><em>i</em><u>u</u><s>s</s><code>c</code><sub>2</sub><sup>3</sup></p>',
    '<p><a href="https://a.test" title="T">t</a></p>',
    '<p><span style="color: #c00; background-color: #ff0">x</span></p>',
    '<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>',
    '<ol><li>1</li></ol><ul><li>x</li></ul>',
    '<blockquote><p>q1</p><p>q2</p></blockquote>',
    '<pre><code>line 1\nline 2</code></pre>',
    '<p>a</p><hr><p>b</p>',
    '<p style="text-align: center" dir="rtl">x</p>',
    '<p><img src="https://i.test/a.png" alt="A" width="20" height="10"></p>',
    '<p>a</p><p><br></p>',
    '<p>a&nbsp; b&nbsp;</p>',
  ];

  it.each(canonical)('keeps %s', (html) => {
    const reorder = (s: string) =>
      s.replace(' dir="rtl"', '').replace('<p style', '<p dir="rtl" style');
    const out = clean(html);
    expect(out === html || out === reorder(html)).toBe(true);
  });

  it('an empty document is the empty string', () => {
    expect(ogeEditorToHtml(ogeEditorFromHtml(''))).toBe('');
    expect(clean('<p></p>')).toBe('');
    expect(clean('   ')).toBe('');
  });

  it('collapses insignificant whitespace like a browser', () => {
    expect(clean('<p>\n  a   b\n</p>\n<p> c </p>')).toBe('<p>a b</p><p>c</p>');
  });

  it('maps legacy and synonym tags', () => {
    expect(
      clean(
        '<p><b>b</b><i>i</i><strike>s</strike><del>d</del><ins>u</ins><kbd>k</kbd></p>',
      ),
    ).toBe(
      '<p><strong>b</strong><em>i</em><s>sd</s><u>u</u><code>k</code></p>',
    );
    expect(clean('<p><font color="red">r</font></p>')).toBe(
      '<p><span style="color: red">r</span></p>',
    );
  });

  it('unwraps unknown inline tags and keeps their text', () => {
    expect(clean('<p><custom-el>a<blink>b</blink></custom-el></p>')).toBe(
      '<p>ab</p>',
    );
  });

  it('flattens tables into paragraphs', () => {
    expect(clean('<table><tr><td>a</td><td>b</td></tr></table>')).toBe(
      '<p>a</p><p>b</p>',
    );
  });

  it('plain text becomes one paragraph per line', () => {
    expect(ogeEditorToHtml(ogeEditorFromText('a\r\nb\n\nc'))).toBe(
      '<p>a</p><p>b</p><p><br></p><p>c</p>',
    );
  });
});

describe('editor HTML — paste cleanup', () => {
  const paste = (html: string) =>
    ogeEditorToHtml(ogeEditorFromHtml(html, { source: 'paste' }));

  it('Word: list paragraphs become nested lists, markers and o:p vanish', () => {
    const word = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"><head><style>p.MsoNormal{margin:0}</style></head>
      <body><!--StartFragment-->
      <p class=MsoNormal><b><span style='font-size:14pt;color:black'>Title<o:p></o:p></span></b></p>
      <p class=MsoListParagraphCxSpFirst style='mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>1.<span>&nbsp;&nbsp;</span></span><![endif]>First<o:p></o:p></p>
      <p class=MsoListParagraphCxSpLast style='mso-list:l0 level2 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>a.<span>&nbsp;</span></span><![endif]>Nested<o:p></o:p></p>
      <p class=MsoListParagraph style='mso-list:l1 level1 lfo2'><span style='font-family:Symbol;mso-list:Ignore'>·<span>&nbsp;</span></span>Bullet</p>
      <!--EndFragment--></body></html>`;
    expect(paste(word)).toBe(
      '<p><strong>Title</strong></p><ol><li>First<ol><li>Nested</li></ol></li></ol><ul><li>Bullet</li></ul>',
    );
  });

  it('Word: local file images are dropped', () => {
    expect(
      paste(
        '<p>a<img src="file:///C:/Users/x/AppData/Local/Temp/msohtmlclip1/01/clip_image002.png">b</p>',
      ),
    ).toBe('<p>ab</p>');
  });

  it('Google Docs: the font-weight:normal wrapper is not bold; styled spans are', () => {
    const docs =
      '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1234">' +
      '<p dir="ltr" style="line-height:1.38;margin-top:0pt"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:700;font-style:normal;text-decoration:none;vertical-align:baseline;">Bold</span>' +
      '<span style="font-size:11pt;color:#000000;font-weight:400;font-style:italic;">italic</span>' +
      '<span style="color:#ff0000;text-decoration:underline;">red</span></p>' +
      '<ul><li dir="ltr" style="list-style-type:disc;"><p dir="ltr"><span>item</span></p></li></ul></b>';
    expect(paste(docs)).toBe(
      '<p dir="ltr"><strong>Bold</strong><em>italic</em><span style="color: #ff0000"><u>red</u></span></p><ul><li dir="ltr">item</li></ul>',
    );
  });

  it('pasted default black text and white highlights are dropped (dark themes)', () => {
    expect(
      paste('<span style="color: windowtext; background: white">x</span>'),
    ).toBe('<p>x</p>');
    // the same colours in a value are the author's choice and stay
    expect(clean('<span style="color: black">x</span>')).toBe(
      '<p><span style="color: black">x</span></p>',
    );
  });

  it('hidden content stays hidden', () => {
    expect(
      paste(
        '<p>a<span style="display:none">secret</span><span style="mso-hide:all">x</span>b</p>',
      ),
    ).toBe('<p>ab</p>');
  });

  it('can drop colours entirely', () => {
    expect(
      ogeEditorToHtml(
        ogeEditorFromHtml('<span style="color:#c00">x</span>', {
          keepColors: false,
        }),
      ),
    ).toBe('<p>x</p>');
  });
});

describe('editor HTML — Trusted Types', () => {
  afterEach(() => {
    delete (globalThis as { trustedTypes?: unknown }).trustedTypes;
    resetOgeEditorTrustedTypesPolicyForTests();
  });

  it('parses through the oge-ui#editor policy when Trusted Types exist', () => {
    const createHTML = vi.fn((input: string) => input);
    const createPolicy = vi.fn(
      (_name: string, rules: { createHTML: (s: string) => string }) => ({
        createHTML: (s: string) => {
          createHTML(s);
          return rules.createHTML(s);
        },
      }),
    );
    (globalThis as { trustedTypes?: unknown }).trustedTypes = { createPolicy };
    resetOgeEditorTrustedTypesPolicyForTests();
    expect(clean('<p>x</p>')).toBe('<p>x</p>');
    expect(clean('<p>y</p>')).toBe('<p>y</p>');
    expect(createPolicy).toHaveBeenCalledTimes(1);
    expect(createPolicy.mock.calls[0][0]).toBe(OGE_EDITOR_TRUSTED_TYPES_POLICY);
    expect(createHTML).toHaveBeenCalledTimes(2);
  });

  it('falls back to a plain string when the policy name is refused', () => {
    (globalThis as { trustedTypes?: unknown }).trustedTypes = {
      createPolicy: () => {
        throw new Error('refused');
      },
    };
    resetOgeEditorTrustedTypesPolicyForTests();
    expect(clean('<p>x</p>')).toBe('<p>x</p>');
  });

  it('without DOMParser (SSR) parses with the portable parser, same allowlist', () => {
    const original = globalThis.DOMParser;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).DOMParser = undefined;
    try {
      expect(
        clean('<p>a <b>b</b></p><script>x()</script><p>c &amp; d</p>'),
      ).toBe('<p>a <strong>b</strong></p><p>c &amp; d</p>');
      expect(
        clean(
          '<p><a href="javascript:alert(1)">x</a><img src=x onerror=y></p>',
        ),
      ).toBe('<p>x<img src="x" alt=""></p>');
    } finally {
      globalThis.DOMParser = original;
    }
  });
});
