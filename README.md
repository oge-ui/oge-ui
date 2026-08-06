# oge — Angular UI Components

Open-source UI component suite for Angular, built on signals. The first component is the **Data Grid**: virtualized, server-driven, fully typed, themeable.

| Package                                   | Description                                                                                | npm                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| [`@oge-ui/core`](packages/core)           | Framework-agnostic engine: data sources, filtering, row pipeline, virtualization math      | [npm](https://www.npmjs.com/package/@oge-ui/core) |
| [`@oge-ui/grid`](packages/grid)           | The Angular Data Grid component                                                            | [npm](https://www.npmjs.com/package/@oge-ui/grid) |
| [`@oge-ui/tree-list`](packages/tree-list) | Hierarchical tree grid built on the same foundation                                        | —                                                 |
| [`@oge-ui/pivot`](packages/pivot)         | Pivot grid: pure aggregation engine, display modes, two-axis virtualization, Excel export  | —                                                 |
| [`@oge-ui/buttons`](packages/buttons)     | Buttons, button group & drop-down button: severities, async actions, click guard, gestures | —                                                 |
| [`@oge-ui/overlay`](packages/overlay)     | Anchored popup primitives: flip/clamp positioning, panel behavior model, accessible menu   | —                                                 |
| [`@oge-ui/inputs`](packages/inputs)       | Form editors (text/textarea/number): floating labels, Signal Forms + CVA, counter, reveal  | —                                                 |

```sh
npm install @oge-ui/core @oge-ui/grid
```

## Development

```sh
npm install
npx nx serve dev-app        # docs & demo site → http://localhost:4200
npx nx run-many -t build test lint
npx nx e2e dev-app-e2e      # Playwright suite (incl. axe accessibility scans)
```

- `apps/dev-app` — documentation site (live demos, playground, API reference)
- `packages/core` — pure TypeScript engine (no Angular imports; lint-enforced)
- `packages/grid` — Angular library (ng-packagr / APF)
- [`ROADMAP.md`](ROADMAP.md) — feature parity gap analysis & phased backlog

## Releasing

```sh
npx nx release version <ver>   # bumps + tags (conventional commits)
npx nx release publish         # publishes @oge-ui/core and @oge-ui/grid
```

## License

MIT
