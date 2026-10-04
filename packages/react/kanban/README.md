# @oge-ui/react-kanban

A React Kanban board: columns and swimlanes over a plain card array with
field mapping, WIP limits, per-column virtualization, drag & drop with
Escape-cancel and edge auto-scroll, **Ctrl+Arrow keyboard card moving** with
live announcements, cancelable CRUD and move events, and a built-in edit
dialog, context menu and toolbar.

It runs the same framework-free engine as the Angular
[`@oge-ui/kanban`](https://www.npmjs.com/package/@oge-ui/kanban) —
[`@oge-ui/kanban-engine`](https://www.npmjs.com/package/@oge-ui/kanban-engine),
installed with it — and renders the same markup, so it loads the same
stylesheet.

```sh
npm install @oge-ui/react-kanban
```

```tsx
import { OgeKanban } from '@oge-ui/react-kanban';
import '@oge-ui/react-kanban/styles.css';
// the edit dialog composes the modal and the form:
import '@oge-ui/react-overlay/styles.css';
import '@oge-ui/react-forms/styles.css';
import '@oge-ui/react-inputs/styles.css';

export function Board({ tasks }: { tasks: Task[] }) {
  return (
    <OgeKanban
      dataSource={tasks}
      keyExpr="id"
      columnExpr="status"
      titleExpr="title"
      columns={[
        { key: 'todo', title: 'To do' },
        { key: 'doing', title: 'In progress', wipLimit: 3 },
        { key: 'done', title: 'Done' },
      ]}
      onCardMoved={(event) => save(event.card)}
      style={{ height: 520 }}
    />
  );
}
```

- Every Angular input is a prop, every output an `onX` callback, the two-way
  models are controlled/uncontrolled pairs (`collapsedColumns` +
  `defaultCollapsedColumns` + `onCollapsedColumnsChange`, …), the public
  methods live on the `ref` handle (`moveCard`, `addCard`, `editCard`, …) and
  the templates are render props (`renderCard`, `renderColumnHeader`).
- Accessible board semantics: each column is a labelled `role="list"` with
  one Tab stop, cards are focusable groups (`aria-roledescription`,
  `aria-current` for the selection), and the quick actions and any controls
  in a `renderCard` template are real, Tab-reachable buttons.
- Pointer and touch: drags run on the suite's shared pointer gesture — cards
  and column headers lift after a 300 ms touch hold, the board auto-scrolls
  at its edges, Escape cancels.
- Configuration and i18n: `<OgeKanbanConfigProvider config={{ messages, locale, cardHeight }}>`.
- The data array is never mutated — persist through the past-tense callbacks.

Docs and live demos: [ogeui.com/components/kanban](https://www.ogeui.com/components/kanban)
(switch the header to React).

## License

Source-available commercial software — free for evaluation and development,
a paid license for production. See [LICENSE](LICENSE) and
[ogeui.com/license](https://www.ogeui.com/license).
