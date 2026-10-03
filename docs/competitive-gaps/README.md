# Competitive feature gaps (2026-10-03, main @ 0092025)

Component-by-component comparison of OGE UI 1.1.x against the paid suites:
**DevExtreme, Kendo UI for Angular/React, Syncfusion**, plus the specialists
of each area (AG Grid Enterprise, MUI X Premium, Bryntum, DHTMLX, Highcharts,
amCharts, AG Charts, bpmn-js/Camunda). Each family report lists every
competitor feature with who ships it, OGE's status (Have / Partial / Missing,
"Missing" verified by searching `packages/`), impact and effort. Uncertain
rows are marked _Unverified_ rather than counted as gaps.

Every family has a React twin on the same engine, so **each gap applies to
both render layers** and is fixed once in the shared core.

| Family                                                                | Report                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Data Grid, Tree List, Pivot, Filter Builder, Pager                    | [data-grid.md](data-grid.md)                                           |
| Scheduler, Gantt, Kanban                                              | [scheduling.md](scheduling.md)                                         |
| Charts + missing visualization components                             | [charts.md](charts.md)                                                 |
| Inputs, Forms, Upload + missing editors                               | [inputs-forms-upload.md](inputs-forms-upload.md)                       |
| Navigation, Layout, Overlay, Tabs, Buttons, BPMN + missing components | [navigation-layout-overlay-bpmn.md](navigation-layout-overlay-bpmn.md) |

## The overall picture

- **Depth is competitive; breadth is not.** Most existing components match or
  beat the paid suites on API depth, accessibility (keyboard, live
  announcements, forced colors, reduced motion) and React/Angular parity.
  Upload, forms, tree-select, the overlay services and the grid's remote/virtual
  data story are at or above the competition.
- **The gap is mostly "enterprise tier" features** in the big components
  (range selection, rich Excel export, scheduler time zones, Gantt
  constraints) **and missing components** (~65 shipped vs ~90–145 at the
  competitors).
- **Market trend:** every paid suite shipped AI features in 2025–26 (grid
  assistants, AI columns, smart paste, AI prompt/chat components). OGE has
  none; its serializable state (`applyState`) makes a natural-language → grid
  state bridge comparatively cheap.

## Highest-priority gaps across the suite

High impact, ranked by how many competitors ship it and how often users hit it.

| #   | Gap                                                                                                   | Family       | Effort |
| --- | ----------------------------------------------------------------------------------------------------- | ------------ | ------ |
| 1   | Cell range selection, range copy, multi-cell paste from Excel (+ fill handle)                         | Grid         | L      |
| 2   | Horizontal bar / rotated chart (`bar` draws columns only)                                             | Charts       | M      |
| 3   | Input masking engine (TextBox mask, MaskedTextBox, masked DateBox)                                    | Inputs       | M      |
| 4   | Scheduler time zones (display tz + per-appointment tz, RRULE `TZID`)                                  | Scheduler    | M–L    |
| 5   | Rich XLSX export: group rows with outline, summaries, bands, freeze panes, styles                     | Grid         | M      |
| 6   | Popover + confirm/alert/prompt dialog helpers                                                         | Overlay      | S      |
| 7   | Scheduler remote range loading + virtual scrolling for many resources                                 | Scheduler    | M      |
| 8   | Gantt dependency lag/lead, constraints, deadlines, manual/auto mode                                   | Gantt        | M      |
| 9   | Pinned top/bottom rows, sticky group rows; `rowClass`/`cellClass` + conditional formatting            | Grid         | S–M    |
| 10  | Excel-style column filter menu (value list + conditions, date tree to day)                            | Grid         | M      |
| 11  | Adaptive/mobile mode: full-screen/bottom-sheet popups, adaptive grid detail row                       | Inputs, Grid | M      |
| 12  | Remote load-on-scroll in dropdowns; TagBox catching up with SelectBox (templates, groups, select-all) | Inputs       | S–M    |
| 13  | Value-axis constant lines/strips, per-point colour, full data labels                                  | Charts       | S      |
| 14  | Sparkline (+ grid cell renderer) and Gauges packages                                                  | Charts       | S / M  |
| 15  | Pivot chart binding, calculated measures, Top-N / value filters                                       | Pivot        | M      |
| 16  | Chip/ChipList, ListView, Avatar, Badge, inline Alert                                                  | Layout/Nav   | S each |
| 17  | Gantt task list: inline editing, sort, filter, column resize; quarter/year scales                     | Gantt        | M      |
| 18  | Async validation in grid editing; built-in locale packs                                               | Grid, all    | S–M    |
| 19  | Rich text / HTML editor                                                                               | Inputs       | L      |
| 20  | TileLayout/Dashboard, Chat + AI Prompt                                                                | Layout       | M      |

## Missing components, by how many paid suites ship them

- **All three (DevExtreme, Kendo, Syncfusion):** ListView, Popover, confirm dialogs,
  FAB/SpeedDial, Carousel/ScrollView/Gallery, TileLayout/Dashboard,
  Sortable/Draggable utilities, Chat, non-modal Window, LoadPanel, Rich text
  editor, Masked input, Sparkline, Gauges, Funnel, Treemap, Map.
- **Two of three:** Chip/ChipList, Avatar, Badge, Timeline, ActionSheet, AppBar,
  circular progress, AI Prompt, FileManager, PDF Viewer, Spreadsheet,
  QR/Barcode, Smart Paste, Rating, OTP input, Signature pad, Multi-column
  combobox, ListBox/transfer, Heatmap, Sankey, Bullet chart, PanelBar.
- **One of three:** inline Message, BottomNavigation, Ribbon, Image editor,
  Mention, Knob, Cascader.

## Where OGE is ahead (keep these)

Keyboard move/resize in scheduler/gantt/kanban, built-in context menus and
reminders in the scheduler, Gantt critical path + baselines + undo/redo +
workload (Kendo lacks the first four), chart accessibility (keyboard
inspection, data table, announcements), upload (directory/paste/chunking/
pause-resume), forms (responsive layout, async rules, dirty tracking), overlay
services (async guards, cancelable pre-events, toast `promise()`), tree-select,
and full Angular ↔ React parity checked by CI.
