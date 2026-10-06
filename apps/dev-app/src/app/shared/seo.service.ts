import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import {
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  type Route,
} from '@angular/router';
import { filter } from 'rxjs';
import { documentTitle } from './title.strategy';

const ORIGIN = 'https://www.ogeui.com';

/** The home page's description, and the fallback for a route with no entry. */
const DEFAULT_DESCRIPTION =
  'OGE UI: free, signal-based components for Angular and React — virtualized Data Grid, Tree List, Pivot Grid, inputs and forms. Zoneless, themeable, accessible.';

/**
 * One meta description per indexable route — 140–160 characters that name
 * what *that* page shows, because a family-wide text repeated on every
 * sub-page makes search engines treat the pages as duplicates.
 *
 * A path matches its exact entry or, failing that, the longest entry that is a
 * whole-segment prefix of it, so the untitled demo children of a routed page
 * (`/components/tabs/routed/members`) read their page's text. Order does not
 * matter. `llms.txt` reuses the exact entries as link notes, and the `seo`
 * e2e spec fails when two prerendered pages share one.
 */
export const DESCRIPTIONS: readonly (readonly [string, string])[] = [
  [
    '/getting-started',
    'Get started with OGE UI: install the packages, render your first Angular data grid and form editors, and see how the open-source packages fit together.',
  ],
  [
    '/getting-started/setup',
    'Set up an Angular project for OGE UI: version requirements, npm install or ng add, optional export dependencies, application providers and a quick check.',
  ],
  [
    '/getting-started/styling',
    'Theme OGE UI with CSS design tokens: scoped overrides, Tailwind and Bootstrap bridge themes, dark mode, high contrast, reduced motion and component colors.',
  ],
  [
    '/getting-started/localization',
    'Localize OGE UI: global and per-component message overrides, switching language at runtime, validation messages and Intl number and date locales.',
  ],
  [
    '/getting-started/localization/api',
    'Localization API of OGE UI: provideOgeLocale, OgeLocaleProvider and the @oge-ui/locales packs for ten languages, lazy loaders and the message merge helper.',
  ],
  [
    '/ai',
    'Use OGE UI with AI coding assistants: llms.txt and llms-full.txt references, the ng add AGENTS.md block, the rules that matter and the mistakes models make.',
  ],
  [
    '/components',
    'Browse every OGE UI component family with live previews: data grid, tree list, pivot grid, charts, scheduler, gantt, kanban, inputs, forms and navigation.',
  ],
  [
    '/license',
    'OGE UI licensing: open-core, with the suite MIT forever and six enterprise packages — Pivot, BPMN, Scheduler, Gantt, Kanban and Charts — commercial.',
  ],
  [
    '/components/data-grid',
    'Angular Data Grid by OGE UI: row and column virtualization, sorting, filtering, grouping, editing, master-detail, remote data and Excel/PDF export. React too.',
  ],
  [
    '/components/data-grid/playground',
    'Interactive Angular Data Grid playground: toggle filtering, paging, virtual scroll, selection, grouping, editing and more, and copy the generated template.',
  ],
  [
    '/components/data-grid/sorting',
    'Angular Data Grid sorting and paging: click to sort, Shift+click for multi-column sort, a third click to clear, plus a pager with page sizes over 10k rows.',
  ],
  [
    '/components/data-grid/virtual-scroll',
    'Angular Data Grid virtual scrolling: thousands of rows in one scrollable list with only the visible window in the DOM — tune rowHeight and overscan.',
  ],
  [
    '/components/data-grid/infinite-scroll',
    'Angular Data Grid infinite scroll: a million remote rows, none preloaded — the grid fetches sparse 100-row blocks around the viewport as you drag the scrollbar.',
  ],
  [
    '/components/data-grid/remote-data',
    'Angular Data Grid remote data: delegate sorting, filtering, search and paging to a backend with CustomDataSource, cursor paging, debouncing and AbortSignal.',
  ],
  [
    '/components/data-grid/live-updates',
    'Angular Data Grid live updates: push batches through a DataSource changes stream and the grid patches rows in place, flashing changed cells without a reload.',
  ],
  [
    '/components/data-grid/columns',
    'Angular Data Grid columns: banded headers with column groups, lookup columns, calculated values, initial sort order, word wrap and responsive column hiding.',
  ],
  [
    '/components/data-grid/filtering',
    'Angular Data Grid filtering: a filter row with operators, Excel-style header filters, a highlighting search panel and a filter builder for and/or trees.',
  ],
  [
    '/components/data-grid/selection',
    'Angular Data Grid selection: checkbox and click selection with a filter-aware select-all, Ctrl and Shift ranges, keyboard cell navigation and row actions.',
  ],
  [
    '/components/data-grid/editing',
    'Angular Data Grid editing: row, cell, batch, form and popup modes with dirty markers, required-field validation, custom edit templates and save events.',
  ],
  [
    '/components/data-grid/grouping',
    'Angular Data Grid grouping: drag headers into the group panel, collapse group rows, show group and total summaries, pin columns and use the column chooser.',
  ],
  [
    '/components/data-grid/rows',
    'Angular Data Grid rows and templates: full row templates, a custom no-data state, row drag and drop reordering, a focused row and a loading panel.',
  ],
  [
    '/components/data-grid/persistence',
    'Angular Data Grid state persistence: save sorting, filters, grouping, widths, order and pins with stateKey, a custom storage backend or state()/applyState().',
  ],
  [
    '/components/data-grid/context-menu',
    'Angular Data Grid context menus: right-click rows for your own actions and headers for the built-in sort, group and column commands, with typed menu items.',
  ],
  [
    '/components/data-grid/master-detail',
    'Angular Data Grid master-detail: expand a row to render any component beneath it from a typed detail template, with treegrid semantics for screen readers.',
  ],
  [
    '/components/data-grid/range-selection',
    'Angular Data Grid range selection: drag or Shift+Arrow cell ranges, TSV copy, paste from Excel, a fill handle that extends series, Ctrl+Z undo and validation.',
  ],
  [
    '/components/data-grid/conditional-formatting',
    'Angular Data Grid conditional formatting: rowClass and cellClass hooks, declarative rules, data bars, color scales, icon sets, merged cells and auto-fit.',
  ],
  [
    '/components/data-grid/pinned-rows',
    'Angular Data Grid pinned rows: sticky top and bottom rows that survive virtual scroll, sticky group headers, row drag between grids and a go-to-page pager.',
  ],
  [
    '/components/data-grid/export',
    'Angular Data Grid Excel and PDF export: merged banded headers, frozen panes, collapsible group outlines, SUBTOTAL formulas, typed cells and styled formatting.',
  ],
  [
    '/components/data-grid/api',
    'Angular Data Grid API reference: every input, output, method and type of oge-grid and oge-column, plus data sources, grid types and the config provider.',
  ],
  [
    '/components/tree-list',
    'Angular Tree List by OGE UI: the data grid feature set on hierarchical data from flat parent-id rows or nested children — also available as a React component.',
  ],
  [
    '/components/tree-list/lazy-loading',
    'Angular Tree List lazy loading: hand the tree a DataSource and hasItemsExpr, and child rows are fetched from the server on demand the first time a node expands.',
  ],
  [
    '/components/tree-list/filtering',
    'Angular Tree List filtering and search: a filter row and search panel that keep every matching row’s ancestor chain visible, so a filtered tree stays a tree.',
  ],
  [
    '/components/tree-list/selection',
    'Angular Tree List selection: single and multiple row selection, plus recursive tri-state checkboxes where checking a parent selects its entire subtree.',
  ],
  [
    '/components/tree-list/virtual-scroll',
    'Angular Tree List virtual scroll: 100,000 nodes stay smooth because only visible branches are flattened and the DOM is windowed by a Fenwick-tree virtualizer.',
  ],
  [
    '/components/tree-list/drag-drop',
    'Angular Tree List drag and drop: drag a row by its handle onto another to reparent it with its subtree, guarded against cycles and with keyboard moving.',
  ],
  [
    '/components/tree-list/summaries',
    'Angular Tree List summaries: total footers over every visible row, recursive per-parent aggregates, both carried into Excel/PDF export, and remote filtering.',
  ],
  [
    '/components/tree-list/editing',
    'Angular Tree List editing: all five data grid edit modes on hierarchical rows, form layouts, and adding child rows under a chosen parent with initNewRow.',
  ],
  [
    '/components/tree-list/api',
    'Angular Tree List API reference: every input, output, method and type of oge-tree-list — hierarchy mapping, expansion, selection, editing and lazy data.',
  ],
  [
    '/components/buttons',
    'Angular Button by OGE UI: severities and styling modes, sizes, icons, custom colors and badges on a signal-based, accessible button — with a React twin.',
  ],
  [
    '/components/buttons/interactions',
    'Angular button interactions: async click handlers with automatic loading state, a click guard against double submits, hold-to-confirm and auto-repeat.',
  ],
  [
    '/components/buttons/button-group',
    'Angular Button Group: single selection on the WAI-ARIA radio pattern, multiple selection as toggle buttons, and data-driven items with two-way binding.',
  ],
  [
    '/components/buttons/drop-down-button',
    'Angular Drop Down Button and split button: menu items, a remembered last action, async item loading and custom panel content with full keyboard support.',
  ],
  [
    '/components/buttons/fab',
    'Angular Floating Action Button and Speed Dial by OGE UI: pinned FABs with safe-area insets, extended labels and an APG menu-button dial with arrow keys.',
  ],
  [
    '/components/buttons/api',
    'Angular Buttons API reference: every input, output and type of oge-button, oge-button-group and oge-drop-down-button, plus the buttons config provider.',
  ],
  [
    '/components/tabs',
    'Angular Tabs by OGE UI: declarative or data-driven tabs with lazy panels, keep-alive, closable tabs with async guards, overflow menus and drag reordering.',
  ],
  [
    '/components/tabs/routed',
    'Angular routed tabs: bind the oge-tabs selectedKey one-way from the URL and navigate on selectionChanged, so each tab is a child route with deep links.',
  ],
  [
    '/components/tabs/api',
    'Angular Tabs API reference: every input, output and type of oge-tab-panel, oge-tabs and oge-tab, including selection, overflow and the tabs config provider.',
  ],
  [
    '/components/forms',
    'Angular Form by OGE UI: declarative or data-driven items over the OGE editors, dataType-based editor selection, groups, label placement, templates and submit.',
  ],
  [
    '/components/forms/layout',
    'Angular form layout: fixed or auto-fit columns, container-query responsive layouts, nested groups, tab and accordion sections, read-only and visibility rules.',
  ],
  [
    '/components/forms/validation',
    'Angular form validation: declarative and cross-field rules, server errors, conditional fields, Signal Forms and reactive forms, and an accessible summary.',
  ],
  [
    '/components/forms/api',
    'Angular Forms API reference: every input, output and type of oge-form, oge-form-item, oge-form-group and oge-validation-summary, plus schema metadata.',
  ],
  [
    '/components/accordion',
    'Angular Accordion by OGE UI: WAI-ARIA panels with single or multiple expansion, lazy content, async guards, a nested panel bar and a standalone expansion panel.',
  ],
  [
    '/components/accordion/api',
    'Angular Accordion API reference: oge-accordion, oge-accordion-item, oge-panel-bar and oge-expansion-panel — every input, output, type and the config provider.',
  ],
  [
    '/components/progress',
    'Angular progress bar, circular ring, load indicator and skeleton: determinate, buffer, chunked and circular bars, spinners and placeholders with correct ARIA.',
  ],
  [
    '/components/progress/api',
    'Angular Progress & Loading API reference: every input, output and type of oge-progress-bar, oge-load-indicator, oge-load-panel and oge-skeleton, with configs.',
  ],
  [
    '/components/progress/load-panel',
    'Angular Load Panel by OGE UI: a shading overlay over a container or the page, with show delay, minimum display time, aria-busy and a screen-reader message.',
  ],
  [
    '/components/card',
    'Angular Card by OGE UI: header, full-bleed media, actions and footer as attribute slots, four chrome presets, horizontal layout and accessible clickable cards.',
  ],
  [
    '/components/card/api',
    'Angular Card API reference: every input and type of oge-card, the media, avatar, header-action, action, footer and separator slots, and the config provider.',
  ],
  [
    '/components/avatar',
    'Angular Avatar and Badge by OGE UI: image, initials and icon fallback, presence dots, avatar groups with +N overflow and count badges described to readers.',
  ],
  [
    '/components/avatar/api',
    'Angular Avatar & Badge API reference: every input, output and type of oge-avatar, oge-avatar-group and oge-badge, plus their config providers and messages.',
  ],
  [
    '/components/chip',
    'Angular Chip and Chip List by OGE UI: selectable and removable chips, single or multiple selection as an APG listbox, removable grids and Delete-key removal.',
  ],
  [
    '/components/chip/api',
    'Angular Chip API reference: every input, output, method and type of oge-chip and oge-chip-list, the chip template slot, removal events and the config provider.',
  ],
  [
    '/components/alert',
    'Angular Alert by OGE UI: inline info, success, warning and error messages with titles, actions and dismiss, role alert or status by severity, and custom icons.',
  ],
  [
    '/components/alert/api',
    'Angular Alert API reference: every input, output, method and type of oge-alert, the actions and icon slots, the cancelable closing event and config provider.',
  ],
  [
    '/components/timeline',
    'Angular Timeline by OGE UI: vertical or horizontal ordered-list timelines with alternating sides, markers, icons, severities, Intl dates and item templates.',
  ],
  [
    '/components/timeline/api',
    'Angular Timeline API reference: every input and type of oge-timeline, the content, marker and opposite template slots, item fields and the config provider.',
  ],
  [
    '/components/app-bar',
    'Angular App Bar by OGE UI: top and bottom bars with start, center and end sections, sticky or fixed placement with safe-area padding, colors and landmarks.',
  ],
  [
    '/components/app-bar/api',
    'Angular App Bar API reference: every input and type of oge-app-bar, the start, center and end slots, positions, colors, landmarks and the config provider.',
  ],
  [
    '/components/splitter',
    'Angular Splitter by OGE UI: resizable, collapsible, nestable panes on the WAI-ARIA window splitter pattern with ratio or pixel sizes, keyboard, RTL and touch.',
  ],
  [
    '/components/splitter/api',
    'Angular Splitter API reference: every input, output, method and type of oge-splitter and oge-splitter-pane, the separator ARIA and the config provider.',
  ],
  [
    '/components/toolbar',
    'Angular Toolbar by OGE UI: a WAI-ARIA command bar with roving tabindex, before, center and after groups, toggle commands and an overflow menu that adapts.',
  ],
  [
    '/components/toolbar/api',
    'Angular Toolbar API reference: every input, output, method and type of oge-toolbar and oge-toolbar-item, the overflow model and the config provider.',
  ],
  [
    '/components/stepper',
    'Angular Stepper by OGE UI: a linear or free wizard with step states, async leave guards, horizontal or vertical orientation and aria-current step semantics.',
  ],
  [
    '/components/drawer',
    'Angular Drawer by OGE UI: overlay, push or side panels with a focus trap when modal, a compact rail, responsive downgrade, close guards and an app shell layout.',
  ],
  [
    '/components/breadcrumb',
    'Angular Breadcrumb by OGE UI: a WAI-ARIA trail of real links with aria-current, collapsing middle crumbs into an ellipsis menu as its container narrows.',
  ],
  [
    '/components/breadcrumb/routed',
    'Angular Breadcrumb with the router: derive the trail from the current URL, keep every crumb a real link and let the router handle clicks — no router dependency.',
  ],
  [
    '/components/pagination',
    'Angular Pagination by OGE UI: a standalone pager with a numeric window and ellipses, page-size selector, info range, jump-to-page and an adaptive compact mode.',
  ],
  [
    '/components/menubar',
    'Angular Menubar by OGE UI: a WAI-ARIA menubar with roving tabindex, nested submenus, vertical layout, cancelable open and close events and a hamburger collapse.',
  ],
  [
    '/components/menubar/routed',
    'Angular Menubar with the router: bind activeKey from the URL to mark aria-current="page" and navigate on itemClick, while url items stay real links.',
  ],
  [
    '/components/tree-view',
    'Angular Tree View by OGE UI: flat or nested data, tri-state checkboxes with cascade, search, lazy loading, virtual scrolling and drag and drop reparenting.',
  ],
  [
    '/components/tree-view/api',
    'Angular navigation API reference: inputs, outputs and types of oge-tree-view, oge-drawer, oge-stepper, oge-menubar, oge-breadcrumb and oge-pagination.',
  ],
  [
    '/components/inputs',
    'Angular form inputs by OGE UI: TextBox, TextArea and NumberBox on one field chrome with styling modes, sizes, floating labels, prefix and suffix slots.',
  ],
  [
    '/components/inputs/validation',
    'Angular input validation: standalone validators, reactive forms and Signal Forms on OGE editors, linked fields and an async validation pending indicator.',
  ],
  [
    '/components/inputs/masked-text-box',
    'Angular MaskedTextBox: mask slots, escapes and custom rules, overwrite typing that skips literals, raw or formatted values and a mask validator for forms.',
  ],
  [
    '/components/inputs/select-box',
    'Angular Select Box and Tag Box: a searchable WAI-ARIA combobox with data mapping, grouping, remote paged data, templates, multi-select tags and select all.',
  ],
  [
    '/components/inputs/tree-select',
    'Angular Tree Select: a dropdown that picks values from a tree — nested data, search, single or multiple selection shown as chips and lazy loaded children.',
  ],
  [
    '/components/inputs/multi-column-combo-box',
    'Angular Multi-Column ComboBox: a combo box whose popup is a small grid with columns, formats, cell templates, multiple selection, remote data and APG keyboard.',
  ],
  [
    '/components/inputs/autocomplete',
    'Angular Autocomplete: suggestions as you type with tunable matching, force selection, virtual scrolling, lazy server-side data and full keyboard support.',
  ],
  [
    '/components/inputs/toggle-controls',
    'Angular CheckBox, Switch, RadioGroup and ToggleGroup: tri-state checkboxes, on/off switches, radio choices and segmented toggles bound to Signal Forms.',
  ],
  [
    '/components/inputs/check-box-group',
    'Angular CheckBoxGroup: an items-bound list of checkboxes with an array value, horizontal, vertical or column layouts, a tri-state select all and validation.',
  ],
  [
    '/components/inputs/slider',
    'Angular Slider and RangeSlider: WAI-ARIA single and multi-thumb sliders with ticks, labels, a value indicator, step buttons, vertical mode and form binding.',
  ],
  [
    '/components/inputs/date-box',
    'Angular DateBox and Calendar: date, time and datetime pickers, range selection with presets, masked segment entry, a clock and data grid integration.',
  ],
  [
    '/components/inputs/color-box',
    'Angular ColorBox: a color picker dropdown with hex, rgb and hsl output, alpha, a swatch palette view, apply buttons and parsing of any typed CSS color.',
  ],
  [
    '/components/inputs/color-gradient',
    'Angular ColorGradient: an inline color picker with a saturation surface, hue and alpha sliders, hex and RGBA inputs and a live WCAG contrast-ratio check.',
  ],
  [
    '/components/inputs/color-palette',
    'Angular ColorPalette: a standalone swatch grid with preset palettes, custom swatches, configurable columns and APG grid keyboard navigation as a form value.',
  ],
  [
    '/components/inputs/rating',
    'Angular Rating: stars or custom icons with half and fractional precision, hover preview, clear on re-click, read-only mode, RTL and slider or radio-group keys.',
  ],
  [
    '/components/inputs/otp-input',
    'Angular OTP input: one-time-code cells with numeric or alphanumeric filtering, paste and SMS autofill, arrow and Backspace keys, masking and a completion event.',
  ],
  [
    '/components/inputs/signature-pad',
    'Angular signature pad: smooth pointer strokes, undo and clear, PNG or SVG data URL output, a keyboard-accessible typed signature mode and resize-safe redraws.',
  ],
  [
    '/components/inputs/list-box',
    'Angular ListBox: a WAI-ARIA listbox with single or multiple selection, groups, item templates, type-ahead, search and range selection as a form value.',
  ],
  [
    '/components/inputs/transfer-list',
    'Angular TransferList: a dual list box moving selected or all items by buttons, drag and drop or keyboard shortcuts, with per-list search and live announcements.',
  ],
  [
    '/components/inputs/mention',
    'Angular Mention: @ and # triggers in a text area with a caret-anchored suggestion popup, async sources, custom item templates and the mentioned items as output.',
  ],
  [
    '/components/inputs/showcase',
    'Angular input showcase: a character counter, password reveal and copy buttons, locale-aware number entry and debounced value commits on OGE text editors.',
  ],
  [
    '/components/inputs/api',
    'Angular Inputs API reference: every input, output and type of the OGE editors — text, masked, number, select, tag, date, color, slider and choice controls.',
  ],
  [
    '/components/overlay',
    'Angular overlay primitives by OGE UI: flip-aware anchored panels, popups and WAI-ARIA menu lists — the positioning engine behind every OGE dropdown and menu.',
  ],
  [
    '/components/overlay/tooltip-context-menu',
    'Angular Tooltip and Context Menu directives: placement, show and hide delays, right-click menus on any element with nested items and typed menu events.',
  ],
  [
    '/components/overlay/popover',
    'Angular Popover by OGE UI: anchored dialogs with title, actions and a callout arrow; click, hover, focus or manual triggers, modal focus trap, typed events.',
  ],
  [
    '/components/overlay/modal',
    'Angular Modal dialog: confirm, alert and prompt helpers, nine placements, full screen, drag and resize, a modal service, async close guards and typed results.',
  ],
  [
    '/components/overlay/toast',
    'Angular Toast notifications: severities, positions and stacking, sticky toasts with actions and undo, promise toasts, coalescing, progress and announcements.',
  ],
  [
    '/components/overlay/window',
    'Angular Window by OGE UI: non-modal floating windows with shared z-order, title-bar drag, 8-way resize, keyboard move, minimize, maximize and placements.',
  ],
  [
    '/components/overlay/api',
    'Angular Overlay API reference: oge-modal, the modal and toast services, live announcer, tooltip, context menu, menu list, anchored panel, popup and positions.',
  ],
  [
    '/components/pivot-grid',
    'Angular Pivot Grid by OGE UI: cross-tab analytics over raw records with rows, columns and measures, grand totals, a field panel and sorting — React too.',
  ],
  [
    '/components/pivot-grid/analytics',
    'Angular Pivot Grid analytics: percent-of-total and running-sum display modes, two-axis virtual scrolling, persisted layouts, and CSV or Excel export.',
  ],
  [
    '/components/pivot-grid/chart-integration',
    'Angular Pivot Grid with charts: getChartData turns the pivot view into chart series, resultChange keeps a linked chart in sync and row clicks narrow it.',
  ],
  [
    '/components/pivot-grid/calculated-fields',
    'Angular Pivot Grid calculated fields and filters: measures computed from other measures, Top N, label and value filters, row header layouts and PDF export.',
  ],
  [
    '/components/pivot-grid/api',
    'Angular Pivot Grid API reference: every input, output, method and type of oge-pivot-grid and oge-pivot-field, from areas and summaries to export options.',
  ],
  [
    '/components/bpmn',
    'Angular BPMN Editor by OGE UI: a BPMN 2.0 modeler with palette, orthogonal routing, undo/redo, XML import and export, autosave and no watermark. React too.',
  ],
  [
    '/components/bpmn/validation',
    'Angular BPMN Editor validation: bpmnlint-style rules, live badges, a problems panel, custom rules and severity overrides, and validate() for headless CI checks.',
  ],
  [
    '/components/bpmn/extending',
    'Extending the Angular BPMN Editor: pluggable properties providers, custom palette and context-pad entries, safe SVG renderers and Camunda element templates.',
  ],
  [
    '/components/bpmn/camunda',
    'Angular BPMN Editor for Camunda and Zeebe: editable task definitions, io mappings, headers and assignments, timer and message payloads, and PNG export.',
  ],
  [
    '/components/bpmn/api',
    'BPMN Editor API reference: every input, output, method and type of oge-bpmn-editor and the dependency-free BPMN XML and diagram-interchange engine.',
  ],
  [
    '/components/charts',
    'Angular Charts by OGE UI: line, bar, area, candlestick, pie, polar and range selector charts on an SVG kernel with zoom, pan, tooltips and annotations.',
  ],
  [
    '/components/charts/axes-layout',
    'Chart axes and layout: rotated horizontal bars, price and volume panes, constant lines and strips, axis breaks, tick intervals, RTL, pinch zoom and draw-in.',
  ],
  [
    '/components/charts/gauges',
    'Angular gauges and sparklines: circular and linear gauges with ranges and needle, bar or marker indicators, bullet charts and word-sized sparklines.',
  ],
  [
    '/components/charts/specialized',
    'Funnel, pyramid, heatmap, treemap, sunburst, Sankey and GeoJSON vector map charts with drill-down, colour scales, zoom and full keyboard access.',
  ],
  [
    '/components/charts/api',
    'Angular Charts API reference: every input, output and type of the cartesian, pie, polar, gauge, sparkline, funnel, heatmap, treemap, Sankey and map charts.',
  ],
  [
    '/components/gantt',
    'Angular Gantt chart by OGE UI: task tree and timeline with dependencies, critical path, baselines, drag editing, work calendars, undo/redo and export.',
  ],
  [
    '/components/gantt/scheduling',
    'Angular Gantt scheduling: lag and lead on every link type, constraints, deadlines, manual tasks, slack, conflicts, baselines, split tasks and progress line.',
  ],
  [
    '/components/gantt/resources',
    'Angular Gantt resources: assignment units, effort-driven durations, a utilization histogram with over-allocation and a resource-centric view.',
  ],
  [
    '/components/gantt/task-list',
    'Angular Gantt task list: inline cell editing, header sorting, filter row and search, column resize, reorder and freeze, multi-select with bulk edits.',
  ],
  [
    '/components/gantt/import-export',
    'Angular Gantt MS Project XML import and export: tasks, links with lag, constraints, baselines, resources, assignments and calendars, no dependencies.',
  ],
  [
    '/components/gantt/api',
    'Angular Gantt API reference: every input, output, method and type of oge-gantt — task and dependency field mapping, scales, editing and the config provider.',
  ],
  [
    '/components/upload',
    'Angular file upload by OGE UI: drag and drop with directories and paste, restrictions with reasons, image previews, and chunked, resumable transfer with retry.',
  ],
  [
    '/components/upload/api',
    'Angular Upload API reference: every input, output, method and type of oge-file-uploader, the upload adapter and transport contract and the config provider.',
  ],
  [
    '/components/kanban',
    'Angular Kanban board by OGE UI: columns, swimlanes and WIP limits, virtualized cards, drag and drop with Escape-cancel, keyboard moving and an edit dialog.',
  ],
  [
    '/components/kanban/filtering',
    'Angular Kanban filtering and sorting by OGE UI: tag, assignee and priority filter chips, predicate filters, per-column sort menus and CSV or Excel card export.',
  ],
  [
    '/components/kanban/multi-select',
    'Angular Kanban multi-select by OGE UI: Ctrl and Shift selection, multi-card drag, drag between boards, swimlane WIP limits, quick add, checklists and undo.',
  ],
  [
    '/components/kanban/api',
    'Angular Kanban API reference: every input, output, method and type of oge-kanban — card field mapping, columns, swimlanes, templates and config provider.',
  ],
  [
    '/components/scheduler',
    'Angular Scheduler by OGE UI: day, week, month, year, agenda and timeline views with drag and resize, recurrence, teams, appointment popups and form editing.',
  ],
  [
    '/components/scheduler/api',
    'Angular Scheduler API reference: every input, output, method and type of oge-scheduler — appointment field mapping, views, editing and the config provider.',
  ],
  [
    '/components/scheduler/views-grouping',
    'Angular Scheduler views and grouping: N-day and N-week views, month and year timelines, week numbers, nested resource groups, vertical layout, +N more.',
  ],
  [
    '/components/scheduler/resources-availability',
    'Angular Scheduler availability: hatched disabled slots, per-resource work hours, conflict checks, external drag-in, multi-select, copy, paste, undo.',
  ],
  [
    '/components/scheduler/recurrence-editor',
    'Angular Scheduler recurrence editor: nth and last weekday rules, several month days, yearly patterns, count or until, skipped dates, live summary.',
  ],
  [
    '/components/scheduler/import-export',
    'Angular Scheduler import and export: iCalendar .ics export and import with series and overrides, PDF and Excel list exports and print of the current view.',
  ],
  [
    '/components/scheduler/time-zones',
    'Angular Scheduler time zones: display timeZone, per-appointment start and end zones, DST-exact 23- and 25-hour days, TZID recurrence and zone pickers.',
  ],
  [
    '/components/scheduler/remote-data',
    'Angular Scheduler remote data: load appointments per visible range with prefetch, debounce, AbortSignal, a range cache, CRUD write-back and reload().',
  ],
];

/** The meta description for `path` (no query or fragment). */
export function descriptionFor(path: string): string {
  let best: readonly [string, string] | undefined;
  for (const entry of DESCRIPTIONS) {
    const [prefix] = entry;
    if (path !== prefix && !path.startsWith(`${prefix}/`)) continue;
    if (!best || prefix.length > best[0].length) best = entry;
  }
  return best?.[1] ?? DEFAULT_DESCRIPTION;
}

const BREADCRUMBS_ID = 'oge-breadcrumbs';

/** `OGE — Data Grid Filtering` → `Data Grid Filtering`. */
function pageName(title: string): string {
  return title.replace(/^OGE\s*[—–-]\s*/u, '').trim();
}

/** The route `title` declared at `path` (no leading slash), walking `routes`. */
function titleAt(
  routes: readonly Route[],
  path: string,
  prefix = '',
): string | undefined {
  for (const route of routes) {
    if (typeof route.path !== 'string' || route.redirectTo) continue;
    const full = [prefix, route.path].filter(Boolean).join('/');
    if (full === path && typeof route.title === 'string') return route.title;
    if (
      route.children &&
      (full === '' || full === path || path.startsWith(`${full}/`))
    ) {
      const found = titleAt(route.children, path, full);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Keeps canonical URL, meta description, Open Graph tags and the
 * `BreadcrumbList` JSON-LD in sync with the active route — the SPA equivalent
 * of per-page head tags. It runs during prerendering too, so every static
 * page ships its own.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => this.update(event.urlAfterRedirects));
  }

  private update(url: string): void {
    const path = url.split(/[?#]/)[0];
    const page = this.titledPage();
    const canonicalPath = page?.canonical ?? path;
    const canonicalUrl = ORIGIN + (canonicalPath === '/' ? '/' : canonicalPath);

    let canonical = this.document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      this.document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    const description = descriptionFor(path);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    // The route `title` is applied by Angular's TitleStrategy on the same
    // NavigationEnd; read it from the router state rather than document.title
    // so prerendered HTML carries the right og/twitter title too.
    const title = documentTitle(page?.title, url);
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ name: 'twitter:title', content: title });

    this.writeJsonLd(
      BREADCRUMBS_ID,
      page && canonicalPath !== '/'
        ? this.breadcrumbs(canonicalPath, page.path, pageName(page.title))
        : null,
    );
  }

  /**
   * The deepest route that declares a `title` — the page being read — with
   * its path and canonical path. The untitled children of a routed demo
   * (`/components/tabs/routed/members`) are states of one page, so they
   * canonicalize to its landing child rather than competing with it.
   */
  private titledPage():
    { title: string; path: string; canonical: string } | undefined {
    let route: ActivatedRouteSnapshot | null =
      this.router.routerState.snapshot.root;
    const segments: string[] = [];
    let page: { title: string; path: string; route: Route } | undefined;
    let leaf: Route | null = null;
    while (route) {
      segments.push(...route.url.map((segment) => segment.path));
      const config = route.routeConfig;
      if (config) leaf = config;
      if (config && typeof config.title === 'string') {
        page = {
          title: config.title,
          path: `/${segments.join('/')}`,
          route: config,
        };
      }
      route = route.firstChild;
    }
    if (!page) return undefined;
    let canonical = page.path === '/' ? '/' : page.path;
    if (leaf !== page.route && page.route.children) {
      const landing = page.route.children.find(
        (child) => child.path && !child.redirectTo,
      );
      if (landing) canonical = `${page.path}/${landing.path}`;
    }
    return { title: page.title, path: page.path, canonical };
  }

  /** Home → Components → Family → Page, as schema.org `BreadcrumbList`. */
  private breadcrumbs(
    canonicalPath: string,
    pagePath: string,
    name: string,
  ): object {
    const crumbs: { name: string; url: string }[] = [
      { name: 'Home', url: `${ORIGIN}/` },
    ];
    const [section, family] = pagePath.slice(1).split('/');
    if (section === 'components' && family) {
      crumbs.push({ name: 'Components', url: `${ORIGIN}/components` });
      const familyPath = `components/${family}`;
      const familyTitle = titleAt(this.router.config, familyPath);
      if (familyTitle && `/${familyPath}` !== pagePath) {
        crumbs.push({
          name: pageName(familyTitle),
          url: `${ORIGIN}/${familyPath}`,
        });
      }
    } else if (section === 'getting-started' && family) {
      crumbs.push({
        name: 'Getting Started',
        url: `${ORIGIN}/getting-started`,
      });
    }
    crumbs.push({ name, url: ORIGIN + canonicalPath });
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    };
  }

  /** Writes (or, for `null`, removes) one JSON-LD block in the head. */
  private writeJsonLd(id: string, data: object | null): void {
    let script = this.document.getElementById(id);
    if (!data) {
      script?.remove();
      return;
    }
    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', id);
      this.document.head.appendChild(script);
    }
    // `<` escaped so no string can close the script element early
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  }
}
