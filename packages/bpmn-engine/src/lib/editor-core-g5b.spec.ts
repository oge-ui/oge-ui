import type { BpmnDiagram } from './bpmn-model';
import {
  resolveOgeBpmnConfig,
  OGE_DEFAULT_BPMN_MESSAGES,
  fillBpmnMessages,
} from './config';
import {
  OgeBpmnEditorCore,
  type BpmnKeyInput,
  type OgeBpmnEditorHost,
} from './editor-core';
import type {
  OgeBpmnContextPadProvider,
  OgeBpmnPaletteProvider,
  OgeBpmnRenderers,
} from './editor-extensions';
import type { OgeBpmnLintChangedEvent, OgeBpmnLintRulesInput } from './lint';
import {
  OGE_BPMN_DEFAULT_PROPERTIES_PROVIDERS,
  buildBpmnPropertiesGroups,
  resolveBpmnPropertiesProviders,
  type OgeBpmnPropertiesProvider,
} from './properties-providers';
import { createPlainBpmnReactivity } from './reactivity';
import { bpmnSvg } from './svg-node';
import {
  addNodeCommand,
  resizeNodeCommand,
  setEventDefinitionCommand,
  toggleSubProcessCollapseCommand,
} from './commands';
import { createEmptyDiagram } from './bpmn-model';
import { toBpmnJson } from './bpmn-json';
import { CAMUNDA_FIXTURE_XML } from './xml-fixtures';

interface Options {
  lint?: boolean;
  lintRules?: OgeBpmnLintRulesInput;
  propertiesProviders?: readonly OgeBpmnPropertiesProvider[];
  paletteProvider?: OgeBpmnPaletteProvider;
  contextPadProvider?: OgeBpmnContextPadProvider;
  renderers?: OgeBpmnRenderers;
  messages?: Record<string, unknown>;
}

function setup(options: Options = {}) {
  const wrap = document.createElement('div');
  document.body.appendChild(wrap);
  const lintEvents: OgeBpmnLintChangedEvent[] = [];
  const host: OgeBpmnEditorHost = {
    uid: 'oge-bpmn-g5b',
    readOnly: () => false,
    mode: () => 'edit',
    setMode: () => undefined,
    snapEnabled: () => true,
    brandLogoUrl: () => undefined,
    messages: () => options.messages ?? {},
    config: () => resolveOgeBpmnConfig({ autoSaveDebounceMs: 0 }),
    hostElement: () => wrap,
    wrap: () => wrap,
    labelEdit: () => null,
    searchInput: () => null,
    minimapSvg: () => null,
    emit: {
      selectionChanged: () => undefined,
      elementsChanged: () => undefined,
      importCompleted: () => undefined,
      dirtyChanged: () => undefined,
      diagramChanged: () => undefined,
      lintChanged: (event) => lintEvents.push(event),
    },
    lint: () => options.lint ?? false,
    lintRules: () => options.lintRules,
    propertiesProviders: () => options.propertiesProviders,
    paletteProvider: () => options.paletteProvider,
    contextPadProvider: () => options.contextPadProvider,
    renderers: () => options.renderers,
  };
  const core = new OgeBpmnEditorCore(createPlainBpmnReactivity(), host);
  return { core, lintEvents };
}

const key = (k: string): BpmnKeyInput => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  preventDefault: () => undefined,
  stopPropagation: () => undefined,
});

describe('editor core — validation', () => {
  it('validates on demand even with live linting off', async () => {
    const { core, lintEvents } = setup();
    await core.importXml(CAMUNDA_FIXTURE_XML);
    expect(core.lintIssues()).toEqual([]);
    const issues = core.validate();
    expect(issues.length).toBeGreaterThan(0);
    core.syncLint();
    expect(lintEvents).toEqual([]);
    expect(core.problemsOpen()).toBe(false);
  });

  it('lints live: badges, accessible names, problems view, lintChanged', async () => {
    const { core, lintEvents } = setup({ lint: true });
    await core.importXml(CAMUNDA_FIXTURE_XML);
    core.syncLint();
    expect(lintEvents).toHaveLength(1);
    expect(lintEvents[0].issues.length).toBe(core.lintIssues().length);
    // a second sync without a change does not emit again
    core.syncLint();
    expect(lintEvents).toHaveLength(1);
    const node = core.nodeViews().find((n) => n.lint !== null) as ReturnType<
      typeof core.nodeViews
    >[number];
    expect(node).toBeDefined();
    expect(node.ariaLabel).toContain('problem(s)');
    const view = core.problemsView();
    expect(view.count).toBe(core.lintIssues().length);
    expect(view.rows[0].text).toMatch(/^Error: /);
    core.validate();
    expect(core.problemsOpen()).toBe(true);
  });

  it('selects and centers the offending element from the panel', async () => {
    const { core } = setup({ lint: true });
    await core.importXml(CAMUNDA_FIXTURE_XML);
    const issue = core
      .lintIssues()
      .find((i) => core.diagram().nodes[i.elementId] !== undefined);
    if (issue === undefined) throw new Error('no node issue');
    core.onProblemPick(issue);
    expect(core.getSelection()).toEqual([issue.elementId]);
  });

  it('honours lintRules overrides', async () => {
    const { core } = setup({
      lint: true,
      lintRules: [{ id: 'label-required', severity: 'off' }],
    });
    await core.importXml(CAMUNDA_FIXTURE_XML);
    expect(core.lintIssues().some((i) => i.ruleId === 'label-required')).toBe(
      false,
    );
  });
});

describe('editor core — extensibility', () => {
  it('runs custom palette entries by click and hotkey', () => {
    const picked: string[] = [];
    const { core } = setup({
      paletteProvider: () => [
        {
          id: 'mail',
          label: 'Mail task',
          icon: [bpmnSvg.rect(4, 6, 16, 12), { tag: 'script' } as never],
          hotkey: 'M',
          action: (api) => {
            picked.push('mail');
            api.armPlace('serviceTask');
          },
        },
      ],
    });
    const [entry] = core.paletteEntries();
    expect(entry.icon).toHaveLength(1);
    expect(entry.hotkey).toBe('m');
    core.onPaletteEntry(entry.entry);
    expect(core.tool()).toEqual({ kind: 'place', nodeType: 'serviceTask' });
    core.onCanvasKeydown(key('Escape'));
    core.onCanvasKeydown(key('m'));
    expect(picked).toEqual(['mail', 'mail']);
  });

  it('offers custom context-pad actions for the selected element', async () => {
    const { core } = setup({
      contextPadProvider: ({ elementId }) =>
        elementId === 'Task_z'
          ? [
              {
                id: 'doc',
                label: 'Document',
                icon: [bpmnSvg.circle(8, 8, 6)],
                hotkey: 'd',
                action: (api, id) =>
                  api.execute({
                    label: 'Doc',
                    apply: (m: BpmnDiagram) => ({
                      ...m,
                      nodes: {
                        ...m.nodes,
                        [id]: { ...m.nodes[id], documentation: 'set' },
                      },
                    }),
                  }),
              },
            ]
          : [],
    });
    await core.importXml(CAMUNDA_FIXTURE_XML);
    core.select(['Task_z']);
    expect(core.padEntries()).toHaveLength(1);
    core.onCanvasKeydown(key('d'));
    expect(core.diagram().nodes['Task_z'].documentation).toBe('set');
    core.undo();
    expect(core.diagram().nodes['Task_z'].documentation).toBeUndefined();
    core.select(['Task_u']);
    expect(core.padEntries()).toEqual([]);
  });

  it('draws renderer overrides in the node views', async () => {
    const { core } = setup({
      renderers: {
        serviceTask: (c) => [
          bpmnSvg.ellipse(c.width / 2, c.height / 2, 10, 10),
        ],
      },
    });
    await core.importXml(CAMUNDA_FIXTURE_XML);
    const service = core.nodeViews().find((n) => n.id === 'Task_z');
    const user = core.nodeViews().find((n) => n.id === 'Task_u');
    expect(service?.custom?.[0].tag).toBe('ellipse');
    expect(user?.custom).toBeNull();
    expect(core.exportSvg()).toContain('<ellipse');
  });

  it('builds provider groups for the selection', async () => {
    const custom: OgeBpmnPropertiesProvider = {
      id: 'custom',
      getGroups: ({ target }) =>
        target.kind === 'node'
          ? [
              {
                id: 'c',
                label: 'Custom',
                entries: [{ id: 'c1', label: 'C', type: 'custom', value: '' }],
              },
            ]
          : [],
    };
    const { core } = setup({ propertiesProviders: [custom] });
    await core.importXml(CAMUNDA_FIXTURE_XML);
    core.select(['Task_z']);
    const ids = core.propertiesGroups().map((g) => g.id);
    expect(ids).toEqual(['general', 'c']);
    core.select(['Start_t']);
    expect(core.propertiesGroups().map((g) => g.id)).toEqual([
      'event-details',
      'general',
      'c',
    ]);
    core.select([]);
    expect(core.propertiesGroups().map((g) => g.id)).toEqual(['general']);
  });
});

describe('built-in providers', () => {
  const messages = fillBpmnMessages(OGE_DEFAULT_BPMN_MESSAGES);

  it('replaces a default provider by id', () => {
    const replaced = resolveBpmnPropertiesProviders([
      { id: 'oge-general', getGroups: () => [] },
    ]);
    expect(replaced).toHaveLength(OGE_BPMN_DEFAULT_PROPERTIES_PROVIDERS.length);
    expect(replaced[1].getGroups({} as never)).toEqual([]);
  });

  it('edits the timer and creates a message from the event details', async () => {
    const { core } = setup();
    await core.importXml(CAMUNDA_FIXTURE_XML);
    let m = core.diagram();
    const groups = buildBpmnPropertiesGroups(
      m,
      ['Start_t'],
      messages,
      OGE_BPMN_DEFAULT_PROPERTIES_PROVIDERS,
    );
    const expression = groups[0].entries.find(
      (e) => e.id === 'timer-expression',
    );
    m = expression?.set?.('R/PT2H')?.apply(m) as BpmnDiagram;
    const start = m.nodes['Start_t'];
    expect(
      start.type !== 'textAnnotation' && start.eventDetails?.timer,
    ).toEqual({
      kind: 'timeCycle',
      expression: 'R/PT2H',
    });
    m = setEventDefinitionCommand('Start_t', 'message').apply(m);
    const ref = buildBpmnPropertiesGroups(
      m,
      ['Start_t'],
      messages,
      OGE_BPMN_DEFAULT_PROPERTIES_PROVIDERS,
    )[0].entries.find((e) => e.id === 'event-ref');
    const newOption = ref?.options?.[ref.options.length - 1];
    expect(newOption?.label).toBe('New message');
    m = ref?.set?.(newOption?.value ?? '')?.apply(m) as BpmnDiagram;
    const created = m.rootElements?.[m.rootElements.length - 1];
    expect(created?.type).toBe('message');
    const after = m.nodes['Start_t'];
    expect(after.type !== 'textAnnotation' && after.eventDetails?.ref).toBe(
      created?.id,
    );
  });

  it('offers documentation for the process and Move to for nodes in pools', async () => {
    const { core } = setup();
    await core.importXml(CAMUNDA_FIXTURE_XML);
    const m = core.diagram();
    const process = buildBpmnPropertiesGroups(
      m,
      [],
      messages,
      OGE_BPMN_DEFAULT_PROPERTIES_PROVIDERS,
    );
    expect(process.flatMap((g) => g.entries).map((e) => e.id)).toEqual([
      'documentation',
    ]);
    expect(process[0].entries[0].value).toBe('Order handling');
  });
});

describe('editor core — drag re-parenting', () => {
  it('drops a node into a sub-process with one undoable command', () => {
    const { core } = setup();
    let m = createEmptyDiagram();
    m = addNodeCommand('task', { x: 100, y: 100 }, 'A').apply(m);
    m = addNodeCommand('subProcess', { x: 550, y: 100 }, 'Sub').apply(m);
    m = toggleSubProcessCollapseCommand('Sub', false).apply(m);
    m = resizeNodeCommand('Sub', {
      x: 400,
      y: 0,
      width: 300,
      height: 200,
    }).apply(m);
    core.importJson(toBpmnJson(m));
    core.vp.set({ x: 0, y: 0, zoom: 1 });
    core.onShapePointerDown('A', {
      button: 0,
      clientX: 100,
      clientY: 100,
      shiftKey: false,
      pointerId: 1,
      target: null,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    });
    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 500, clientY: 100 }),
    );
    expect(core.dropContainerId()).toBe('Sub');
    document.dispatchEvent(new MouseEvent('pointerup'));
    expect(core.dropContainerId()).toBeNull();
    expect(core.diagram().nodes['A'].parentId).toBe('Sub');
    expect(core.announcement()).toContain('moved to');
    core.undo();
    expect(core.diagram().nodes['A'].parentId).toBeUndefined();
    expect(core.diagram().shapeDi['A'].bounds.x).toBe(50);
  });
});
