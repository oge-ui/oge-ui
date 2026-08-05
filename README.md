# oge — Angular UI Components

Open-source UI component suite for Angular, built on signals. The first component is the **Data Grid**: virtualized, server-driven, fully typed, themeable.

| Package | Description |
|---|---|
| [`@oge-ui/core`](packages/core) | Framework-agnostic engine: data sources, filtering, row pipeline, virtualization math |
| [`@oge-ui/grid`](packages/grid) | The Angular Data Grid component |

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
