import * as engine from './index';
import * as testing from './testing';

/**
 * The barrel IS both render layers' whole import surface (ADR 0003): an
 * export that quietly disappears breaks the Angular or React editor without
 * failing one engine spec. Guard the runtime values they rely on.
 */
describe('@oge-ui/bpmn-engine barrel', () => {
  it.each([
    'OgeBpmnEditorCore',
    'createPlainBpmnReactivity',
    'OGE_DEFAULT_BPMN_CONFIG',
    'OGE_DEFAULT_BPMN_MESSAGES',
    'OGE_DEFAULT_BPMN_COLOR_PRESETS',
    'OGE_DEFAULT_BPMN_PALETTE_ITEMS',
    'resolveOgeBpmnConfig',
    'bpmnPaletteNavIndex',
    'buildBpmnPropertiesModel',
    'bpmnFieldKey',
    'sanitizeBpmnOverlayHtml',
    'bpmnOverlayLinkRel',
    'OGE_BPMN_TRUSTED_TYPES_POLICY',
    'readBpmnXml',
    'writeBpmnXml',
    'toBpmnJson',
    'fromBpmnJson',
    'renderDiagramSvg',
    'createEmptyDiagram',
    'alignElements',
    'distributeElements',
    'VALID_EVENT_DEFINITIONS',
    'BpmnCommandStack',
    'lintBpmnDiagram',
    'OGE_BPMN_DEFAULT_LINT_RULES',
    'resolveBpmnLintRules',
    'OGE_BPMN_DEFAULT_PROPERTIES_PROVIDERS',
    'OGE_BPMN_CAMUNDA_PROVIDERS',
    'buildBpmnPropertiesGroups',
    'bpmnElementTemplatesProvider',
    'applyElementTemplateCommand',
    'bpmnSvg',
    'sanitizeBpmnSvg',
    'moveToContainerCommand',
    'reparentElementsCommand',
    'setDocumentationCommand',
    'setEventDetailsCommand',
    'fillBpmnMessages',
  ])('exports %s', (name) => {
    expect((engine as Record<string, unknown>)[name]).toBeDefined();
  });

  it('keeps the fixtures on the testing entry only', () => {
    expect(typeof testing.demoProcessXml).toBe('function');
    expect(
      (engine as Record<string, unknown>)['demoProcessXml'],
    ).toBeUndefined();
  });

  it('resolves a partial config over the defaults, messages one level deep', () => {
    const config = engine.resolveOgeBpmnConfig({
      gridSize: 20,
      messages: { emptyText: 'Boş' },
    });
    expect(config.gridSize).toBe(20);
    expect(config.messages.emptyText).toBe('Boş');
    expect(config.messages.canvasLabel).toBe(
      engine.OGE_DEFAULT_BPMN_MESSAGES.canvasLabel,
    );
  });
});
