import { readBpmnXml } from './bpmn-xml-reader';
import { writeBpmnXml } from './bpmn-xml-writer';
import {
  CDATA_FIXTURE_XML,
  COLLABORATION_FIXTURE_XML,
  COLORED_FIXTURE_XML,
  demoProcessXml,
  FOREIGN_FIXTURE_XML,
  NO_DI_FIXTURE_XML,
  PRESERVE_FIXTURE_XML,
  V04_FIXTURE_XML,
} from './xml-fixtures';

const FIXTURES: readonly (readonly [string, string])[] = [
  ['bpmn:-prefixed demo process', demoProcessXml('bpmn')],
  ['bpmn2:-prefixed demo process', demoProcessXml('bpmn2')],
  ['default-namespace demo process', demoProcessXml('')],
  ['camunda-flavored foreign fixture', FOREIGN_FIXTURE_XML],
  ['collaboration fixture', COLLABORATION_FIXTURE_XML],
  ['DI-less fixture', NO_DI_FIXTURE_XML],
  ['CDATA condition fixture', CDATA_FIXTURE_XML],
  ['bioc-colored fixture', COLORED_FIXTURE_XML],
  ['v0.4 collaboration fixture', V04_FIXTURE_XML],
  ['v0.5 attribute-preservation fixture', PRESERVE_FIXTURE_XML],
];

describe('bpmn-xml round trip', () => {
  for (const [name, xml] of FIXTURES) {
    describe(name, () => {
      it('re-reads its own output into an equal model and writes idempotently', () => {
        const first = readBpmnXml(xml);
        expect(first.error).toBeUndefined();
        const m1 = first.model;
        if (m1 === null) {
          throw new Error('first read produced no model');
        }

        const x2 = writeBpmnXml(m1);
        const second = readBpmnXml(x2);
        expect(second.error).toBeUndefined();
        const m2 = second.model;
        if (m2 === null) {
          throw new Error('second read produced no model');
        }

        expect(m2).toEqual(m1);
        expect(writeBpmnXml(m2)).toBe(x2);
      });
    });
  }
});
