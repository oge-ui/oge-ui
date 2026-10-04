# @oge-ui/bpmn-engine

The framework-free engine of the OGE UI BPMN 2.0 editor — the part of the
modeler that is neither Angular nor React. The Angular editor
([`@oge-ui/bpmn`](https://www.npmjs.com/package/@oge-ui/bpmn)) and the React
editor ([`@oge-ui/react-bpmn`](https://www.npmjs.com/package/@oge-ui/react-bpmn))
are both thin templates over this package, so the two render layers cannot
drift: one model, one set of modeling rules, one command stack, one editor
core.

You rarely install it directly — each editor package depends on it. Import it
on its own for server-side or test pipelines: BPMN XML in, BPMN XML / JSON /
SVG out, no DOM rendering.

## What ships

- **Model** — `BpmnDiagram` (flow nodes, text annotations, sequence / message
  flows, associations, data associations, pools and lanes, BPMN DI with
  colors and label bounds) and its builders (`createEmptyDiagram`, id
  generation, pool membership).
- **Persistence** — `readBpmnXml` (prefix-agnostic BPMN 2.0 + DI, fidelity
  warnings instead of silent drops, extension elements preserved verbatim),
  `writeBpmnXml` (byte-deterministic), `toBpmnJson` / `fromBpmnJson`
  (versioned envelope with structural validation) and `renderDiagramSvg`
  (self-contained static SVG). XML parsing runs through the `oge-ui#bpmn`
  Trusted Types policy (`OGE_BPMN_TRUSTED_TYPES_POLICY`) when the browser
  enforces Trusted Types; `sanitizeBpmnOverlayHtml` turns overlay HTML into
  safe nodes (`rel="noopener noreferrer"` on targeted links, no `role`).
- **Modeling** — orthogonal routing, grid + neighbor snapping, alignment and
  distribution, auto-layout for DI-less documents, the connection and morph
  rules, every undoable command and the snapshot `BpmnCommandStack`.
- **Editor core** — `OgeBpmnEditorCore`: the tool machine, every pointer
  gesture, the canvas keyboard map, clipboard, element search, announcements,
  autosave and the view models the editors draw; plus the properties-panel
  view model, the palette keyboard map, the message catalog and every
  default (`OGE_DEFAULT_BPMN_MESSAGES`, `resolveOgeBpmnConfig`).
- **`@oge-ui/bpmn-engine/testing`** — real BPMN sample documents for your own
  tests.

```ts
import { readBpmnXml, writeBpmnXml, renderDiagramSvg } from '@oge-ui/bpmn-engine';

const { model, warnings } = readBpmnXml(xml);
if (model) {
  const svg = renderDiagramSvg(model);
  const normalized = writeBpmnXml(model);
}
```

## License

Source-available commercial software — free for evaluation and development,
a paid license is required for production use. See [`LICENSE`](./LICENSE)
and https://www.ogeui.com/license.
