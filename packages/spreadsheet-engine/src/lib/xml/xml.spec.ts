import fc from 'fast-check';
import {
  OgeXmlError,
  decodeOgeXstring,
  encodeOgeXstring,
  escapeOgeXmlAttribute,
  escapeOgeXmlText,
  ogeXmlLocalName,
  parseOgeXml,
  type OgeXmlErrorCode,
} from './xml';

/** Records events as compact strings: `<name a=b>`, `</name>`, `"text"`. */
function events(xml: string): string[] {
  const out: string[] = [];
  parseOgeXml(xml, {
    open(name, attributes, selfClosing) {
      const attrs = Object.entries(attributes)
        .map(([k, v]) => ` ${k}=${v}`)
        .join('');
      out.push(`<${name}${attrs}${selfClosing ? '/' : ''}>`);
    },
    close(name) {
      out.push(`</${name}>`);
    },
    text(text) {
      out.push(JSON.stringify(text));
    },
  });
  return out;
}

function refusal(xml: string): OgeXmlErrorCode | null {
  try {
    parseOgeXml(xml, {});
    return null;
  } catch (error) {
    if (error instanceof OgeXmlError) return error.code;
    throw error;
  }
}

describe('XML reader', () => {
  it('streams a SpreadsheetML part', () => {
    const xml =
      String.fromCharCode(0xfeff) +
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      "xmlns:r='rel'><!-- a comment --><sheetData>" +
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><f>SUM(A1:A3)&lt;5</f></c></row>' +
      '</sheetData><x:ext r:id="rId1"/></worksheet>';
    expect(events(xml)).toEqual([
      '<worksheet xmlns=http://schemas.openxmlformats.org/spreadsheetml/2006/main xmlns:r=rel>',
      '<sheetData>',
      '<row r=1>',
      '<c r=A1 t=s>',
      '<v>',
      '"0"',
      '</v>',
      '</c>',
      '<c r=B1>',
      '<f>',
      '"SUM(A1:A3)<5"',
      '</f>',
      '</c>',
      '</row>',
      '</sheetData>',
      '<x:ext r:id=rId1/>',
      '</x:ext>',
      '</worksheet>',
    ]);
  });

  it('decodes entities and character references, and passes CDATA through', () => {
    expect(
      events('<t>&lt;&gt;&amp;&quot;&apos;&#65;&#x42;&#x1F600;</t>'),
    ).toEqual([
      '<t>',
      JSON.stringify(`<>&"'AB${String.fromCodePoint(0x1f600)}`),
      '</t>',
    ]);
    expect(events('<t><![CDATA[<raw & "unescaped">]]></t>')).toEqual([
      '<t>',
      '"<raw & \\"unescaped\\">"',
      '</t>',
    ]);
  });

  it('normalises attribute whitespace but keeps character references', () => {
    expect(events('<a v="x\ty\nz" w="1&#10;2"/>')).toEqual([
      '<a v=x y z w=1\n2/>',
      '</a>',
    ]);
  });

  it('gives attributes no prototype', () => {
    let attributes: Readonly<Record<string, string>> = {};
    parseOgeXml('<a __proto__="x" constructor="y"/>', {
      open(_name, attrs) {
        attributes = attrs;
      },
    });
    expect(Object.getPrototypeOf(attributes)).toBeNull();
    expect(attributes['__proto__']).toBe('x');
    expect(attributes['constructor']).toBe('y');
    expect(({} as Record<string, unknown>)['x']).toBeUndefined();
  });

  it.each([
    ['<!DOCTYPE x [<!ENTITY a "b">]><x/>', 'doctype'],
    ['<!doctype x><x/>', 'doctype'],
    ['<x>&lol;</x>', 'entity'],
    ['<x>&#0;</x>', 'entity'],
    ['<x>&#xD800;</x>', 'entity'],
    ['<x a="&nope;"/>', 'entity'],
    ['<x>& unterminated</x>', 'entity'],
    ['<x></y>', 'mismatched-tag'],
    ['</x>', 'mismatched-tag'],
    ['<x><y></x>', 'mismatched-tag'],
    ['<x>', 'unclosed'],
    ['<x/><y/>', 'malformed'],
    ['text<x/>', 'malformed'],
    ['<x/>tail', 'malformed'],
    ['<x a=1/>', 'malformed'],
    ['<x a/>', 'malformed'],
    ['<x a="1" a="2"/>', 'malformed'],
    ['<x a="<"/>', 'malformed'],
    ['<x a="1', 'malformed'],
    ['<x / >', 'malformed'],
    ['<?xml version="1.0"', 'malformed'],
    ['<!-- never ends', 'malformed'],
    ['<x><![CDATA[ never ends</x>', 'malformed'],
    ['<!ELEMENT x ANY>', 'malformed'],
    ['<>', 'malformed'],
  ] as const)('refuses %j (%s)', (xml, code) => {
    expect(refusal(xml)).toBe(code);
  });

  it('caps the nesting depth', () => {
    const deep = '<a>'.repeat(20) + '</a>'.repeat(20);
    expect(refusal(deep)).toBeNull();
    expect(() => parseOgeXml(deep, {}, { maxDepth: 10 })).toThrow(OgeXmlError);
    expect(refusal('<a>'.repeat(300) + '</a>'.repeat(300))).toBe('depth');
  });

  it('reports where it stopped', () => {
    try {
      parseOgeXml('<x>  &bad;</x>', {});
    } catch (error) {
      expect(error).toBeInstanceOf(OgeXmlError);
      expect((error as OgeXmlError).offset).toBe(5);
    }
  });

  it('splits qualified names', () => {
    expect(ogeXmlLocalName('x14:dataBar')).toBe('dataBar');
    expect(ogeXmlLocalName('row')).toBe('row');
  });
});

describe('XML escaping', () => {
  it('escapes text and attribute values', () => {
    expect(escapeOgeXmlText('a < b & c > d "q"')).toBe(
      'a &lt; b &amp; c &gt; d "q"',
    );
    expect(escapeOgeXmlAttribute('say "hi"\tthen\nbye\r')).toBe(
      'say &quot;hi&quot;&#9;then&#10;bye&#13;',
    );
  });

  it('encodes what XML cannot carry the SpreadsheetML way', () => {
    expect(encodeOgeXstring('tab\there')).toBe('tab\there');
    expect(encodeOgeXstring(`bell${String.fromCharCode(7)}`)).toBe(
      'bell_x0007_',
    );
    expect(encodeOgeXstring('literal _x0041_ stays')).toBe(
      'literal _x005F_x0041_ stays',
    );
    expect(encodeOgeXstring(String.fromCharCode(0xd800))).toBe('_xD800_');
    expect(decodeOgeXstring('bell_x0007_')).toBe(
      `bell${String.fromCharCode(7)}`,
    );
    expect(decodeOgeXstring('literal _x005F_x0041_ stays')).toBe(
      'literal _x0041_ stays',
    );
    expect(decodeOgeXstring('plain')).toBe('plain');
  });

  it('round-trips any string through Xstring encoding and XML escaping', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 40 }), (value) => {
        const encoded = encodeOgeXstring(value);
        const xml = `<c t="${escapeOgeXmlAttribute(encoded)}">${escapeOgeXmlText(encoded)}</c>`;
        let attribute = '';
        let text = '';
        parseOgeXml(xml, {
          open(_name, attributes) {
            attribute = attributes['t'] ?? '';
          },
          text(chunk) {
            text += chunk;
          },
        });
        expect(decodeOgeXstring(attribute)).toBe(value);
        expect(decodeOgeXstring(text)).toBe(value);
      }),
    );
  });
});

describe('XML reader — properties', () => {
  it('throws nothing but OgeXmlError on arbitrary input', () => {
    const piece = fc.constantFrom(
      '<',
      '>',
      '/',
      '=',
      '"',
      "'",
      '&',
      ';',
      '!',
      '?',
      '[',
      ']',
      '-',
      'a',
      'b',
      ' ',
      '#',
      'x',
      'C',
      'DATA',
    );
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ maxLength: 30 }),
          fc.array(piece, { maxLength: 30 }).map((p) => p.join('')),
        ),
        (xml) => {
          try {
            const ignore = () => undefined;
            parseOgeXml(xml, { open: ignore, close: ignore, text: ignore });
          } catch (error) {
            expect(error).toBeInstanceOf(OgeXmlError);
          }
        },
      ),
      { numRuns: 3000 },
    );
  });

  it('stays linear on long adversarial input', () => {
    const inputs = [
      `<a>${'&amp;'.repeat(50000)}</a>`,
      `<a b="${'x'.repeat(200000)}"/>`,
      `<a>${'<b/>'.repeat(50000)}</a>`,
      `<a ${'c=" " '.repeat(20000)}/>`,
      '<'.repeat(100000),
      `<a><!--${'-'.repeat(100000)}`,
    ];
    const started = performance.now();
    for (const xml of inputs) {
      try {
        parseOgeXml(xml, {});
      } catch {
        // refusals are fine; time is what is measured
      }
    }
    expect(performance.now() - started).toBeLessThan(2000);
  });
});
