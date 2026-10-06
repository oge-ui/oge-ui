import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/bpmn/src/lib/** — keep in sync with the source
 * TSDoc when the public API changes.
 */

export const OGE_BPMN_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'readOnly',
          type: 'boolean',
          default: 'false',
          description:
            'Disables every mutation: palette, context pad, keyboard editing and drags. Selection, pan, zoom and element search keep working.',
        },
        {
          name: 'gridVisible',
          type: 'boolean',
          default: 'true',
          description: 'Shows the dotted background grid.',
        },
        {
          name: 'snapEnabled',
          type: 'boolean',
          default: 'true',
          description:
            'Enables grid and neighbor-alignment snapping (with guide lines) while moving and placing.',
        },
        {
          name: 'paletteItems',
          type: 'readonly BpmnPaletteItemType[]',
          default: 'all 18 entries',
          description:
            'Palette entries offered, in render order: every placeable node type plus the <code>&#39;pool&#39;</code> pseudo-entry, which creates a collaboration participant. Event sub-processes and transactions are reached by morphing a sub-process via the panel type select.',
        },
        {
          name: 'showPropertiesPanel',
          type: 'boolean',
          default: 'true',
          description:
            'Shows the right-side properties panel (always hidden in <code>readOnly</code>).',
        },
        {
          name: 'showMinimap',
          type: 'boolean',
          default: 'true',
          description:
            'Shows the bottom-right minimap overlay (hidden while the diagram is empty). Click or drag the minimap to pan the main viewport.',
        },
        {
          name: 'showHeader',
          type: 'boolean',
          default: 'true',
          description:
            'Shows the header toolbar: the inline-editable diagram name, undo/redo, zoom out / percentage (fit) / zoom in, the properties-panel collapse toggle, the optional edit/view mode toggle and the fullscreen button (native Fullscreen API with a fixed-position maximized fallback).',
        },
        {
          name: 'mode',
          type: "model&lt;'edit' | 'view'&gt;",
          default: "'edit'",
          description:
            "The UI mode — two-way. <code>'view'</code> locks every mutating surface exactly like <code>readOnly</code>; zoom, pan, search and fullscreen stay available.",
        },
        {
          name: 'allowModeToggle',
          type: 'boolean',
          default: 'false',
          description:
            'Shows the edit/view toggle in the header (hidden while <code>readOnly</code> — the app-level lock always wins).',
        },
        {
          name: 'showBranding',
          type: 'boolean',
          default: 'true',
          description:
            "The badge in the canvas corner — a bare logo with no chrome, removable exclusively from code via <code>false</code>. Branding is a courtesy, never a license term (unlike bpmn-js's mandatory watermark).",
        },
        {
          name: 'brandLogoUrl',
          type: 'string | undefined',
          description:
            'Badge image URL (per instance, or app-wide via <code>provideOgeBpmnConfig({ brandLogoUrl })</code>); unset renders the built-in drawn mark — no bundled bitmap, no network dependency by default.',
        },
        {
          name: 'Panel resizing',
          type: 'built-in',
          description:
            'The palette rail and the properties panel carry <code>role="separator"</code> drag handles — pointer drag (Escape cancels) or Tab + Arrow keys / Home / End, the APG window-splitter keys. The header panel-toggle collapses the properties panel entirely.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeBpmnMessages&gt;',
          default: '{}',
          description:
            'Per-instance message overrides, merged over the <code>provideOgeBpmnConfig()</code> defaults.',
        },
        {
          name: 'zoom',
          type: 'model&lt;number&gt;',
          default: '1',
          description:
            'Two-way zoom factor (<code>[(zoom)]</code>); wheel zooming writes it back. Clamped to the configured <code>zoomMin</code>/<code>zoomMax</code>.',
        },
        {
          name: 'lint',
          type: 'boolean',
          default: 'false',
          description:
            'Live validation: every model change re-runs the rules, offending shapes, pools and flows get a severity badge (the problem text is appended to their accessible name, the badge itself is <code>aria-hidden</code>), the header shows a problems toggle with the count and the problems panel lists every issue — click or Enter selects the element and pans it into view. <code>validate()</code> works with it off.',
        },
        {
          name: 'lintRules',
          type: 'OgeBpmnLintRulesInput',
          description:
            'Rules merged with <code>OGE_BPMN_DEFAULT_LINT_RULES</code>: a full rule (<code>{ id, severity, check(model, context) }</code>) is added, or replaces the built-in with the same id; an override re-grades one (<code>{ id: &#39;no-implicit-split&#39;, severity: &#39;info&#39; }</code>) or disables it (<code>severity: &#39;off&#39;</code>).',
        },
        {
          name: 'propertiesProviders',
          type: 'readonly OgeBpmnPropertiesProvider[]',
          description:
            'Pluggable properties panel: each provider returns groups of typed entries (<code>text</code>, <code>textarea</code>, <code>select</code>, <code>checkbox</code>, <code>expression</code>, <code>list</code>, <code>custom</code>) for the selected element (or the process), and every entry&#39;s <code>set(value)</code> returns the undoable command to run. Merged with <code>OGE_BPMN_DEFAULT_PROPERTIES_PROVIDERS</code> by id — reuse an id to replace a built-in. Pass <code>OGE_BPMN_CAMUNDA_PROVIDERS</code> for the Camunda 7 / Zeebe fields or <code>bpmnElementTemplatesProvider(templates)</code> for element templates.',
        },
        {
          name: 'paletteProvider',
          type: 'OgeBpmnPaletteProvider',
          description:
            'Custom palette entries after the built-ins: <code>{ id, label, icon, hotkey?, action(api) }</code>. Icons are <code>bpmnSvg</code> trees (sanitized — no markup path); the entries join the palette&#39;s roving tabindex; a single-character <code>hotkey</code> works on the canvas (keys the canvas already uses are ignored); <code>api.armPlace(type, { template })</code> arms click-then-place.',
        },
        {
          name: 'contextPadProvider',
          type: 'OgeBpmnContextPadProvider',
          description:
            'Custom context-pad actions of the single selected element: <code>({ diagram, elementId }) =&gt; OgeBpmnContextPadEntry[]</code>, each <code>{ id, label, icon, hotkey?, action(api, elementId) }</code> — real buttons with <code>aria-keyshortcuts</code>; <code>api.execute(command)</code> keeps every change undoable.',
        },
        {
          name: 'renderers',
          type: 'OgeBpmnRenderers',
          description:
            'Per-type shape overrides: <code>{ serviceTask: ({ node, width, height, fill, stroke }) =&gt; bpmnSvg nodes | null }</code>. The returned tree replaces the built-in glyph (labels, markers, selection and badges are still drawn) in the canvas and in <code>exportSvg()</code> / <code>exportPng()</code>; <code>null</code> or a throwing renderer falls back to the built-in shape.',
        },
      ],
    },
    {
      title: 'Custom properties entries',
      entries: [
        {
          name: 'OgeBpmnPropertiesEntryTemplate ([ogeBpmnPropertiesEntry])',
          type: 'ng-template directive',
          description:
            'Draws a provider entry of type <code>custom</code> whose id matches: <code>&lt;ng-template ogeBpmnPropertiesEntry="sla" let-entry let-commit="commit" let-id="inputId"&gt;</code>. The context (<code>OgeBpmnPropertiesEntryContext</code>) carries the entry, <code>commit(value)</code> (one undoable command through the entry&#39;s <code>set</code>) and the id the entry&#39;s label carries for <code>aria-labelledby</code>.',
        },
      ],
    },
    {
      title: 'Canvas keyboard',
      entries: [
        {
          name: 'role="application" canvas',
          type: 'Tab / Shift+Tab · arrows (Shift = 1px) · C · A · H / L / S · F2 / Enter · Delete · Ctrl+Z / Ctrl+Y · Ctrl+C / Ctrl+X / Ctrl+V · Ctrl+A · Ctrl+F · + / − / F · Escape',
          description:
            'Tab cycles elements (never trapped on an empty selection — leave with Escape then Tab, announced in the canvas hint), arrows move the selection by one grid step, <code>C</code> arms the connect tool (Tab/arrows walk candidate targets, Enter commits), <code>A</code> appends a connected task, <code>H</code>/<code>L</code>/<code>S</code> switch to the hand / lasso / space tool (edit mode only), <code>F</code> zooms to fit, <code>F2</code>/Enter edit the label, Ctrl+C/X/V copy/cut/paste via the internal clipboard, Ctrl+A selects all, Ctrl+F opens the element search overlay, Escape cancels the active tool or drag. The selected element is exposed via <code>aria-activedescendant</code> and every action is narrated in a polite live region.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Import & export',
      entries: [
        {
          name: 'importXml(xml: string)',
          type: 'Promise&lt;BpmnImportResult&gt;',
          description:
            'Parses BPMN XML and loads it into the editor, resetting undo history and fitting the viewport. Resolves with the import result (model + warnings); on a fatal parse error the current diagram is left untouched.',
        },
        {
          name: 'exportXml()',
          type: 'string',
          description:
            'Serializes the current diagram to deterministic BPMN 2.0 XML — same model, same bytes.',
        },
        {
          name: 'exportJson()',
          type: 'BpmnDiagramJson',
          description:
            'Wraps the current diagram in the versioned JSON persistence envelope — the shape to store in an application database and the payload of the <code>diagramChanged</code> autosave stream.',
        },
        {
          name: 'importJson(value: unknown)',
          type: '{ error?: string }',
          description:
            'Validates a JSON persistence envelope (see <code>fromBpmnJson</code>) and loads it, resetting undo history and fitting the viewport exactly like <code>importXml</code>. On a validation error the current diagram is left untouched and the error message is returned.',
        },
        {
          name: 'exportSvg()',
          type: 'string',
          description:
            'Renders the current diagram as a self-contained static SVG string (neutral hardcoded colors, no grid or selection, <code>viewBox</code> fitted to the content) via <code>renderDiagramSvg</code> — writable to a file or embeddable as-is.',
        },
        {
          name: 'exportPng(options?: OgeBpmnPngExportOptions)',
          type: 'Promise&lt;Blob | null&gt;',
          description:
            'Rasterizes the SVG export onto a canvas and resolves a PNG blob (<code>pixelRatio</code> default 2, <code>background</code> default white, <code>padding</code>) — no library, nothing leaves the page. Resolves <code>null</code> where there is no canvas (server rendering, jsdom).',
        },
        {
          name: 'newDiagram()',
          type: 'void',
          description:
            'Replaces the diagram with an empty one and resets history and viewport.',
        },
      ],
    },
    {
      title: 'Validation',
      entries: [
        {
          name: 'validate()',
          type: 'readonly OgeBpmnLintIssue[]',
          description:
            'Runs the effective rules (built-ins plus <code>lintRules</code>) over the current diagram and returns every issue, errors first — whether or not <code>lint</code> is on; with it on, the problems panel opens too.',
        },
      ],
    },
    {
      title: 'Selection, history & navigation',
      entries: [
        {
          name: 'zoomToFit()',
          type: 'void',
          description: 'Fits and centers the whole diagram in the canvas.',
        },
        {
          name: 'centerOn(id: string)',
          type: 'void',
          description:
            'Pans the viewport (keeping the current zoom) so the given element is centered in the canvas. Unknown ids are ignored. Used by the element search overlay; public for app-driven navigation.',
        },
        {
          name: 'select(ids: readonly string[])',
          type: 'void',
          description:
            'Selects the given element ids, pools included (unknown ids are ignored).',
        },
        {
          name: 'getSelection()',
          type: 'readonly string[]',
          description: 'The currently selected element ids.',
        },
        {
          name: 'deleteSelection()',
          type: 'void',
          description:
            'Deletes the selected elements, cascading to their attached edges and clearing orphaned default-flow markers.',
        },
        {
          name: 'undo() / redo()',
          type: 'void',
          description:
            'Undoes / re-applies the most recent command. Snapshot-based: each command — including every arrow-key step — is exactly one entry.',
        },
        {
          name: 'canUndo() / canRedo()',
          type: 'boolean',
          description: 'Whether at least one command can be undone / redone.',
        },
        {
          name: 'isDirty()',
          type: 'boolean',
          description: 'True when the model differs from the last save point.',
        },
        {
          name: 'markSaved()',
          type: 'void',
          description:
            'Marks the current model as saved; <code>isDirty()</code> reports false until the model changes again.',
        },
        {
          name: 'focus()',
          type: 'void',
          description: 'Moves keyboard focus onto the diagram canvas.',
        },
      ],
    },
    {
      title: 'Overlays',
      entries: [
        {
          name: 'addOverlay(overlay: OgeBpmnOverlay)',
          type: 'string',
          description:
            'Attaches an HTML badge to a diagram element and returns a handle for <code>removeOverlay</code>. The badge tracks the element through pan/zoom and model changes; a dangling <code>elementId</code> hides it without removing the registration. The <code>html</code> renders through Angular&#39;s sanitizing <code>[innerHTML]</code> binding.',
        },
        {
          name: 'removeOverlay(id: string)',
          type: 'void',
          description:
            'Removes the overlay registered under the given handle. Unknown handles are ignored.',
        },
        {
          name: 'clearOverlays(elementId?: string)',
          type: 'void',
          description:
            'Removes every registered overlay, or — when <code>elementId</code> is given — only the overlays attached to that element.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'selectionChanged',
          type: 'OgeBpmnSelectionEvent',
          description:
            'The selection changed (user interaction or <code>select()</code>): <code>{ ids, elements }</code> with per-element <code>{ id, type, name? }</code> summaries.',
        },
        {
          name: 'elementsChanged',
          type: 'OgeBpmnElementsChangedEvent',
          description:
            'The diagram model changed: <code>{ source, label }</code>, where <code>source</code> is <code>execute | undo | redo | import | new</code> and <code>label</code> is the command label.',
        },
        {
          name: 'diagramChanged',
          type: 'OgeBpmnDiagramChangedEvent',
          description:
            'Debounced autosave stream: after model changes settle for <code>autoSaveDebounceMs</code> (default 500ms; <code>0</code> emits synchronously) the diagram is serialized once to both JSON and XML and emitted together with the change source. Emitted for every source including <code>import</code> and <code>new</code> — filter on <code>source</code> to persist only user edits. No serialization happens mid-drag (gestures commit one command on release); a pending emission is cancelled on destroy.',
        },
        {
          name: 'importCompleted',
          type: 'OgeBpmnImportEvent',
          description:
            'An <code>importXml()</code> call finished parsing; carries the fidelity warnings (<code>{ warnings }</code>) — emitted on fatal errors too.',
        },
        {
          name: 'dirtyChanged',
          type: 'boolean',
          description:
            'The dirty state flipped — the model diverged from, or returned to, the save point.',
        },
        {
          name: 'lintChanged',
          type: 'OgeBpmnLintChangedEvent',
          description:
            'The live validation result changed (only while <code>lint</code> is on): <code>{ issues, errors, warnings, infos }</code>. Emitted once after an import and after every edit that changes the issue list.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Event payloads & overlays',
      entries: [
        {
          name: 'OgeBpmnSelectionEvent',
          type: '{ ids: readonly string[]; elements: readonly OgeBpmnElementInfo[] }',
          description: 'Payload of <code>selectionChanged</code>.',
        },
        {
          name: 'OgeBpmnElementInfo',
          type: "{ id: string; type: BpmnNodeType | BpmnEdgeType | 'pool'; name?: string }",
          description:
            'Summary of one diagram element carried in editor event payloads.',
        },
        {
          name: 'OgeBpmnElementsChangedEvent',
          type: '{ source: OgeBpmnChangeSource; label: string }',
          description:
            'Payload of <code>elementsChanged</code>: what changed the model and the command label.',
        },
        {
          name: 'OgeBpmnChangeSource',
          type: "'execute' | 'undo' | 'redo' | 'import' | 'new'",
          description:
            'Origin of a model change reported by <code>elementsChanged</code> and <code>diagramChanged</code>.',
        },
        {
          name: 'OgeBpmnDiagramChangedEvent',
          type: '{ json: BpmnDiagramJson; xml: string; source: OgeBpmnChangeSource }',
          description:
            'Payload of the debounced <code>diagramChanged</code> autosave stream: the diagram in both persistence formats plus what caused the change.',
        },
        {
          name: 'OgeBpmnImportEvent',
          type: '{ warnings: readonly BpmnImportWarning[] }',
          description:
            'Payload of <code>importCompleted</code>: the fidelity warnings collected during import.',
        },
        {
          name: 'OgeBpmnOverlay',
          type: "{ elementId: string; html: string; position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'; offset?: Point }",
          description:
            'A programmatic HTML badge attached to a diagram element (process-monitoring overlays), registered via <code>addOverlay()</code>. <code>position</code> picks which corner (or the center) of the element&#39;s bounds the badge anchors to; <code>offset</code> is extra diagram-unit displacement applied before the screen transform. <code>html</code> is bound through Angular&#39;s sanitizing <code>[innerHTML]</code> — script tags and inline event handlers are stripped; a link that keeps <code>target</code> always gets <code>rel="noopener noreferrer"</code> and <code>role</code> is dropped, matching the React layer.',
        },
        {
          name: 'OgeBpmnPaletteItem',
          type: '{ type: BpmnPaletteItemType }',
          description: 'One entry of the elements palette.',
        },
        {
          name: 'BpmnPaletteItemType',
          type: "BpmnNodeType | 'pool'",
          description:
            'Everything the palette can place: node types plus the <code>&#39;pool&#39;</code> pseudo-entry, which creates a collaboration participant.',
        },
      ],
    },
    {
      title: 'Engine — import & export',
      entries: [
        {
          name: 'readBpmnXml(xml: string)',
          type: 'BpmnImportResult',
          description:
            'Standalone, prefix-agnostic BPMN 2.0 reader (<code>bpmn:</code>, <code>bpmn2:</code> or no prefix) — pure TypeScript, usable outside the component. Missing DI is auto-laid-out with a warning.',
        },
        {
          name: 'writeBpmnXml(model: BpmnDiagram)',
          type: 'string',
          description:
            'Standalone byte-deterministic BPMN 2.0 writer with fixed, normalized prefixes; preserved <code>extensionElements</code>/<code>documentation</code>/unknown attributes are written back verbatim.',
        },
        {
          name: 'toBpmnJson(model: BpmnDiagram)',
          type: 'BpmnDiagramJson',
          description:
            'Wraps the diagram model in the versioned JSON persistence envelope — the standalone twin of <code>OgeBpmnEditor.exportJson()</code>.',
        },
        {
          name: 'fromBpmnJson(value: unknown)',
          type: 'BpmnJsonParseResult',
          description:
            'Structurally validates a value produced by <code>toBpmnJson</code> (typically after a <code>JSON.parse</code> round trip through a database) and returns the diagram model, or an error describing the first problem found. Unknown extra keys are tolerated for forward compatibility; version mismatches, missing required maps and broken id cross-references are not.',
        },
        {
          name: 'renderDiagramSvg(model, options?)',
          type: '(model: BpmnDiagram, options?: BpmnSvgExportOptions) =&gt; string',
          description:
            'Renders the diagram as a self-contained static <code>&lt;svg&gt;</code> string: shapes, edges (with arrowhead markers) and labels re-rendered with inline fill/stroke attributes, <code>viewBox</code> fitted to the content bounds plus padding. No grid, no selection state, no external CSS.',
        },
        {
          name: 'BpmnSvgExportOptions',
          type: '{ padding?: number }',
          description:
            'Options of <code>renderDiagramSvg</code>: padding in diagram units added around the content bounds (default 20).',
        },
        {
          name: 'createEmptyDiagram(processId?)',
          type: 'BpmnDiagram',
          description:
            'A fresh empty diagram model with default <code>&lt;definitions&gt;</code> attributes.',
        },
        {
          name: 'BpmnDiagramJson',
          type: '{ version: 1; diagram: BpmnDiagram }',
          description:
            'Versioned JSON envelope for persisting a diagram to an application database; <code>version</code> guards forward compatibility of the envelope shape.',
        },
        {
          name: 'BpmnJsonParseResult',
          type: '{ model: BpmnDiagram | null; error?: string }',
          description:
            'Result of <code>fromBpmnJson</code>: the model, or null plus an error message.',
        },
        {
          name: 'BpmnImportResult',
          type: '{ model: BpmnDiagram | null; warnings: readonly BpmnImportWarning[]; error?: string }',
          description:
            'Result of importing BPMN XML: the model (<code>null</code> on fatal errors) plus fidelity warnings.',
        },
        {
          name: 'BpmnImportWarning / BpmnImportWarningCode',
          type: "{ code, message, elementId?, localName? } · 'unsupported-element' | 'missing-di' | 'multiple-processes' | 'dangling-ref' | 'event-definition-stripped' | 'invalid-event-definition' | 'nested-lanes-flattened'",
          description:
            'A non-fatal fidelity loss reported while importing — dropped flow elements, stripped or position-invalid event definitions, dangling references, missing DI, flattened nested lanes.',
        },
      ],
    },
    {
      title: 'Engine — alignment',
      entries: [
        {
          name: 'alignElements(rects, mode)',
          type: '(rects: Readonly&lt;Record&lt;string, Rect&gt;&gt;, mode: BpmnAlignMode) =&gt; Record&lt;string, Point&gt;',
          description:
            'Computes the per-element move deltas that align the given rectangles (bpmn-js align-elements semantics): edge modes move to the outermost matching edge, center modes to the center of the joint bounding box. Every input id appears in the result (zero delta when already aligned); fewer than 2 rectangles produce an empty result. Pure — no model involved.',
        },
        {
          name: 'distributeElements(rects, axis)',
          type: '(rects: Readonly&lt;Record&lt;string, Rect&gt;&gt;, axis: BpmnDistributeAxis) =&gt; Record&lt;string, Point&gt;',
          description:
            'Computes the deltas that spread the elements at equal center gaps along one axis (3+ elements). Pure — no model involved.',
        },
        {
          name: 'BpmnAlignMode',
          type: "'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom'",
          description:
            'Alignment edge/axis of <code>alignElements</code>: edge values align the matching edges, <code>centerX</code>/<code>centerY</code> align the centers on the horizontal / vertical axis of the selection&#39;s bounding box.',
        },
        {
          name: 'BpmnDistributeAxis',
          type: "'x' | 'y'",
          description:
            'Distribution axis of <code>distributeElements</code>: <code>x</code> spreads horizontally.',
        },
      ],
    },
    {
      title: 'Engine — model',
      entries: [
        {
          name: 'BpmnDiagram',
          type: 'readonly plain-object graph',
          description:
            'The complete immutable diagram model: the default process, optional collaboration <code>pools</code>, <code>nodes</code>/<code>edges</code> records, a deterministic <code>order</code> list, per-element DI bounds/waypoints and the preserved foreign XML fragments. All nodes and edges of every pool&#39;s process live in the single flat maps; a node&#39;s <code>poolId</code> decides which <code>&lt;bpmn:process&gt;</code> it is serialized into.',
        },
        {
          name: 'BpmnNode / BpmnNodeType',
          type: "'startEvent' | 'endEvent' | 'intermediateThrowEvent' | 'intermediateCatchEvent' | 'boundaryEvent' | 'task' | 'userTask' | 'serviceTask' | 'scriptTask' | 'callActivity' | 'subProcess' | 'eventSubProcess' | 'transaction' | 'exclusiveGateway' | 'parallelGateway' | 'dataObject' | 'dataStore' | 'group' | 'textAnnotation'",
          description:
            'A diagram node and every node kind that can appear on the canvas. Events carry <code>eventDefinition</code> (and boundary events <code>attachedToRef</code>/<code>cancelActivity</code>), gateways carry <code>defaultFlowId</code>, activities carry <code>marker</code>/<code>isForCompensation</code>, call activities <code>calledElement</code>, sub-process children <code>parentId</code>, annotations <code>text</code>.',
        },
        {
          name: 'BpmnEdge / BpmnEdgeType',
          type: "'sequenceFlow' | 'association' | 'messageFlow' | 'dataAssociation'",
          description:
            'A connection with <code>sourceRef</code>/<code>targetRef</code>: sequence flows (may carry <code>name</code> and <code>conditionExpression</code>), annotation associations, cross-pool message flows and data associations (v0.4 — one endpoint must be an activity).',
        },
        {
          name: 'BpmnEventDefinitionKind',
          type: "'message' | 'timer' | 'error' | 'signal' | 'escalation' | 'conditional' | 'link' | 'compensate' | 'terminate'",
          description:
            'The nine standard BPMN event definition kinds (single definition per event).',
        },
        {
          name: 'VALID_EVENT_DEFINITIONS',
          type: 'Readonly&lt;Record&lt;event position, readonly BpmnEventDefinitionKind[]&gt;&gt;',
          description:
            'Which event definition kinds each event position accepts (BPMN 2.0 table 10.87 subset), enforced by the reader and the panel definition select. v0.3 simplification: <code>error</code> on a start event is allowed unconditionally although the spec restricts it to event sub-processes.',
        },
        {
          name: 'BpmnActivityMarker',
          type: "'loop' | 'multiInstanceParallel' | 'multiInstanceSequential' | 'compensation'",
          description:
            'Loop/multi-instance/compensation markers rendered at an activity&#39;s bottom center.',
        },
        {
          name: 'BpmnSubProcessType',
          type: "'subProcess' | 'eventSubProcess' | 'transaction'",
          description:
            'The three sub-process container kinds (children carry <code>parentId</code>).',
        },
        {
          name: 'BpmnDataNodeType',
          type: "'dataObject' | 'dataStore'",
          description:
            'Data element kinds (v0.4): the page-with-fold object and the cylinder store.',
        },
        {
          name: 'BpmnPool / BpmnLane',
          type: 'interfaces',
          description:
            'A collaboration participant and its swimlanes. A pool without a <code>processRef</code> is a black-box pool: it renders as an empty band and is a valid message-flow endpoint, but has no process contents. Lane membership is the ordered <code>flowNodeRefs</code> id list, auto-maintained from geometry on every editing command.',
        },
        {
          name: 'BpmnMessageFlow',
          type: 'interface',
          description:
            'A message flow between elements of different pools. Either endpoint may be a participant (pool) id or a flow-node id; serialized inside the <code>&lt;bpmn:collaboration&gt;</code> element.',
        },
        {
          name: 'BpmnClipboard',
          type: 'interface',
          description:
            'A deep-cloned diagram subgraph held by the editor&#39;s internal clipboard: the copied nodes plus every edge whose both endpoints were copied, with their DI. Ids still refer to the source diagram; pasting remaps them.',
        },
        {
          name: 'Point / Rect',
          type: '{ x, y } · { x, y, width, height }',
          description: 'Geometry primitives used by DI bounds and waypoints.',
        },
      ],
    },
    {
      title: 'Validation',
      entries: [
        {
          name: 'OgeBpmnLintRule',
          type: '{ id: string; severity: OgeBpmnLintSeverity; check(model, context): OgeBpmnLintReport[] }',
          description:
            'A validation rule — pure data plus a pure <code>check</code> over the immutable model (runs on a server or in CI too). <code>context.messages</code> carries the localized lint strings and <code>context.displayName(id)</code> an element&#39;s display name; a throwing rule is skipped.',
        },
        {
          name: 'OgeBpmnLintRuleOverride',
          type: "{ id: string; severity: OgeBpmnLintSeverity | 'off' }",
          description:
            'Re-grades or disables a rule inside <code>lintRules</code>.',
        },
        {
          name: 'OgeBpmnLintRulesInput',
          type: 'readonly (OgeBpmnLintRule | OgeBpmnLintRuleOverride)[]',
          description: 'The <code>lintRules</code> input type.',
        },
        {
          name: 'OgeBpmnLintIssue',
          type: '{ key; ruleId; severity; elementId; message }',
          description:
            'One problem — listed in the problems panel, counted in <code>lintChanged</code>, returned by <code>validate()</code>.',
        },
        {
          name: 'OgeBpmnLintChangedEvent',
          type: '{ issues; errors; warnings; infos }',
          description: 'Payload of <code>lintChanged</code>.',
        },
        {
          name: 'OgeBpmnLintSeverity',
          type: "'error' | 'warning' | 'info'",
          description: 'Severity of a rule and its issues.',
        },
        {
          name: 'OGE_BPMN_DEFAULT_LINT_RULES',
          type: 'readonly OgeBpmnLintRule[]',
          description:
            'The bpmnlint-like built-ins: <code>start-event-required</code>, <code>end-event-required</code>, <code>no-disconnected</code>, <code>superfluous-gateway</code> (a gateway must fork or join), <code>conditional-flows</code> (exclusive-gateway conditions and default flow), <code>no-implicit-split</code>, <code>no-implicit-join</code>, <code>label-required</code>, <code>no-duplicate-ids</code>, <code>sub-process-start-event</code>, <code>message-flow-pools</code>, <code>boundary-event-attached</code> and <code>no-unreachable</code>.',
        },
        {
          name: 'lintBpmnDiagram(model, rules?, messages?)',
          type: 'readonly OgeBpmnLintIssue[]',
          description:
            'The engine function behind <code>validate()</code> — usable without an editor (<code>lintBpmnDiagram(readBpmnXml(xml).model)</code>). <code>resolveBpmnLintRules(input)</code> applies a <code>lintRules</code> list to the defaults.',
        },
      ],
    },
    {
      title: 'Extensibility',
      entries: [
        {
          name: 'OgeBpmnPropertiesProvider',
          type: '{ id: string; getGroups(context: OgeBpmnPropertiesContext): OgeBpmnPropertiesGroup[] }',
          description:
            'A source of panel groups. <code>context.target</code> is the process (nothing selected) or the selected node, edge or pool; <code>context.messages</code> the resolved catalog. A provider that throws contributes nothing.',
        },
        {
          name: 'OgeBpmnPropertiesGroup',
          type: '{ id: string; label: string; entries: OgeBpmnPropertiesEntry[] }',
          description:
            'A titled group (an empty label renders the entries without a heading; a labelled group is a <code>role="group"</code> named by its heading).',
        },
        {
          name: 'OgeBpmnPropertiesEntry',
          type: '{ id; label; type; value; options?; columns?; description?; placeholder?; disabled?; data?; set?(value) }',
          description:
            'One field. <code>value</code> is a string, a boolean (<code>checkbox</code>) or rows (<code>list</code>, with <code>columns</code>); <code>set(value)</code> returns the command a commit runs (Enter / blur / pick — one undo step), or null. <code>description</code> is wired with <code>aria-describedby</code>; list cells are named <code>{entry} {column} {row}</code>.',
        },
        {
          name: 'OgeBpmnPropertiesEntryContext',
          type: '{ $implicit: entry; entry; commit(value); inputId }',
          description:
            'Template context of <code>[ogeBpmnPropertiesEntry]</code>.',
        },
        {
          name: 'OGE_BPMN_DEFAULT_PROPERTIES_PROVIDERS',
          type: 'readonly OgeBpmnPropertiesProvider[]',
          description:
            'The built-in G5b fields as providers: event-definition details (<code>oge-event-details</code>) and "Move to…" + documentation (<code>oge-general</code>).',
        },
        {
          name: 'OgeBpmnPaletteEntry / OgeBpmnPaletteProvider',
          type: '{ id; label; icon: OgeBpmnSvgNode[]; hotkey?; action(api) }',
          description: 'A custom palette entry and its provider.',
        },
        {
          name: 'OgeBpmnContextPadEntry / OgeBpmnContextPadProvider',
          type: '{ id; label; icon: OgeBpmnSvgNode[]; hotkey?; action(api, elementId) }',
          description: 'A custom context-pad action and its provider.',
        },
        {
          name: 'OgeBpmnEditorApi',
          type: '{ getDiagram; getSelection; select; execute; armPlace; appendElement; announce; focus }',
          description:
            'What palette and context-pad actions may do — <code>execute(command)</code> runs any engine command as one undo step; <code>armPlace(type, { template })</code> / <code>appendElement(sourceId, type, { template })</code> create (templated) elements.',
        },
        {
          name: 'OgeBpmnRenderers / OgeBpmnElementRenderer / OgeBpmnRenderContext',
          type: '(context: { node; width; height; fill; stroke }) =&gt; OgeBpmnSvgNode[] | null',
          description: 'The <code>renderers</code> input types.',
        },
        {
          name: 'bpmnSvg',
          type: '{ g, path, rect, circle, ellipse, line, polyline, polygon, text }',
          description:
            'The safe SVG builders every icon and renderer uses (<code>bpmnSvg.circle(12, 12, 8, { &#39;stroke-width&#39;: 2 })</code>). Trees pass <code>sanitizeBpmnSvg</code> before they render: unknown tags and attributes, <code>on*</code> handlers, <code>href</code>, <code>style</code> and external <code>url(…)</code> are dropped; text is a text node.',
        },
        {
          name: 'OgeBpmnSvgNode',
          type: '{ tag; attrs?; children?; text? }',
          description: 'One element of a safe SVG tree.',
        },
        {
          name: 'OgeBpmnElementTemplate / OgeBpmnTemplateProperty',
          type: '{ id; name; version?; appliesTo; elementType?; icon?; properties }',
          description:
            'Element templates modeled on Camunda Modeler&#39;s: each property (<code>String</code>, <code>Text</code>, <code>Boolean</code>, <code>Dropdown</code>, <code>Hidden</code>) is bound to <code>name</code> / <code>calledElement</code> / a vendor attribute, the documentation, <code>zeebe:taskDefinition</code>, <code>zeebe:input</code> / <code>zeebe:output</code>, <code>zeebe:taskHeader</code> or <code>camunda:inputParameter</code> / <code>camunda:outputParameter</code>.',
        },
        {
          name: 'applyElementTemplateCommand(id, template)',
          type: 'BpmnCommand',
          description:
            'Applies a template programmatically (what the provider&#39;s select runs): morph, defaults, template id — one undo step. Run it with <code>api.execute()</code> from a palette / pad action or after <code>importXml()</code>.',
        },
        {
          name: 'setForeignAttributeCommand(id, name, value, namespaces?)',
          type: 'BpmnCommand',
          description:
            'Sets (or, with <code>&#39;&#39;</code>, removes) a qualified vendor attribute (<code>oge:dueWithin</code>, <code>camunda:asyncBefore</code>) on a node, edge, pool or the process, declaring <code>namespaces</code> on <code>&lt;definitions&gt;</code>. <code>bpmnForeignAttribute(model, id, name)</code> reads one back — the pair custom providers store their values with.',
        },
        {
          name: 'bpmnForeignAttribute(model, id, name)',
          type: 'string',
          description:
            'A vendor attribute of an element, or <code>&#39;&#39;</code>.',
        },
        {
          name: 'setElementColorsCommand(ids, patch)',
          type: 'BpmnCommand',
          description:
            'Sets or clears (<code>null</code>) the DI fill / stroke of elements — the command behind the panel&#39;s appearance section, handy in context-pad actions.',
        },
        {
          name: 'bpmnElementTemplatesProvider(templates)',
          type: 'OgeBpmnPropertiesProvider',
          description:
            'A "Template" select on every element a template applies to and, once applied, the template&#39;s visible properties as typed fields. <code>applyElementTemplateCommand(id, template)</code> morphs to <code>elementType</code>, writes every default and records <code>zeebe:modelerTemplate</code> (or <code>camunda:modelerTemplate</code>) — one undo step.',
        },
      ],
    },
    {
      title: 'Camunda / Zeebe',
      entries: [
        {
          name: 'OGE_BPMN_CAMUNDA_PROVIDERS',
          type: 'readonly OgeBpmnPropertiesProvider[]',
          description:
            'The opt-in <code>camundaProviders</code> preset: <code>OGE_BPMN_ZEEBE_PROVIDER</code> (task definition job type + retries and task headers on service / script tasks, input / output mappings on activities and non-start events) and <code>OGE_BPMN_CAMUNDA7_PROVIDER</code> (<code>camunda:assignee</code> / <code>candidateGroups</code> / <code>formKey</code> on user tasks, <code>camunda:inputOutput</code> text parameters on activities). Edits write the extension tree and declare <code>xmlns:zeebe</code> / <code>xmlns:camunda</code> when needed; complex parameters (<code>camunda:list</code>, <code>map</code>, <code>script</code>) are kept untouched.',
        },
        {
          name: 'OgeBpmnPropertyBinding',
          type: "{ type: 'property' | 'documentation' | 'zeebe:taskDefinition' | 'zeebe:input' | 'zeebe:output' | 'zeebe:taskHeader' | 'camunda:inputParameter' | 'camunda:outputParameter'; … }",
          description:
            'Where a value lives; read with <code>bpmnBindingValue(model, id, binding)</code>, written with <code>setBpmnBindingCommand(id, binding, value)</code>.',
        },
        {
          name: 'BpmnXmlElement',
          type: '{ name; attributes?; children?; text? }',
          description:
            'The editable tree of <code>&lt;bpmn:extensionElements&gt;</code> (qualified names, <code>#text</code> / <code>#comment</code> for mixed content), written back deterministically. Unknown vendor elements stay in the tree untouched.',
        },
      ],
    },
    {
      title: 'Engine — G5b modeling & payloads',
      entries: [
        {
          name: 'BpmnEventDetails',
          type: '{ id?; timer?: { kind: BpmnTimerKind; expression }; ref?; condition?; linkName? }',
          description:
            'The event-definition payload: timer <code>timeDate</code> / <code>timeDuration</code> / <code>timeCycle</code>, the <code>messageRef</code> / <code>signalRef</code> / <code>errorRef</code> / <code>escalationRef</code>, the conditional condition and the link name — imported, editable in the panel and exported (no more dropped-payload warning).',
        },
        {
          name: 'BpmnRootElement',
          type: "{ id; type: 'message' | 'signal' | 'error' | 'escalation'; name?; code? }",
          description:
            'Definitions-level root elements (<code>BpmnDiagram.rootElements</code>); the panel&#39;s reference select offers the existing ones and a "New …" option (<code>addRootElementCommand</code>).',
        },
        {
          name: 'setDocumentationCommand(id, text)',
          type: 'BpmnCommand',
          description:
            'Sets or clears <code>&lt;bpmn:documentation&gt;</code> on any node, edge or pool, or the process (<code>BPMN_PROCESS_TARGET</code>).',
        },
        {
          name: 'moveToContainerCommand(id, targetId)',
          type: 'BpmnCommand',
          description:
            'Re-parenting — the keyboard twin of the drag drop ("Move to…" in the panel): moves the element inside a pool, lane or expanded sub-process and re-parents it in one undo step; sequence flows that would cross pools or scopes are removed. <code>reparentElementsCommand(ids, target)</code> is the drop&#39;s half.',
        },
        {
          name: 'OgeBpmnPngExportOptions',
          type: '{ pixelRatio?: number; background?: string; padding?: number }',
          description: 'Options of <code>exportPng()</code>.',
        },
      ],
    },
  ],
};

export const OGE_BPMN_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'OgeBpmnConfig',
      entries: [
        {
          name: 'gridSize',
          type: 'number',
          default: '10',
          description:
            'Grid step in diagram units used for placement and arrow-key movement.',
        },
        {
          name: 'snapThreshold',
          type: 'number',
          default: '5',
          description:
            'Neighbor-alignment snapping threshold in diagram units — center/edge alignment beats the grid inside it.',
        },
        {
          name: 'zoomMin / zoomMax',
          type: 'number',
          default: '0.2 / 4',
          description: 'Bounds of the zoom factor.',
        },
        {
          name: 'autoSaveDebounceMs',
          type: 'number',
          default: '500',
          description:
            'Debounce in milliseconds for the editor&#39;s <code>diagramChanged</code> autosave stream: rapid model changes collapse into one emission carrying the final state; <code>0</code> emits synchronously after every change. Serialization happens only on emit and never while dragging (move/bend gestures commit a single command on release).',
        },
        {
          name: 'colorPresets',
          type: 'readonly string[]',
          default: 'OGE_DEFAULT_BPMN_COLOR_PRESETS',
          description:
            'Fill color presets (any CSS color strings) offered as swatch buttons in the properties panel&#39;s appearance section. Presets set the fill only; the stroke has its own picker.',
        },
        {
          name: 'messages',
          type: 'OgeBpmnMessages',
          description:
            'Every user-facing string the editor renders, including aria labels.',
        },
      ],
    },
    {
      title: 'OgeBpmnMessages',
      entries: [
        {
          name: 'canvasLabel / canvasHint',
          type: 'string',
          description:
            'Accessible name of the <code>role="application"</code> canvas, and the focus hint explaining how to leave the diagram (appended to the label).',
        },
        {
          name: 'emptyText',
          type: 'string',
          description: 'Centered hint shown while the diagram has no elements.',
        },
        {
          name: 'paletteLabel',
          type: 'string',
          description: 'Accessible name of the elements palette toolbar.',
        },
        {
          name: 'paletteLabels',
          type: 'Readonly&lt;Record&lt;BpmnPaletteItemType, string&gt;&gt;',
          description:
            'Label (tooltip + aria label) of each palette entry, per palette item type (including <code>&#39;pool&#39;</code>) — a full record, so an override supplies every key.',
        },
        {
          name: 'tools',
          type: 'OgeBpmnToolsMessages',
          description:
            'Labels of the tool strip below the palette: <code>label</code> (the toolbar&#39;s accessible name), <code>hand</code>, <code>lasso</code>, <code>space</code>, <code>globalConnect</code> and <code>search</code>.',
        },
        {
          name: 'align',
          type: 'OgeBpmnAlignMessages',
          description:
            'Labels of the align/distribute flyout on multi-element selections: <code>menuLabel</code>, the six <code>align*</code> entries and <code>distributeHorizontal</code>/<code>distributeVertical</code> (equal gaps, 3+ elements).',
        },
        {
          name: 'search',
          type: 'OgeBpmnSearchMessages',
          description:
            'Labels of the element search overlay (Ctrl+F): <code>label</code>, <code>placeholder</code> and <code>noResults</code>.',
        },
        {
          name: 'minimapLabel',
          type: 'string',
          description: 'Accessible name of the minimap navigation overlay.',
        },
        {
          name: 'contextPad',
          type: 'OgeBpmnContextPadMessages',
          description:
            'Aria labels and titles of the context-pad actions: <code>connect</code>, <code>appendTask</code>, <code>appendGateway</code>, <code>appendEndEvent</code>, <code>editLabel</code>, <code>toggleDefault</code>, <code>deleteElement</code>.',
        },
        {
          name: 'announcements',
          type: 'OgeBpmnAnnouncementMessages',
          description:
            'Live-region announcement templates; <code>{token}</code> placeholders are substituted.',
        },
        {
          name: 'elementNames',
          type: 'Readonly&lt;Record&lt;BpmnElementNameKey, string&gt;&gt;',
          description:
            'Fallback display name per element type — node/edge types plus pools and lanes — used when an element has no name.',
        },
        {
          name: 'lint / extensions / camunda',
          type: 'OgeBpmnLintMessages / OgeBpmnExtensionMessages / OgeBpmnCamundaMessages',
          description:
            'The G5b strings — badges, problems panel and rule messages; documentation, "Move to", event details, list fields and templates; the Camunda / Zeebe fields. Optional blocks: a catalog without them (or with a partial block) is filled key by key from English (<code>fillBpmnMessages</code>).',
        },
        {
          name: 'properties',
          type: 'OgeBpmnPropertiesMessages',
          description:
            'Labels of the properties panel: headings, field labels and templates.',
        },
      ],
    },
    {
      title: 'OgeBpmnPropertiesMessages',
      entries: [
        {
          name: 'panelLabel / processHeading / name / id / executable',
          type: 'string',
          description:
            'The panel region&#39;s accessible name, the no-selection (process) heading, the name field label, the read-only id row label and the process "is executable" checkbox label.',
        },
        {
          name: 'condition / defaultFlow / annotationText / selectionCount',
          type: 'string',
          description:
            'The sequence-flow condition textarea, the "default flow" checkbox on an exclusive gateway&#39;s flow, the text-annotation textarea and the multi-selection summary (<code>{count}</code>).',
        },
        {
          name: 'appearanceHeading / fillLabel / strokeLabel / clearColors / presetLabel',
          type: 'string',
          description:
            'The appearance (colors) section: heading, fill/stroke picker labels, the "clear colors" button and the aria label of a preset swatch (<code>{color}</code>).',
        },
        {
          name: 'typeLabel / eventDefinition / noneOption / eventDefinitionNames',
          type: 'string · Readonly&lt;Record&lt;BpmnEventDefinitionKind, string&gt;&gt;',
          description:
            'The element type (morph) select, the event definition select on events, the shared "None" option and the display name per event definition kind.',
        },
        {
          name: 'interrupting / collapsed / marker / markerNames / forCompensation / calledElement',
          type: 'string · Readonly&lt;Record&lt;marker, string&gt;&gt;',
          description:
            'The boundary event "Interrupting" checkbox, the sub-process "Collapsed" checkbox, the activity marker select with its per-marker display names, the "For compensation" checkbox and the call activity "Called element" field.',
        },
        {
          name: 'lanesHeading / addLane / removeLane / laneName',
          type: 'string',
          description:
            'The lanes section of the pool panel: heading, "Add lane" button, per-lane "Remove" button (<code>{name}</code>) and lane name input aria label (<code>{name}</code>).',
        },
      ],
    },
    {
      title: 'OgeBpmnAnnouncementMessages',
      entries: [
        {
          name: 'created / moved / connected / deleted',
          type: 'string templates',
          description:
            'After a palette placement (<code>{type}</code>), a move (<code>{name}</code>), a connection (<code>{source}</code>/<code>{target}</code>) and a deletion (<code>{count}</code>).',
        },
        {
          name: 'undone / redone',
          type: 'string templates',
          description:
            'After undo/redo; <code>{label}</code> is the affected command label.',
        },
        {
          name: 'selected / selectionCleared',
          type: 'string templates',
          description:
            'When an element becomes selected (<code>{name}</code>) and when the selection is cleared.',
        },
        {
          name: 'imported / importedWithWarnings',
          type: 'string templates',
          description:
            'After a clean import, and after an import that produced warnings (<code>{count}</code>).',
        },
        {
          name: 'connectDenied / labelEdited',
          type: 'string templates',
          description:
            'When a requested connection is not allowed by the rules, and after an inline label edit is committed.',
        },
        {
          name: 'copied / cut / pasted',
          type: 'string templates',
          description:
            'After a clipboard copy, cut and paste; <code>{count}</code> is the number of affected elements.',
        },
        {
          name: 'recolored / resized / typeChanged',
          type: 'string templates',
          description:
            'After a recolor (<code>{count}</code>), a resize (<code>{name}</code>) and a properties-panel type morph (<code>{name}</code>/<code>{type}</code>).',
        },
        {
          name: 'attached / attachDenied / collapsedToggled',
          type: 'string templates',
          description:
            'After a boundary event attaches (<code>{name}</code>/<code>{host}</code>), when a boundary-event placement finds no activity border, and after a sub-process collapse/expand (<code>{name}</code>).',
        },
        {
          name: 'poolCreated / laneAdded / laneRemoved',
          type: 'string templates',
          description:
            'After a pool is placed from the palette and after a lane is added to / removed from a pool (<code>{name}</code> is the pool&#39;s display name).',
        },
        {
          name: 'aligned / distributed / spaceAdjusted',
          type: 'string templates',
          description:
            'After an align, distribute and space-tool commit; <code>{count}</code> is the number of moved/shifted elements.',
        },
        {
          name: 'searchResults / labelMoved / waypointRemoved',
          type: 'string templates',
          description:
            'When the search result set changes (<code>{count}</code>), after an external label drag (<code>{name}</code>) and after a bend-point handle was removed by double click.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'provideOgeBpmnConfig(config: OgeBpmnConfigInput)',
          type: 'Provider',
          description:
            'Application- or component-scoped editor defaults; <code>messages</code> is a partial merged over the built-in English strings.',
        },
        {
          name: 'OgeBpmnConfigInput',
          type: 'Partial&lt;OgeBpmnConfig&gt; with Partial&lt;OgeBpmnMessages&gt;',
          description: 'Argument shape of <code>provideOgeBpmnConfig()</code>.',
        },
        {
          name: 'OGE_BPMN_CONFIG',
          type: 'InjectionToken&lt;OgeBpmnConfig&gt;',
          description:
            'The DI token the editor reads; defaults to <code>OGE_DEFAULT_BPMN_CONFIG</code>.',
        },
        {
          name: 'OGE_DEFAULT_BPMN_CONFIG / OGE_DEFAULT_BPMN_MESSAGES',
          type: 'OgeBpmnConfig / OgeBpmnMessages',
          description:
            'The built-in defaults — handy as a base for wholesale message replacement.',
        },
        {
          name: 'OGE_DEFAULT_BPMN_COLOR_PRESETS',
          type: 'readonly string[]',
          description:
            'The default fill presets of the properties panel&#39;s appearance section: eight soft pastel tones that keep dark strokes and labels readable. Override per app via <code>colorPresets</code>.',
        },
        {
          name: 'BpmnElementNameKey',
          type: "BpmnNodeType | BpmnEdgeType | 'pool' | 'lane'",
          description:
            'Every key of <code>elementNames</code>: node/edge types plus pools and lanes.',
        },
        {
          name: 'OgeBpmnContextPadMessages / OgeBpmnToolsMessages / OgeBpmnAlignMessages / OgeBpmnSearchMessages / OgeBpmnPropertiesMessages / OgeBpmnHeaderMessages',
          type: 'interfaces',
          description:
            'The message blocks referenced above — context-pad actions, tool strip, align/distribute flyout, search overlay and properties panel.',
        },
      ],
    },
  ],
};
