# Friction Log — Vantage ERP (`@oge-ui/react@1.1.6`)

Built on the lessons recorded in `../customer-manager/FRICTION.md` (same packages, same version).

## 1. `valueAxis` entries have no `name`; a series picks its axis by index

### What happened
Writing `valueAxis={[{ name: 'value' }, { name: 'margin', position: 'right' }]}` and `axis: 'margin'` on the margin series failed TypeScript: `OgeChartAxisOptions` has no `name`, `position` is the logical `'start' | 'end'`, and a series' `axis` is a number.

### Exact error text
```text
src/App.tsx(173,91): error TS2322: Type 'string' is not assignable to type 'number'.
src/App.tsx(693,35): error TS2353: Object literal may only specify known properties, and 'name' does not exist in type 'OgeChartAxisOptions'.
src/App.tsx(693,83): error TS2322: Type '"right"' is not assignable to type '"start" | "end" | undefined'.
```

### Resolution
`valueAxis={[{ title: '$K' }, { position: 'end', title: '%', min: 0, max: 50 }]}` with `axis: 1` on the margin series.
