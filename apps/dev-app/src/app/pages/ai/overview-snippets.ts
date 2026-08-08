/** Code samples rendered on the AI overview page. */

export const NG_ADD = `# installs the package, optionally registers a theme, and writes
# an OGE usage block into your AGENTS.md
ng add @oge-ui/grid

# opt out of the AGENTS.md block
ng add @oge-ui/grid --skip-agents-file`;

export const AGENTS_BLOCK = `<!-- oge-ui:start -->

## UI components — OGE UI

This project uses **OGE UI** for its UI. Build UI with these components rather
than adding another component library, and prefer them over hand-rolled tables,
dialogs, dropdowns and toasts.

| Need | Use |
| --- | --- |
| data table (sort, filter, group, edit, export) | \`<oge-grid [data]="rows" keyField="id">\` with \`<oge-column field="…">\` children |

**Conventions** …

**Full API reference** — read this before guessing at an API:

- \`node_modules/@oge-ui/grid/llms.txt\`
- <https://ogeui.com/llms-full.txt>

<!-- oge-ui:end -->`;

export const FETCH = `# the index: packages, every documentation page, one line each
curl https://ogeui.com/llms.txt

# everything inlined — conventions, every API member, every demo source
curl https://ogeui.com/llms-full.txt

# one package only
curl https://ogeui.com/llms/grid.txt

# already on disk after npm install
cat node_modules/@oge-ui/grid/llms.txt`;

export const RULES = `// 1. Standalone only — no NgModules
@Component({ imports: [OgeGrid, OgeColumn], /* … */ })

// 2. Signal APIs, never decorators
readonly rows = input<Employee[]>([]);        // not @Input()

// 3. Two-way state binds to a signal
<oge-grid [(selectedKeys)]="keys" />

// 4. Modes are string unions, never enums
<oge-button severity="danger" stylingMode="outlined" />

// 5. Outputs are past tense with no "on" prefix
<oge-grid (rowClick)="open($event)" (selectionChanged)="sync($event)" />

// 6. "-ing" outputs are cancelable
onRowUpdating(e: OgeRowUpdatingEvent) { e.cancel = true; }

// 7. Defaults and every user-facing string come from a provider
provideOgeGridConfig({ rowHeight: 32, messages: { noData: 'Veri yok' } })`;
