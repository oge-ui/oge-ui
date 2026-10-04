// Hand-compiled from packages/react/kanban/src/lib/** — keep in sync with the
// source TSDoc.
//
// Mirrors `pages/kanban/kanban-api-data.ts` block for block and group for
// group, so the two views read as one page across the switch and the parity
// gate can diff them member by member. What differs is the idiom —
// controlled/uncontrolled pairs instead of `model()`, `on`-prefixed callbacks
// instead of outputs, a `ref` handle instead of public methods, render props
// instead of structural directives, a context provider instead of DI.
import type { ApiSections } from '../../shared/api-reference';

export const OGE_REACT_KANBAN_API: ApiSections = {
  properties: [
    {
      title: 'Data',
      entries: [
        {
          name: 'dataSource',
          type: 'readonly T[]',
          default: '[]',
          description:
            'Card items — a plain array, copied into an internal working set; the array is never mutated. A new array re-seeds the board. Edits surface through the past-tense callbacks.',
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
      title: 'State (controlled / uncontrolled)',
      entries: [
        {
          name: 'collapsedColumns / collapsedSwimlanes',
          type: 'readonly string[]',
          default: 'uncontrolled, []',
          description:
            'Collapsed column keys (slim vertical pills) and collapsed swimlane keys. Controlled when provided; <code>defaultCollapsedColumns</code> / <code>defaultCollapsedSwimlanes</code> seed the uncontrolled state at mount.',
        },
        {
          name: 'columnOrder',
          type: 'readonly string[]',
          default: 'uncontrolled, []',
          description:
            'Persisted column key order (empty = declared order); written by header drags when <code>allowColumnReordering</code> is on. <code>defaultColumnOrder</code> seeds it uncontrolled.',
        },
        {
          name: 'selectedCardKey',
          type: 'unknown',
          default: 'uncontrolled, null',
          description:
            'The selected card&#39;s key — single selection. <code>defaultSelectedCardKey</code> seeds it uncontrolled.',
        },
        {
          name: 'onCollapsedColumnsChange / onCollapsedSwimlanesChange / onColumnOrderChange / onSelectedCardKeyChange',
          type: '(value) =&gt; void',
          description:
            'The controlled halves of the four state props — Angular&#39;s <code>[(…)]</code> models are both halves at once.',
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
            'Per-column card windowing over a fixed <code>cardHeight</code> — 10k cards stay smooth. Rich variable-height render props may opt out (<code>false</code>), the documented exception.',
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
            'Capability gates for the toolbar, dialog, menu, hover quick actions, keyboard shortcuts and drags. <code>allowColumnAdding</code> renders the "+ Add column" ghost column (inline composer → cancelable <code>onColumnAdding</code> → <code>onColumnAdded</code>). Per-column <code>allowAdding: false</code> overrides the board.',
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
          type: 'readonly OgeFormItemDefinition[] | undefined',
          default: 'undefined',
          description:
            'Replaces the edit dialog&#39;s default form wholesale (<code>&lt;OgeForm&gt;</code> items from <code>@oge-ui/react-forms</code>); <code>onCardEditDialogShowing</code> can still adjust per open. The default form only renders editors for fields the board actually maps.',
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
            'Per-instance overrides of the context config (<code>&lt;OgeKanbanConfigProvider&gt;</code>). Every user-facing string, aria labels and live-region templates included, lives in the messages interface; <code>locale</code> drives every Intl format.',
        },
      ],
    },
    {
      title: 'Render props',
      entries: [
        {
          name: 'renderCard',
          type: '(context: OgeKanbanCardRenderContext&lt;T&gt;) =&gt; ReactNode',
          description:
            'Replaces the card body (<code>{ card, column, swimlane }</code>, the card with its <code>source</code>). Drag, keyboard and ARIA stay on the board — the React face of <code>*ogeKanbanCardTemplate</code>. Buttons, links and inputs it renders are real interactive content: Tab reaches them while the card is its column&#39;s tab stop, they never start a drag or feed the board&#39;s arrow keys, and Escape returns to the card.',
        },
        {
          name: 'renderColumnHeader',
          type: '(context: OgeKanbanColumnHeaderRenderContext) =&gt; ReactNode',
          description:
            'Replaces the column header&#39;s title row (<code>{ column, count, wip }</code>); the add and collapse affordances stay — the React face of <code>*ogeKanbanColumnHeaderTemplate</code>.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description:
            'Host styling, merged onto the <code>.oge-kanban</code> element (give the board a height, as with the Angular host).',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Handle (ref)',
      entries: [
        {
          name: 'addCard(item)',
          type: '(item: T) =&gt; void',
          description:
            'Programmatic insert through the cancelable <code>onCardAdding</code> pipeline; the column and swimlane resolve from the item&#39;s own fields.',
        },
        {
          name: 'updateCard(original, updated)',
          type: '(original: T, updated: T) =&gt; void',
          description:
            'Programmatic update through the cancelable <code>onCardUpdating</code> pipeline.',
        },
        {
          name: 'deleteCard(item)',
          type: '(item: T) =&gt; void',
          description:
            'Programmatic delete through the cancelable <code>onCardDeleting</code> pipeline.',
        },
        {
          name: 'moveCard(key, toColumn, toIndex?, toSwimlane?)',
          type: '(key: unknown, toColumn: string, toIndex?: number, toSwimlane?: string | null) =&gt; void',
          description:
            'Moves a card (append when <code>toIndex</code> is omitted) through the cancelable <code>onCardMoving</code> pipeline — the same path the drag, the Ctrl+Arrow twin and the context menu commit through.',
        },
        {
          name: 'editCard(card) / openNewCard(column, swimlane)',
          type: '(…) =&gt; void',
          description:
            'Opens the built-in dialog for an existing card / prefilled for a new card, through the <code>onCardEditDialogShowing</code> hook.',
        },
        {
          name: 'closeDialog()',
          type: '() =&gt; void',
          description:
            'Closes the edit dialog without saving; fires <code>onCardEditDialogHidden</code>.',
        },
        {
          name: 'collapseAllColumns() / expandAllColumns()',
          type: '() =&gt; void',
          description: 'The toolbar buttons, callable from code.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Callbacks',
      entries: [
        {
          name: 'onCardClick / onCardDblClick / onCardContextMenu',
          type: '(event: OgeKanbanCardEvent&lt;T&gt;) =&gt; void',
          description:
            'Pointer interactions with a card (<code>{ card, event }</code>, the native <code>MouseEvent</code>). Double-click also opens the editor; right-click fires <em>before</em> the built-in menu opens, so app handlers can coexist with it.',
        },
        {
          name: 'onCardAdding / onCardUpdating / onCardDeleting / onCardMoving',
          type: '(event: Oge…Event&lt;T&gt;) =&gt; void (mutable cancel)',
          description:
            'Cancelable pre-events — set <code>event.cancel = true</code> to veto. <code>onCardMoving</code> carries <code>{ card, fromColumn, toColumn, fromIndex, toIndex, fromSwimlane, toSwimlane }</code> and guards drags, keyboard moves and programmatic moves alike.',
        },
        {
          name: 'onCardAdded / onCardUpdated / onCardDeleted / onCardMoved',
          type: '(event: Oge…Event&lt;T&gt;) =&gt; void',
          description:
            'Past-tense callbacks fire only for applied changes and carry the data to persist (<code>onCardMoved</code>&#39;s <code>card</code> is the <em>updated</em> item, orderExpr write-back included).',
        },
        {
          name: 'onCardEditDialogShowing',
          type: '(event: OgeKanbanEditDialogShowingEvent&lt;T&gt;) =&gt; void',
          description:
            'Cancelable + customization point before the dialog opens: <code>formItems</code> arrives pre-populated with the default <code>&lt;OgeForm&gt;</code> items and may be mutated or replaced (dx <code>onAppointmentFormOpening</code> parity).',
        },
        {
          name: 'onCardEditDialogHidden',
          type: '() =&gt; void',
          description:
            'The edit dialog closed — saved, cancelled, deleted or <code>closeDialog()</code> (Syncfusion <code>dialogClose</code> parity).',
        },
        {
          name: 'onColumnReordered',
          type: '(event: OgeKanbanColumnReorderedEvent) =&gt; void',
          description:
            'A header drag committed a new order: <code>{ column, fromIndex, toIndex, columnOrder }</code>.',
        },
        {
          name: 'onColumnAdding / onColumnAdded',
          type: '(event: OgeKanbanColumnAddingEvent / OgeKanbanColumnAddedEvent) =&gt; void',
          description:
            'The "+ Add column" composer&#39;s cancelable pre-event and its past-tense commit.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Render contexts',
      entries: [
        {
          name: 'OgeKanbanCardRenderContext&lt;T&gt;',
          type: 'interface',
          description:
            '<code>{ card, column, swimlane }</code> — what <code>renderCard</code> is handed (the context of Angular&#39;s <code>*ogeKanbanCardTemplate</code>, <code>$implicit</code> named <code>card</code>).',
        },
        {
          name: 'OgeKanbanColumnHeaderRenderContext',
          type: 'interface',
          description:
            '<code>{ column, count, wip }</code> — what <code>renderColumnHeader</code> is handed. An OGE extra — no reference library templates its headers.',
        },
      ],
    },
    {
      title: 'Configuration',
      entries: [
        {
          name: 'OgeKanbanConfigProvider',
          type: '({ config?: OgeKanbanConfigInput, children }) =&gt; JSX',
          description:
            'The React counterpart of <code>provideOgeKanbanConfig()</code>: <code>messages</code> (merged block by block), <code>locale</code>, <code>cardHeight</code> for the subtree. Nested providers merge over the outer one, and a new <code>config</code> re-resolves the subtree — switching the UI language at runtime is a state change.',
        },
        {
          name: 'useOgeKanbanConfig',
          type: '() =&gt; OgeKanbanConfig',
          description:
            'The resolved config for the current subtree (the counterpart of <code>inject(OGE_KANBAN_CONFIG)</code>).',
        },
        {
          name: 'OgeKanbanMessages',
          type: 'interface',
          description:
            'Every user-facing string: <code>toolbar</code>, <code>menu</code>, <code>dialog</code>, <code>board</code> (aria label templates with <code>{title}</code>/<code>{count}</code>/<code>{limit}</code> tokens) and <code>announcements</code> (live-region templates). Single-sourced in <code>@oge-ui/kanban-engine</code> with the Angular package.',
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
            'The normalized card handed to render props and callbacks: <code>key</code>, <code>source</code> (your item, unchanged), <code>column</code>, <code>title</code>, <code>description</code>, <code>color</code>, <code>order</code>, <code>swimlane</code>, <code>tags</code>, <code>assignees</code>, <code>dueDate</code>, <code>priority</code>.',
        },
      ],
    },
  ],
};
