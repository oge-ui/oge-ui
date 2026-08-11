// Hand-compiled from packages/kanban/src/lib/** — keep in sync with the
// source TSDoc.
import type { ApiSections } from '../../shared/api-reference';

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
          description: 'The selected card&#39;s key — single selection.',
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
            'Replaces the card body (<code>$implicit</code> card with its <code>source</code>, plus <code>column</code> and <code>swimlane</code>). Drag, keyboard and ARIA stay on the component.',
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
          name: 'OgeKanbanColumn',
          type: 'interface',
          description:
            '<code>{ key, title?, color?, wipLimit?, minCount?, collapsed?, allowAdding?, allowDrag?, allowDrop?, transitionColumns? }</code> — the declared column shape. <code>wipLimit</code>/<code>minCount</code> drive the danger/warning badges; <code>allowDrag</code>/<code>allowDrop</code>/<code>transitionColumns</code> gate interactive moves (programmatic <code>moveCard</code> is deliberately not gated).',
        },
        {
          name: 'OgeKanbanCard&lt;T&gt;',
          type: 'interface',
          description:
            'The normalized card handed to templates and events: <code>key</code>, <code>source</code> (your item, unchanged), <code>column</code>, <code>title</code>, <code>description</code>, <code>color</code>, <code>order</code>, <code>swimlane</code>, <code>tags</code>, <code>assignees</code>, <code>dueDate</code>, <code>priority</code>.',
        },
      ],
    },
  ],
};
