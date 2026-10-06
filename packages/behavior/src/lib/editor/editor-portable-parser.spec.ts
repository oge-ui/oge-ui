import { describe, expect, it } from 'vitest';
import { ogeEditorFromHtml, ogeEditorToHtml } from './editor-html';
import {
  ogeEditorDecodeEntities,
  ogeEditorParsePortable,
} from './editor-portable-parser';

/** Both tokenizers, through the same allow-list walker and serializer. */
function both(html: string, paste = false) {
  const options = paste ? ({ source: 'paste' } as const) : {};
  return {
    browser: ogeEditorToHtml(ogeEditorFromHtml(html, options)),
    portable: ogeEditorToHtml(
      ogeEditorFromHtml(html, { ...options, parser: 'portable' }),
    ),
  };
}

// the parser's contract: for editor content it reads what a browser reads
const CORPUS = [
  '<h2>Release notes</h2><p>Hello <strong>world</strong></p>',
  '<p>a <b>b</b> <i>i</i> <u>u</u> <s>s</s> <code>c</code></p>',
  '<p style="text-align:center" dir="rtl">x</p><p align="right">y</p>',
  '<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul><ol start="3"><li>d</li></ol>',
  '<ul><li>open item<li>second item</ul>',
  '<p>one<p>two<div>three</div>',
  '<blockquote><p>q1</p><p>q2</p></blockquote>',
  '<pre><code>\nline 1\n  line 2</code></pre>',
  '<pre>\nfirst</pre>',
  '<p>a<br>b<br></p><hr><p>&nbsp;x&nbsp;</p>',
  '<p><a href="https://ogeui.com/?a=1&amp;b=2" title="T &quot;q&quot;" target="_blank">l</a></p>',
  '<p><a href=javascript:alert(1)>bad</a> <a href="  https://x.test ">ok</a></p>',
  '<p><img src="https://x.test/i.png" alt="pic" width="20" height=10></p>',
  "<p><span style='color: rgb(200, 0, 0); background-color: #ff0'>c</span></p>",
  '<p>&lt;script&gt; &amp; &#39; &#x27; &#8212; &copy; &hellip; &unknown;</p>',
  '<p>before<script>alert(1)</script><style>p{}</style>after</p>',
  '<!-- c --><!DOCTYPE html><p>x<!-- y -->z</p>',
  '<html><head><title>T</title><meta charset="utf-8"><style>p{}</style></head><body><p>b</p></body></html>',
  '<head><title>x</title><p>no head end</p>',
  '<h1>a<h2>b</h2>',
  '<p>x <unknown>wrapped</unknown> <font color="red">f</font></p>',
  '<p>a < b and c > d</p>',
  '<p>sub<sub>2</sub> sup<sup>3</sup> <mark>m</mark></p>',
  '<textarea><p>not markup</p></textarea><p>after</p>',
  '<p>trürkçe \u{1F600} با</p>',
  '<p>crlf\r\nline</p>',
];

const PASTES = [
  '<p class="MsoListParagraph" style="mso-list: l0 level1 lfo1"><span style="mso-list:Ignore">1.<span>&nbsp; </span></span>Word item</p><p class=MsoNormal>Body<o:p></o:p></p>',
  '<b style="font-weight:normal" id="docs-internal-guid-1"><p><span style="font-weight:700">Docs</span> paste</p></b>',
  '<p><span style="color:#000000;background-color:#ffffff">plain</span></p>',
];

describe('ogeEditorParsePortable', () => {
  for (const html of CORPUS) {
    it(`reads like the browser: ${JSON.stringify(html).slice(0, 60)}`, () => {
      const { browser, portable } = both(html);
      expect(portable).toBe(browser);
    });
  }
  for (const html of PASTES) {
    it(`reads a paste like the browser: ${JSON.stringify(html).slice(0, 50)}`, () => {
      const { browser, portable } = both(html, true);
      expect(portable).toBe(browser);
    });
  }

  it('exposes only the walker surface: elements, text, attributes', () => {
    const root = ogeEditorParsePortable('<p class="A" data-x=1>t<b>u</b></p>');
    const p = root.firstChild as Element;
    expect(p.localName).toBe('p');
    expect(p.getAttribute('CLASS')).toBe('A');
    expect(p.getAttribute('data-x')).toBe('1');
    expect(p.getAttribute('missing')).toBeNull();
    expect(p.textContent).toBe('tu');
    expect(p.firstChild?.nodeType).toBe(3);
    expect(p.firstChild?.nextSibling?.nodeType).toBe(1);
  });

  it('keeps the first of duplicated attributes, as HTML does', () => {
    const p = ogeEditorParsePortable('<p dir="rtl" dir="ltr">x</p>')
      .firstChild as Element;
    expect(p.getAttribute('dir')).toBe('rtl');
  });

  it('survives unterminated markup', () => {
    for (const html of ['<p>x<b', '<p title="x>y', '<!-- open', '<script>x']) {
      expect(() => ogeEditorParsePortable(html)).not.toThrow();
    }
  });

  it('decodes numeric references with the HTML replacements', () => {
    expect(ogeEditorDecodeEntities('&#x80;&#0;&#xD800;&#65')).toBe('€��A');
    expect(ogeEditorDecodeEntities('a&b &amp c')).toBe('a&b &amp c');
  });
});
