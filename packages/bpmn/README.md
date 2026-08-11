# @oge-ui/bpmn

> **Commercial package.** Unlike the rest of the OGE UI suite (MIT), the BPMN
> editor is source-available commercial software: free for evaluation,
> development and testing — a paid license is required for production use.
> No watermark, no runtime license checks. See [LICENSE](LICENSE) and
> [ogeui.com/license](https://ogeui.com/license).

A from-scratch, Angular-native BPMN 2.0 modeler — not a bpmn-js wrapper. The
package carries its own dependency-free XML + diagram-interchange engine in
pure TypeScript; the signal-based `<oge-bpmn-editor>` component renders it
with an accessible `role="application"` canvas.

**Modeling**

- Full working element set: all event kinds with the nine standard event
  definitions (message / timer / error / signal / escalation / conditional /
  link / compensate / terminate), boundary events (border attach/slide,
  interrupting toggle), sub-process / event sub-process / transaction
  (collapse/expand), pools with lanes, message flows, data objects and
  stores with data associations, groups, call activities, activity markers
  (loop / multi-instance / compensation) and text annotations
- Palette with click-then-place **and** drag-to-canvas; context pad with
  connect / append / edit label / toggle default flow / delete, growing an
  align & distribute flyout on multi-selections (6 align modes, 2 equal-gap
  distributions)
- Orthogonal edge routing with bend-point editing (handle drag, dblclick
  insert/remove, perpendicular segment drag) and external label drag with
  `BPMNLabel` DI round-trip
- Tool strip: hand (`H`), lasso (`L`), space (`S`) and global connect;
  element search overlay (`Ctrl+F`) with dimming and `centerOn()` panning;
  minimap navigation overlay (`showMinimap`)
- Properties panel (`showPropertiesPanel`): name / id / condition / default
  flow, event definition and type-morph selects, markers, lanes add / remove
  / rename, per-element fill & stroke colors with preset swatches
  (bpmn.io `bioc` interop — recolored files render identically both ways)
- Snapshot undo/redo (every command is exactly one entry), save-point dirty
  tracking (`isDirty()` / `markSaved()` / `dirtyChanged`), marquee
  selection, internal clipboard (Ctrl+C/X/V/A), grid + neighbor-alignment
  snapping, cursor-anchored zoom, read-only viewer mode via one input

**Interop & persistence**

- BPMN 2.0 XML + DI round-trip: prefix-agnostic reader, byte-deterministic
  writer; `extensionElements`, `documentation` and unknown attributes are
  preserved verbatim — camunda-flavored files round-trip byte-identically
- Honest lossiness: anything the model cannot represent surfaces as a
  `BpmnImportWarning`, never silently; imports without DI are auto-laid-out
- Versioned JSON envelope (`exportJson()` / `importJson()`,
  `toBpmnJson` / `fromBpmnJson`) with structural validation — a broken
  payload returns an error instead of clobbering the canvas
- Debounced `diagramChanged` autosave stream (`autoSaveDebounceMs`, default
  500 ms): emits the diagram pre-serialized to both JSON and XML, never
  mid-drag
- Static SVG export (`exportSvg()` / `renderDiagramSvg`): self-contained
  string, fitted viewBox, element colors honored
- Overlays API (`addOverlay` / `removeOverlay` / `clearOverlays`): HTML
  badges anchored to elements for process monitoring, tracking pan / zoom /
  model changes, rendered through Angular's sanitizing `[innerHTML]`

**Accessibility & i18n**

- Composed canvas accessibility: `role="application"`,
  `aria-activedescendant` element tracking and a polite live region that
  narrates every action (templates localizable)
- Keyboard editing end to end: Tab cycles elements, arrows move, `C`
  connects without a pointer, `A` appends, `F2` edits labels — search is
  fully keyboard-driven and works in read-only viewers
- Every user-facing string in `OgeBpmnMessages`, overridable per instance
  (`[messages]`) or app-wide (`provideOgeBpmnConfig()`)

## Install

```sh
npm i @oge-ui/bpmn
```

## Quick start

```ts
import { OgeBpmnEditor } from '@oge-ui/bpmn';
import type { OgeBpmnDiagramChangedEvent } from '@oge-ui/bpmn';

@Component({
  imports: [OgeBpmnEditor],
  template: ` <oge-bpmn-editor style="height: 480px" [(zoom)]="zoom" (diagramChanged)="onChanged($event)" /> `,
})
export class ProcessPage {
  readonly zoom = signal(1);

  // debounced autosave stream: the diagram arrives pre-serialized
  onChanged(event: OgeBpmnDiagramChangedEvent): void {
    localStorage.setItem('diagram', JSON.stringify(event.json));
  }
}
```

There is no `[diagram]` input — the model is owned by the editor's command
stack so undo can never desynchronize. Load with `importXml()` /
`importJson()`, observe with `elementsChanged` / `diagramChanged`, read back
with `exportXml()` / `exportJson()` / `exportSvg()`.

## Keyboard map

| Keys                           | Action                                                     |
| ------------------------------ | ---------------------------------------------------------- |
| `Tab` / `Shift+Tab`            | Cycle elements (leave the canvas with `Escape` then `Tab`) |
| Arrows (`Shift` = 1px)         | Move the selection by one grid step                        |
| `C`                            | Arm the connect tool (Tab/arrows pick a target, `Enter`)   |
| `A`                            | Append a connected task                                    |
| `H` / `L` / `S`                | Hand / lasso / space tool                                  |
| `F2` / `Enter`                 | Edit the label inline                                      |
| `Delete`                       | Delete the selection                                       |
| `Ctrl+Z` / `Ctrl+Y`            | Undo / redo                                                |
| `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Copy / cut / paste (internal clipboard, fresh ids)         |
| `Ctrl+A`                       | Select all                                                 |
| `Ctrl+F`                       | Element search (arrows + `Enter`, works in read-only)      |
| `+` / `−` / `F`                | Zoom in / out / zoom to fit                                |
| `Escape`                       | Cancel any tool or drag (never consumes an undo step)      |

## Engine without the component

The engine is framework-free and exported from the same barrel — usable in
Node for server-side or test pipelines:

```ts
import { readBpmnXml, writeBpmnXml, toBpmnJson, fromBpmnJson, renderDiagramSvg } from '@oge-ui/bpmn';

const { model, warnings } = readBpmnXml(xml);
if (model) {
  const svg = renderDiagramSvg(model); // self-contained static SVG
  const envelope = toBpmnJson(model); // versioned JSON persistence shape
}
```

## Theming

The shared theme files ship with `@oge-ui/grid` and style all suite
components:

```css
@import '@oge-ui/grid/themes/dark.css';
```

## For AI coding assistants

The complete machine-readable API reference ships inside the package at
`node_modules/@oge-ui/bpmn/llms.txt` — conventions, every documented member and
copy-pasteable demos in one file. Online: <https://ogeui.com/llms.txt> (index) and
<https://ogeui.com/llms-full.txt> (the whole suite).
