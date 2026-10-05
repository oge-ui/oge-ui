// Hand-compiled from packages/kanban/src/lib/** — keep in sync with the
// source TSDoc.
import type { ApiSections } from '../../shared/api-reference';

/**
 * Type blocks shared verbatim by the Angular and React API pages: the
 * filter / sort / selection / transfer / export shapes live in
 * `@oge-ui/kanban-engine`, so both layers export the same names.
 */
export const KANBAN_G3B_TYPE_BLOCKS: NonNullable<ApiSections['types']> = [
  {
    title: 'Filtering, sorting & selection types',
    entries: [
      {
        name: 'OgeKanbanFilter&lt;T&gt;',
        type: 'type',
        description:
          '<code>((card: OgeKanbanCard&lt;T&gt;) =&gt; boolean) | OgeKanbanFilterExpression</code> — the <code>filter</code> input&#39;s shape.',
      },
      {
        name: 'OgeKanbanFilterExpression',
        type: 'interface',
        description:
          '<code>{ tags?, assignees?, priorities?, columns?, swimlanes?, text?, overdue? }</code> — any-of inside a field, all-of across fields; also the chip bar&#39;s <code>filterValue</code>.',
      },
      {
        name: 'OgeKanbanColumnSort&lt;T&gt;',
        type: 'type',
        description:
          "<code>Readonly&lt;Record&lt;string, OgeKanbanColumnSortSpec&lt;T&gt;&gt;&gt;</code> keyed by column (<code>'*'</code> = every column).",
      },
      {
        name: 'OgeKanbanColumnSortSpec&lt;T&gt;',
        type: 'type',
        description:
          '<code>{ field: OgeKanbanSortField; direction?: &#39;asc&#39; | &#39;desc&#39; }</code> or a card comparator (ties fall back to the board order).',
      },
      {
        name: 'OgeKanbanSortField',
        type: "'order' | 'title' | 'priority' | 'dueDate'",
        description:
          'Sort fields; ascending priority puts the most important first, empty due dates sort last in both directions.',
      },
      {
        name: 'OgeKanbanSelectionMode',
        type: "'single' | 'multiple'",
        description: 'The <code>selectionMode</code> union.',
      },
      {
        name: 'OgeKanbanCardTransferringEvent&lt;T&gt; / OgeKanbanCardTransferredEvent&lt;T&gt;',
        type: 'interface',
        description:
          'Cross-board transfer payloads: board ids, from/to column and lane, insertion index; the past-tense one carries both <code>cards</code> (as landed) and <code>sourceCards</code>.',
      },
    ],
  },
  {
    title: 'Export',
    entries: [
      {
        name: 'OgeKanbanExportData',
        type: 'interface',
        description:
          '<code>{ rows, messages, locale, hasSwimlanes }</code> — what <code>getExportData()</code> returns and both exporters read.',
      },
      {
        name: 'OgeKanbanExportRow',
        type: 'interface',
        description:
          '<code>{ key, title, column, columnKey, swimlane, description, tags, assignees, priority, dueDate, checklistDone, checklistTotal }</code>.',
      },
      {
        name: 'OgeKanbanExportOptions',
        type: 'interface',
        description:
          '<code>{ visibleOnly? }</code> — only the cards the filters and search show.',
      },
      {
        name: 'OgeKanbanExportMessages',
        type: 'interface',
        description:
          'The optional <code>export</code> messages block: <code>sheetName</code> and every column header (English fallback when a catalog omits it).',
      },
      {
        name: 'exportKanbanToExcel(board, options?)',
        type: '(board, options?: OgeKanbanExcelExportOptions) =&gt; Promise&lt;void&gt;',
        description:
          'The lazy <code>/export-excel</code> entry (optional <code>exceljs</code> peer): one row per card, due dates as real dates, tags/assignees joined with <code>; </code>. Pass the board instance (Angular) or its ref handle (React).',
      },
      {
        name: 'buildKanbanExcelWorkbook(data, options?)',
        type: '(data: OgeKanbanExportData, options?) =&gt; Workbook',
        description:
          'The pure builder behind it, shared by both layers through <code>@oge-ui/kanban-engine/export-excel</code>.',
      },
      {
        name: 'OgeKanbanExcelExportOptions',
        type: 'interface',
        description:
          '<code>{ filename?, sheetName?, visibleOnly? }</code> (defaults <code>kanban.xlsx</code> / the <code>export.sheetName</code> message).',
      },
    ],
  },
];

export const OGE_KANBAN_API: ApiSections = {
  properties: [
    {
      title: 'Data',
      entries: [
        {
          name: 'dataSource',
          type: 'readonly T[]',
          default: '[]',
          description:
            'Card items — a plain array, copied into an internal working set; the input is never mutated. Edits surface through the past-tense events.',
        },
        {
          name: 'keyExpr / columnExpr / titleExpr / descriptionExpr / colorExpr',
          type: 'string | ((item: T) =&gt; unknown)',
          default: "'id' / 'status' / 'title' / 'description' / 'color'",
          description:
            'Card field mapping: names (dotted paths reach nested objects) or getter functions. <code>columnExpr</code> holds the card&#39;s column key; a card with no resolvable column lands in the untitled column instead of being dropped.',
        },
        {
          name: 'orderExpr',
          type: 'string | ((item: T) =&gt; unknown) | undefined',
          default: 'undefined',
          description:
            'Numeric in-column sort order. Unset, the array order is the board order and moves reorder the working set; set, moves write a midpoint order value back onto the item (sequential renumber of the cell when the midpoint has no room).',
        },
        {
          name: 'swimlaneExpr',
          type: 'string | ((item: T) =&gt; unknown) | undefined',
          default: 'undefined',
          description:
            'Set = the board renders collapsible swimlane rows (first-seen data order); each lane holds every column.',
        },
        {
          name: 'tagsExpr / assigneeExpr',
          type: 'string | ((item: T) =&gt; unknown) | undefined',
          default: 'undefined',
          description:
            'Tag chips and assignee avatars (initials). Both accept a single value <em>or</em> an array — write-back preserves the storage shape.',
        },
        {
          name: 'dueDateExpr / priorityExpr',
          type: 'string | ((item: T) =&gt; unknown) | undefined',
          default: 'undefined',
          description:
            "Due-date badge (danger when overdue; formatted through <code>locale</code>) and the priority indicator (colored by value: <code>'low'</code> green, <code>'medium'</code>/<code>'normal'</code> amber, <code>'high'</code>/<code>'urgent'</code>/<code>'critical'</code> red).",
        },
        {
          name: 'searchExprs',
          type: 'readonly (string | ((item: T) =&gt; unknown))[] | undefined',
          default: 'undefined',
          description:
            'Extra fields the toolbar search matches, beyond the built-in title + description + tags + assignees haystack. Matching is fold-insensitive (accents, Turkish İ/i).',
        },
        {
          name: 'columns',
          type: 'readonly OgeKanbanColumn[] | undefined',
          default: 'undefined',
          description:
            'Declared columns (<code>{ key, title?, color?, wipLimit?, minCount?, collapsed?, allowAdding?, allowDrag?, allowDrop?, transitionColumns? }</code>); unset = derived from the data&#39;s distinct column keys in first-seen order. Cards in undeclared columns stay in the data but leave the view.',
        },
      ],
    },
    {
      title: 'State (two-way)',
      entries: [
        {
          name: 'collapsedColumns / collapsedSwimlanes',
          type: 'model&lt;readonly string[]&gt;',
          default: '[]',
          description:
            'Collapsed column keys (slim vertical pills) and collapsed swimlane keys.',
        },
        {
          name: 'columnOrder',
          type: 'model&lt;readonly string[]&gt;',
          default: '[]',
          description:
            'Persisted column key order (empty = declared order); written by header drags when <code>allowColumnReordering</code> is on.',
        },
        {
          name: 'selectedCardKey',
          type: 'model&lt;unknown&gt;',
          default: 'null',
          description:
            'The primary (focused / anchor) selected card&#39;s key. With <code>selectionMode: &#39;multiple&#39;</code> the full set is <code>selectedCardKeys</code>.',
        },
        {
          name: 'selectedCardKeys',
          type: 'model&lt;readonly unknown[]&gt;',
          default: '[]',
          description:
            'Every selected card key, in board order. Ctrl/⌘-click toggles, Shift-click selects the range in the anchor&#39;s column, <kbd>Ctrl</kbd>+<kbd>A</kbd> on a card selects its column (cell), <kbd>Ctrl</kbd>+<kbd>Space</kbd> toggles, <kbd>Shift</kbd>+<kbd>↑/↓</kbd> extends and <kbd>Escape</kbd> collapses to the focused card. Selected cards travel together in a drag (the ghost shows the count), <kbd>Ctrl</kbd>+<kbd>←/→</kbd> and <kbd>Delete</kbd>.',
        },
        {
          name: 'filterValue',
          type: 'model&lt;OgeKanbanFilterExpression&gt;',
          default: '{}',
          description:
            'The filter chip bar&#39;s state — active <code>tags</code> / <code>assignees</code> / <code>priorities</code>. Bind it two-way to persist or preset the chips; it ANDs with <code>filter</code> and the toolbar search.',
        },
        {
          name: 'columnSort',
          type: 'model&lt;OgeKanbanColumnSort&lt;T&gt;&gt;',
          default: '{}',
          description:
            "Per-column card sort: a column key (or <code>'*'</code> for every column) mapped to <code>{ field: 'order' | 'title' | 'priority' | 'dueDate', direction? }</code> or a comparator over normalized cards. The column menu (the header&#39;s sort button or a right-click) writes it. Unset columns keep <code>orderExpr</code> / array order; a drop into a sorted column lands where the sort puts it.",
        },
      ],
    },
    {
      title: 'Filtering, selection & transfers',
      entries: [
        {
          name: 'filter',
          type: 'OgeKanbanFilter&lt;T&gt; | undefined',
          default: 'undefined',
          description:
            'Programmatic card filter: a predicate over the normalized card, or an <code>OgeKanbanFilterExpression</code> (<code>{ tags?, assignees?, priorities?, columns?, swimlanes?, text?, overdue? }</code> — values inside a field are alternatives, fields combine with AND). Filters only what is shown: WIP counts, exports (unless <code>visibleOnly</code>) and the chips stay on the full data.',
        },
        {
          name: 'showFilterBar',
          type: 'boolean',
          default: 'false',
          description:
            'Shows the filter chip bar under the toolbar: one toggle chip (<code>aria-pressed</code>) per distinct tag, assignee and priority, plus a reset button.',
        },
        {
          name: 'priorityOrder',
          type: 'readonly string[] | undefined',
          default: 'undefined',
          description:
            'Priority ranking for <code>columnSort</code> by priority, most important first (case-insensitive). Unset: <code>urgent, critical, highest, high, medium, normal, low, lowest</code>; numeric priorities compare as numbers.',
        },
        {
          name: 'selectionMode',
          type: "'single' | 'multiple'",
          default: "'multiple'",
          description:
            "<code>'multiple'</code> adds Ctrl/Shift-click, the selection shortcuts and multi-card drag; <code>'single'</code> keeps one selected card.",
        },
        {
          name: 'dragGroup / boardId',
          type: 'string | undefined',
          default: 'undefined',
          description:
            'Boards sharing a <code>dragGroup</code> exchange cards: drag a card (or a selection) onto the other board, or use the card menu&#39;s “Move to …” entries — the keyboard and single-pointer twin. <code>boardId</code> names the board in the transfer events and the other boards&#39; menus (a generated id otherwise).',
        },
        {
          name: 'swimlaneWipLimits',
          type: 'Readonly&lt;Record&lt;string, number&gt;&gt; | undefined',
          default: 'undefined',
          description:
            'Per-lane total WIP limits keyed by swimlane value — the lane header&#39;s count turns danger when exceeded. Per-cell limits are <code>OgeKanbanColumn.swimlaneWipLimit</code> (the column inside each lane).',
        },
        {
          name: 'checklistExpr',
          type: 'string | ((item: T) =&gt; unknown) | undefined',
          default: 'undefined',
          description:
            'Checklist / sub-task field: an array of <code>{ text, done }</code> (<code>title</code> / <code>checked</code> / <code>completed</code> and plain strings are read too). Cards show a progress badge with an ICU-plural screen-reader text; <code>toggleChecklistItem()</code> writes back in the entry&#39;s own shape.',
        },
        {
          name: 'quickAdd / inlineTitleEditing',
          type: 'boolean',
          default: 'false / false',
          description:
            '<code>quickAdd</code>: the column footer&#39;s add button opens an inline title composer (Enter adds and keeps it open, Escape closes) instead of the dialog. <code>inlineTitleEditing</code>: double-clicking a card title edits it in place; <kbd>F2</kbd> on a card always does (both through <code>cardAdding</code> / <code>cardUpdating</code>).',
        },
        {
          name: 'undoLimit',
          type: 'number',
          default: '50',
          description:
            'Undo/redo depth — <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> (or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>) and the toolbar buttons. Undo replays the inverse through the cancelable pipelines, so the <code>-ing</code> / <code>-ed</code> events fire as for the original edit; a multi-card move or bulk delete is one step. Cross-board transfers are not recorded (they span two boards). <code>0</code> disables history and hides the buttons.',
        },
      ],
    },
    {
      title: 'Behavior',
      entries: [
        {
          name: 'virtualScrolling',
          type: 'boolean',
          default: 'true',
          description:
            'Per-column card windowing over a fixed <code>cardHeight</code> — 10k cards stay smooth. Rich variable-height templates may opt out (<code>false</code>), the documented exception.',
        },
        {
          name: 'cardHeight',
          type: 'number | undefined',
          default: 'undefined (config: 112)',
          description:
            'Fixed card height in px; also drives the drag hit-testing and the keyboard scroll-into-view math.',
        },
        {
          name: 'showToolbar',
          type: 'boolean',
          default: 'true',
          description:
            'The built-in toolbar: primary add button, collapse/expand-all pill and the search box.',
        },
        {
          name: 'allowAdding / allowUpdating / allowDeleting / allowDragging / allowColumnReordering / allowColumnAdding',
          type: 'boolean',
          default: 'true / true / true / true / false / false',
          description:
            'Capability gates for the toolbar, dialog, menu, hover quick actions, keyboard shortcuts and drags. <code>allowColumnAdding</code> renders the "+ Add column" ghost column (inline composer → cancelable <code>columnAdding</code> → <code>columnAdded</code>). Per-column <code>allowAdding: false</code> overrides the board.',
        },
        {
          name: 'columnWidth',
          type: 'number',
          default: '300',
          description:
            'Fixed column track width in px — headers stay legible and the board scrolls horizontally, Trello-style.',
        },
        {
          name: 'cardColorMode',
          type: "'stripe' | 'surface'",
          default: "'stripe'",
          description:
            "How <code>colorExpr</code> renders: an accent bar on the card's edge, or the whole card surface tinted with the color.",
        },
        {
          name: 'rtlEnabled',
          type: 'boolean | undefined',
          default: 'undefined',
          description:
            'Right-to-left layout: the first column sits on the right, ArrowLeft/Right roving and Ctrl+Arrow card moves are mirrored (ArrowLeft goes to the next column), the column-reorder drag and drop hit-testing follow the mirrored geometry and the collapsed-lane chevron points left. Unset follows the page — the computed <code>direction</code> or the nearest <code>dir</code> attribute, read after the first render and kept current when a <code>dir</code> changes; an explicit value also sets <code>dir</code> on the host.',
        },
        {
          name: 'dialogItems',
          type: 'readonly OgeFormItemData[] | undefined',
          default: 'undefined',
          description:
            'Replaces the edit dialog&#39;s default form wholesale (generic <code>OgeForm</code> items); <code>cardEditDialogShowing</code> can still adjust per open. The default form only renders editors for fields the board actually maps.',
        },
        {
          name: 'readOnly',
          type: 'boolean',
          default: 'false',
          description:
            'One switch over every <code>allow*</code> capability; the context menu falls back to the browser&#39;s native menu.',
        },
        {
          name: 'messages / locale',
          type: 'Partial&lt;OgeKanbanMessages&gt; / string | undefined',
          default: '{} / undefined',
          description:
            'Per-instance overrides of the DI config (<code>provideOgeKanbanConfig</code>). Every user-facing string, aria labels and live-region templates included, lives in the messages interface; <code>locale</code> drives every Intl format.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Methods',
      entries: [
        {
          name: 'addCard(item)',
          type: '(item: T) =&gt; void',
          description:
            'Programmatic insert through the cancelable <code>cardAdding</code> pipeline; the column and swimlane resolve from the item&#39;s own fields.',
        },
        {
          name: 'updateCard(original, updated)',
          type: '(original: T, updated: T) =&gt; void',
          description:
            'Programmatic update through the cancelable <code>cardUpdating</code> pipeline.',
        },
        {
          name: 'deleteCard(item)',
          type: '(item: T) =&gt; void',
          description:
            'Programmatic delete through the cancelable <code>cardDeleting</code> pipeline.',
        },
        {
          name: 'moveCard(key, toColumn, toIndex?, toSwimlane?)',
          type: '(key: unknown, toColumn: string, toIndex?: number, toSwimlane?: string | null) =&gt; void',
          description:
            'Moves a card (append when <code>toIndex</code> is omitted) through the cancelable <code>cardMoving</code> pipeline — the same path the drag, the Ctrl+Arrow twin and the context menu commit through.',
        },
        {
          name: 'editCard(card) / openNewCard(column, swimlane)',
          type: '(…) =&gt; void',
          description:
            'Opens the built-in dialog for an existing card / prefilled for a new card, through the <code>cardEditDialogShowing</code> hook.',
        },
        {
          name: 'closeDialog()',
          type: '() =&gt; void',
          description:
            'Closes the edit dialog without saving; fires <code>cardEditDialogHidden</code>.',
        },
        {
          name: 'collapseAllColumns() / expandAllColumns()',
          type: '() =&gt; void',
          description: 'The toolbar buttons, callable from code.',
        },
        {
          name: 'undo() / redo() / canUndo() / canRedo()',
          type: '() =&gt; void / () =&gt; boolean',
          description:
            'History: revert / re-apply the last step through the cancelable pipelines, and whether a step exists.',
        },
        {
          name: 'selectCards(keys) / clearSelection()',
          type: '(keys: readonly unknown[]) =&gt; void / () =&gt; void',
          description:
            'Programmatic selection (board order applied; writes <code>selectedCardKeys</code>).',
        },
        {
          name: 'moveCards(keys, toColumn, toIndex?, toSwimlane?)',
          type: '(keys: readonly unknown[], toColumn: string, toIndex?: number, toSwimlane?: string | null) =&gt; void',
          description:
            'Moves several cards into one cell as one undoable step, inserted consecutively (board order kept) before the card at <code>toIndex</code>; without <code>toSwimlane</code> every card stays in its own lane. Each card runs <code>cardMoving</code> / <code>cardMoved</code>.',
        },
        {
          name: 'deleteCards(items)',
          type: '(items: readonly T[]) =&gt; void',
          description:
            'Bulk delete as one undoable step, each item through <code>cardDeleting</code>; announced with an ICU plural.',
        },
        {
          name: 'transferCards(keys, toBoard, toColumn?, toIndex?, toSwimlane?)',
          type: '(…) =&gt; boolean',
          description:
            'Sends cards to another mounted board of the same <code>dragGroup</code> (default: its first droppable column, appended). Returns whether the target&#39;s <code>cardTransferring</code> accepted them.',
        },
        {
          name: 'toggleChecklistItem(key, index)',
          type: '(key: unknown, index: number) =&gt; void',
          description:
            'Toggles one checklist entry through <code>cardUpdating</code> (needs a field-name <code>checklistExpr</code>).',
        },
        {
          name: 'startTitleEdit(key)',
          type: '(key: unknown) =&gt; void',
          description:
            'Opens the inline title editor on a card (what <kbd>F2</kbd> does); Enter or blur commits through <code>cardUpdating</code>, Escape cancels.',
        },
        {
          name: 'clearFilters()',
          type: '() =&gt; void',
          description:
            'Resets the chip bar (<code>filterValue</code>); the programmatic <code>filter</code> input is untouched.',
        },
        {
          name: 'getExportData(options?) / exportToCsv(fileName?, options?)',
          type: '(options?: OgeKanbanExportOptions) =&gt; OgeKanbanExportData / (fileName?: string, options?: OgeKanbanExportOptions) =&gt; string',
          description:
            'The cards as export rows in board order (column → lane → cell; <code>visibleOnly</code> keeps only what the filters show), and a CSV download built on core&#39;s formula-guarded <code>buildCsv</code> (returns the text). Excel is the lazy <code>@oge-ui/kanban/export-excel</code> entry.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Events',
      entries: [
        {
          name: 'cardClick / cardDblClick / cardContextMenu',
          type: 'OgeKanbanCardEvent&lt;T&gt;',
          description:
            'Pointer interactions with a card (<code>{ card, event }</code>). Double-click also opens the editor; right-click fires <em>before</em> the built-in menu opens, so app handlers can coexist with it.',
        },
        {
          name: 'cardAdding / cardUpdating / cardDeleting / cardMoving',
          type: 'Oge…Event&lt;T&gt; (mutable cancel)',
          description:
            'Cancelable pre-events — set <code>cancel = true</code> to veto. <code>cardMoving</code> carries <code>{ card, fromColumn, toColumn, fromIndex, toIndex, fromSwimlane, toSwimlane }</code> and guards drags, keyboard moves and programmatic moves alike.',
        },
        {
          name: 'cardAdded / cardUpdated / cardDeleted / cardMoved',
          type: 'Oge…Event&lt;T&gt;',
          description:
            'Past-tense events fire only for applied changes and carry the data to persist (<code>cardMoved.card</code> is the <em>updated</em> item, orderExpr write-back included).',
        },
        {
          name: 'cardEditDialogShowing',
          type: 'OgeKanbanEditDialogShowingEvent&lt;T&gt;',
          description:
            'Cancelable + customization point before the dialog opens: <code>formItems</code> arrives pre-populated with the default <code>OgeForm</code> items and may be mutated or replaced (dx <code>onAppointmentFormOpening</code> parity).',
        },
        {
          name: 'cardEditDialogHidden',
          type: 'void',
          description:
            'The edit dialog closed — saved, cancelled, deleted or <code>closeDialog()</code> (Syncfusion <code>dialogClose</code> parity).',
        },
        {
          name: 'columnReordered',
          type: 'OgeKanbanColumnReorderedEvent',
          description:
            'A header drag committed a new order: <code>{ column, fromIndex, toIndex, columnOrder }</code>.',
        },
        {
          name: 'columnAdding / columnAdded',
          type: 'OgeKanbanColumnAddingEvent / OgeKanbanColumnAddedEvent',
          description:
            'The "+ Add column" composer&#39;s cancelable pre-event and its past-tense commit.',
        },
        {
          name: 'cardTransferring',
          type: 'OgeKanbanCardTransferringEvent&lt;T&gt;',
          description:
            'Cancelable, fired by the <strong>target</strong> board before cards from another board of the <code>dragGroup</code> land: <code>{ cards, fromBoard, toBoard, fromColumn, toColumn, fromSwimlane, toSwimlane, toIndex, cancel }</code>.',
        },
        {
          name: 'cardTransferred',
          type: 'OgeKanbanCardTransferredEvent&lt;T&gt;',
          description:
            'Fired by <strong>both</strong> boards after a transfer landed: the source host removes <code>sourceCards</code> from its data, the target host adds <code>cards</code> (column / swimlane already written).',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Templates',
      entries: [
        {
          name: '*ogeKanbanCardTemplate',
          type: 'OgeKanbanCardTemplateContext&lt;T&gt;',
          description:
            'Replaces the card body (<code>$implicit</code> card with its <code>source</code>, plus <code>column</code> and <code>swimlane</code>). Drag, keyboard and ARIA stay on the component. Buttons, links and inputs in the template are real interactive content: Tab reaches them while the card is its column&#39;s tab stop, they never start a drag or feed the board&#39;s arrow keys, and Escape returns to the card.',
        },
        {
          name: '*ogeKanbanColumnHeaderTemplate',
          type: 'OgeKanbanColumnHeaderTemplateContext',
          description:
            'Replaces the column header&#39;s title row (<code>$implicit</code> column, <code>count</code>, <code>wip</code>); the collapse affordance stays. An OGE extra — no reference library templates its headers.',
        },
      ],
    },
    {
      title: 'Configuration',
      entries: [
        {
          name: 'provideOgeKanbanConfig(config)',
          type: '(config: OgeKanbanConfigInput) =&gt; Provider',
          description:
            'DI-level configuration: <code>messages</code> (shallow-merged per top-level block), <code>locale</code>, <code>cardHeight</code>.',
        },
        {
          name: 'OgeKanbanMessages',
          type: 'interface',
          description:
            'Every user-facing string: <code>toolbar</code>, <code>menu</code>, <code>dialog</code>, <code>board</code> (aria label templates with <code>{title}</code>/<code>{count}</code>/<code>{limit}</code> tokens) and <code>announcements</code> (live-region templates).',
        },
        {
          name: 'OgeKanbanBoardMessages',
          type: 'interface',
          description:
            'The <code>board</code> block: <code>boardLabel</code>, <code>columnLabel</code> / <code>columnLabelWip</code> (the column list&#39;s name), <code>cardLabel</code> (<code>{title}</code>, <code>{column}</code>), <code>cardRoleDescription</code> (default <code>card</code> — every card&#39;s <code>aria-roledescription</code>), <code>editCardAction</code> / <code>deleteCardAction</code> (the quick-action buttons, <code>{title}</code>), <code>boardHint</code>, <code>wipExceeded</code>, <code>overdue</code>, the empty-state and add-card/column strings.',
        },
        {
          name: 'OgeKanbanColumn',
          type: 'interface',
          description:
            '<code>{ key, title?, color?, wipLimit?, minCount?, collapsed?, allowAdding?, allowDrag?, allowDrop?, transitionColumns? }</code> — the declared column shape. <code>wipLimit</code>/<code>minCount</code> drive the danger/warning badges; <code>allowDrag</code>/<code>allowDrop</code>/<code>transitionColumns</code> gate interactive moves (programmatic <code>moveCard</code> is deliberately not gated).',
        },
        {
          name: 'OgeKanbanCard&lt;T&gt;',
          type: 'interface',
          description:
            'The normalized card handed to templates and events: <code>key</code>, <code>source</code> (your item, unchanged), <code>column</code>, <code>title</code>, <code>description</code>, <code>color</code>, <code>order</code>, <code>swimlane</code>, <code>tags</code>, <code>assignees</code>, <code>dueDate</code>, <code>priority</code>, <code>checklist</code> (<code>{ text, done }[]</code>).',
        },
      ],
    },
    ...KANBAN_G3B_TYPE_BLOCKS,
  ],
};
