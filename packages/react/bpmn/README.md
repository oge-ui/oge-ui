# @oge-ui/react-bpmn

React BPMN 2.0 editor from the OGE UI suite — a from-scratch modeler, not a
wrapper — running the **same** framework-free engine and editor core
([`@oge-ui/bpmn-engine`](https://www.npmjs.com/package/@oge-ui/bpmn-engine):
the model, the BPMN XML + DI reader/writer, routing, snapping, the modeling
rules, the command stack, every tool, gesture and key) as the Angular
`@oge-ui/bpmn` package, and the same stylesheet. No watermark.

The OGE suite is one component engine with a native render layer per
framework: nothing here wraps Angular.

## What ships

- **`<OgeBpmnEditor>`** — palette click-then-place and drag-to-canvas, the
  context pad (connect, append task / gateway / end event, edit label,
  default flow, delete) with an align/distribute flyout on multi-selections,
  the hand / lasso / space / global-connect tool strip, inline label editing,
  orthogonal routing with bend points and segment moves, corner resizing,
  grid and neighbor snapping with guides, pools and lanes, boundary events,
  sub-processes, element search (Ctrl+F), the minimap, the properties panel,
  a header with the diagram name, undo/redo, zoom and fullscreen, overlays
  (process-monitoring badges), clipboard and snapshot undo/redo — on a
  keyboard-accessible `role="application"` canvas that narrates every action.
  Controlled `mode` and `zoom` pairs, `on*` callbacks for every Angular
  output and a `ref` handle for every public method (`importXml`,
  `exportXml`, `exportJson`, `importJson`, `exportSvg`, `addOverlay`, …).
- **`<OgeBpmnConfigProvider>`** — the React counterpart of
  `provideOgeBpmnConfig()`: grid size, snapping, zoom bounds, the autosave
  debounce, fill presets, the brand logo and every message string.

## Installation

```sh
npm install @oge-ui/react-bpmn
```

```tsx
import '@oge-ui/react-bpmn/styles.css';
import { useRef } from 'react';
import { OgeBpmnEditor, type OgeBpmnEditorHandle } from '@oge-ui/react-bpmn';

export function Modeler({ xml }: { xml: string }) {
  const editor = useRef<OgeBpmnEditorHandle>(null);
  return (
    <>
      <button onClick={() => editor.current?.importXml(xml)}>Load</button>
      <OgeBpmnEditor ref={editor} style={{ height: 480 }} onDiagramChanged={(e) => e.source !== 'import' && save(e.json)} />
    </>
  );
}
declare function save(json: unknown): void;
```

Overlay `html` is rendered without `dangerouslySetInnerHTML`: the engine
parses it into an allow-listed node tree (the policy Angular's sanitizing
`[innerHTML]` applies) and URL attributes go through `@oge-ui/behavior`'s
`sanitizeUrl`.

## License

Source-available commercial software — free for evaluation and development,
a paid license is required for production use. See [`LICENSE`](./LICENSE)
and https://ogeui.com/license. This package is **not** part of the MIT
`@oge-ui/react` umbrella.
