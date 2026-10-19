# @oge-ui/ai

AI components for Angular 22 that work with **your** model — OpenAI,
Azure OpenAI, Anthropic, a local Ollama, or your own backend. No hosted
service, no extra subscription, no row data leaves the page. Signal-based,
standalone, MIT.

```bash
npm install @oge-ui/ai
```

```ts
// app.config.ts — requests go to your endpoint, the API key stays on the server
provideOgeAiConfig({ transport: createOgeAiHttpTransport({ url: '/api/ai' }) });
```

```html
<oge-grid-assistant [target]="grid" [suggestions]="['Top 10 orders this month']" /> <oge-grid #grid [data]="orders">…</oge-grid>
```

## Grid assistant

The user types what they want to see — _"orders over 500 from İzmir last
month, newest first, grouped by status"_ — and the grid sorts, filters,
groups, searches and shows or hides columns accordingly.

- **Validated, never trusted** — every field, operator and value the model
  returns is checked against the grid's columns and coerced to the column
  type (dates parse as local days, lookup texts map to their values); the
  merged state still passes `sanitizeGridStateSnapshot`. Parts that do not
  fit are dropped and reported, never applied.
- **Preview, apply, undo** — `mode: 'preview'` (default) shows the proposed
  change with Apply / Discard; `mode: 'apply'` applies at once. Undo steps
  back through applied changes; the cancelable `applying` event can veto one.
- **Private by design** — the model sees column names, types and lookup
  values only. Add `description`s or hide a column from the model with the
  `columns` input; switch whole parts off with `capabilities`.
- **Follow-ups** — earlier exchanges are replayed, so "now group it by city"
  works; the model may ask back (`clarify`) or say a request is impossible.
- **Accessible** — a labelled region, a polite status line that announces
  every step, Escape to stop or discard, forced-colours and reduced-motion
  support, RTL.

Works with `OgeGrid` and the React grid handle — anything with
`state()`, `applyState()` and `describeColumns()`.

## Smart paste

`<oge-smart-paste [target]="form" />` fills a form from text the user copied — an email, a signature, a table
row. One click reads the clipboard; the model maps the text onto the form's
fields; a Now → New table shows every value before it is written (or
`mode="apply"` writes at once), and Undo puts the old values back.

- Values must name a writable field, coerce to its type and — for choice
  fields — be one of the listed values; read-only fields are never offered.
- The request carries the field catalog and the pasted text, never the
  form's current values. The text is labelled as data, so instructions inside
  it are not followed.
- No clipboard permission (or an insecure origin)? A text box takes the paste.

## Transports

| Transport                     | Use it for                                                              |
| ----------------------------- | ----------------------------------------------------------------------- |
| `createOgeAiHttpTransport`    | Production: your backend calls the model; the browser never sees a key. |
| `createOgeOpenAiTransport`    | OpenAI and every compatible server: Azure, Ollama, vLLM, LM Studio.     |
| `createOgeAnthropicTransport` | Claude, directly or through a proxy.                                    |

Sending an API key from the browser requires `dangerouslyAllowBrowser: true`
— meant for prototypes and internal tools. Any object with a
`complete(request, { signal })` method is a transport too.

## Docs

- Live demos and the full API reference: <https://www.ogeui.com/components/ai>
- Machine-readable reference for coding assistants:
  `node_modules/@oge-ui/ai/llms.txt`

## License

MIT — free forever, like the rest of the open tier. See [LICENSE](LICENSE).
