import { readBpmnXml } from './bpmn-xml-reader';
import { sanitizeBpmnOverlayHtml } from './overlay-html';
import {
  OGE_BPMN_TRUSTED_TYPES_POLICY,
  bpmnParserInput,
  resetBpmnTrustedTypesPolicyForTests,
} from './trusted-types';

/** A stand-in TrustedHTML: an object, like the real one, not a string. */
class FakeTrustedHTML {
  constructor(private readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

const XML =
  '<?xml version="1.0"?><definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"><process id="p"><startEvent id="s"/></process></definitions>';

describe('bpmn Trusted Types policy', () => {
  const g = globalThis as { trustedTypes?: unknown };
  let created: string[];
  let parsedInputs: unknown[];
  const originalParse = DOMParser.prototype.parseFromString;

  beforeEach(() => {
    created = [];
    parsedInputs = [];
    resetBpmnTrustedTypesPolicyForTests();
    g.trustedTypes = {
      createPolicy: (
        name: string,
        rules: { createHTML: (input: string) => string },
      ) => {
        created.push(name);
        return {
          createHTML: (input: string) =>
            new FakeTrustedHTML(rules.createHTML(input)),
        };
      },
    };
    // record what reaches the sink, then parse its string form as the
    // browser would a TrustedHTML
    vi.spyOn(DOMParser.prototype, 'parseFromString').mockImplementation(
      function (this: DOMParser, input: unknown, type: DOMParserSupportedType) {
        parsedInputs.push(input);
        return originalParse.call(this, String(input), type);
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete g.trustedTypes;
    resetBpmnTrustedTypesPolicyForTests();
  });

  it('passes TrustedHTML to DOMParser for overlay markup and XML', () => {
    const nodes = sanitizeBpmnOverlayHtml('<b>3</b>');
    expect(nodes).toMatchObject([{ tag: 'b' }]);
    const result = readBpmnXml(XML);
    expect(result.error).toBeUndefined();
    expect(parsedInputs).toHaveLength(2);
    for (const input of parsedInputs) {
      expect(input).toBeInstanceOf(FakeTrustedHTML);
    }
  });

  it('creates the policy once, lazily, under the documented name', () => {
    expect(created).toEqual([]);
    sanitizeBpmnOverlayHtml('<i>a</i>');
    sanitizeBpmnOverlayHtml('<i>b</i>');
    readBpmnXml(XML);
    expect(created).toEqual([OGE_BPMN_TRUSTED_TYPES_POLICY]);
    expect(OGE_BPMN_TRUSTED_TYPES_POLICY).toBe('oge-ui#bpmn');
  });

  it('returns the input unchanged through the policy', () => {
    expect(String(bpmnParserInput('<p onclick="x">a</p>'))).toBe(
      '<p onclick="x">a</p>',
    );
  });

  it('falls back to a plain string when the policy name is refused', () => {
    g.trustedTypes = {
      createPolicy: () => {
        throw new TypeError('policy not allowed');
      },
    };
    expect(bpmnParserInput('<b>x</b>')).toBe('<b>x</b>');
    expect(sanitizeBpmnOverlayHtml('<b>x</b>')).toMatchObject([{ tag: 'b' }]);
  });

  it('passes plain strings without trustedTypes', () => {
    delete g.trustedTypes;
    resetBpmnTrustedTypesPolicyForTests();
    expect(bpmnParserInput('<b>x</b>')).toBe('<b>x</b>');
  });
});
