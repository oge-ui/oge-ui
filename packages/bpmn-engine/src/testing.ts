// @oge-ui/bpmn-engine/testing — BPMN 2.0 sample documents for tests.
//
// The fixtures the engine's own specs and both render layers' specs load:
// the same order process in every prefix convention, a collaboration with
// pools and lanes, colored elements, DI-less documents and camunda-flavored
// files. Published as a secondary entry so an app's own tests can use real
// documents without shipping them in the main bundle.
export {
  CAMUNDA_FIXTURE_XML,
  COLLABORATION_FIXTURE_XML,
  COLORED_FIXTURE_XML,
  CDATA_FIXTURE_XML,
  DEMO_EXPECTED_MODEL,
  FOREIGN_FIXTURE_XML,
  MULTI_PROCESS_FIXTURE_XML,
  NO_DI_FIXTURE_XML,
  PRESERVE_FIXTURE_XML,
  V03_FIXTURE_XML,
  V04_FIXTURE_XML,
  demoProcessXml,
} from './lib/xml-fixtures';
