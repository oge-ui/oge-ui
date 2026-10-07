/**
 * Versions and the `@oge-ui/*` package graph behind "Open in StackBlitz".
 *
 * GENERATED — do not edit. Derived from the root package.json (toolchain) and
 * every @oge-ui package.json under packages/ by `npx nx run docs-tools:llms`
 * (tools/docs-tools/lib/stackblitz.mjs), and checked by
 * `docs-tools:llms-check`. The @oge-ui version is SITE_VERSION.
 */

export interface StackblitzPackageInfo {
  /** The package's own `@oge-ui/*` dependencies. */
  readonly deps: readonly string[];
  /** Licensed commercially (ADR 0003) rather than MIT. */
  readonly commercial: boolean;
  /** Exports `./styles.css` (every React render-layer package). */
  readonly styles: boolean;
}

export const STACKBLITZ_TOOLCHAIN = {
  "@angular/build": "22.2.0",
  "@angular/cli": "22.2.0",
  "@angular/common": "22.2.1",
  "@angular/compiler": "22.2.1",
  "@angular/compiler-cli": "22.2.1",
  "@angular/core": "22.2.1",
  "@angular/forms": "22.2.1",
  "@angular/platform-browser": "22.2.1",
  "@angular/router": "22.2.1",
  "@types/react": "^19.2.18",
  "@types/react-dom": "^19.2.4",
  "@vitejs/plugin-react": "^6.0.5",
  "exceljs": "^4.4.0",
  "jspdf": "^4.2.1",
  "jspdf-autotable": "^5.0.8",
  "react": "^19.2.8",
  "react-dom": "^19.2.8",
  "rxjs": "~7.8.0",
  "tslib": "^2.3.0",
  "typescript": "6.0.3",
  "vite": "8.2.2"
} as const;

export const STACKBLITZ_PACKAGES: Readonly<
  Record<string, StackblitzPackageInfo>
> = {
  "@oge-ui/behavior": {
    "deps": [
      "@oge-ui/core"
    ],
    "commercial": false,
    "styles": false
  },
  "@oge-ui/bpmn": {
    "deps": [
      "@oge-ui/bpmn-engine"
    ],
    "commercial": true,
    "styles": false
  },
  "@oge-ui/bpmn-engine": {
    "deps": [],
    "commercial": true,
    "styles": false
  },
  "@oge-ui/buttons": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/overlay"
    ],
    "commercial": false,
    "styles": false
  },
  "@oge-ui/charts": {
    "deps": [
      "@oge-ui/charts-engine",
      "@oge-ui/core"
    ],
    "commercial": true,
    "styles": false
  },
  "@oge-ui/charts-engine": {
    "deps": [
      "@oge-ui/core"
    ],
    "commercial": true,
    "styles": false
  },
  "@oge-ui/core": {
    "deps": [],
    "commercial": false,
    "styles": false
  },
  "@oge-ui/editor": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/inputs",
      "@oge-ui/layout",
      "@oge-ui/overlay"
    ],
    "commercial": false,
    "styles": false
  },
  "@oge-ui/forms": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/editor",
      "@oge-ui/inputs",
      "@oge-ui/layout",
      "@oge-ui/navigation",
      "@oge-ui/tabs",
      "@oge-ui/upload"
    ],
    "commercial": false,
    "styles": false
  },
  "@oge-ui/gantt": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/forms",
      "@oge-ui/gantt-engine",
      "@oge-ui/overlay"
    ],
    "commercial": true,
    "styles": false
  },
  "@oge-ui/gantt-engine": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core"
    ],
    "commercial": true,
    "styles": false
  },
  "@oge-ui/grid": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/forms",
      "@oge-ui/inputs",
      "@oge-ui/layout",
      "@oge-ui/overlay"
    ],
    "commercial": false,
    "styles": false
  },
  "@oge-ui/inputs": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/navigation",
      "@oge-ui/overlay"
    ],
    "commercial": false,
    "styles": false
  },
  "@oge-ui/kanban": {
    "deps": [
      "@oge-ui/core",
      "@oge-ui/forms",
      "@oge-ui/kanban-engine",
      "@oge-ui/overlay"
    ],
    "commercial": true,
    "styles": false
  },
  "@oge-ui/kanban-engine": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core"
    ],
    "commercial": true,
    "styles": false
  },
  "@oge-ui/layout": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/overlay"
    ],
    "commercial": false,
    "styles": false
  },
  "@oge-ui/locales": {
    "deps": [],
    "commercial": false,
    "styles": false
  },
  "@oge-ui/navigation": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/overlay"
    ],
    "commercial": false,
    "styles": false
  },
  "@oge-ui/overlay": {
    "deps": [
      "@oge-ui/behavior"
    ],
    "commercial": false,
    "styles": false
  },
  "@oge-ui/pivot": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/grid",
      "@oge-ui/pivot-engine"
    ],
    "commercial": true,
    "styles": false
  },
  "@oge-ui/pivot-engine": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core"
    ],
    "commercial": true,
    "styles": false
  },
  "@oge-ui/react": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/locales",
      "@oge-ui/react-buttons",
      "@oge-ui/react-editor",
      "@oge-ui/react-forms",
      "@oge-ui/react-grid",
      "@oge-ui/react-inputs",
      "@oge-ui/react-layout",
      "@oge-ui/react-navigation",
      "@oge-ui/react-overlay",
      "@oge-ui/react-tabs",
      "@oge-ui/react-tree-list",
      "@oge-ui/react-upload"
    ],
    "commercial": false,
    "styles": true
  },
  "@oge-ui/react-bpmn": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/bpmn-engine"
    ],
    "commercial": true,
    "styles": true
  },
  "@oge-ui/react-buttons": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/react-overlay"
    ],
    "commercial": false,
    "styles": true
  },
  "@oge-ui/react-charts": {
    "deps": [
      "@oge-ui/charts-engine"
    ],
    "commercial": true,
    "styles": true
  },
  "@oge-ui/react-editor": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/react-inputs",
      "@oge-ui/react-layout",
      "@oge-ui/react-overlay"
    ],
    "commercial": false,
    "styles": true
  },
  "@oge-ui/react-forms": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/react-editor",
      "@oge-ui/react-inputs",
      "@oge-ui/react-layout",
      "@oge-ui/react-navigation",
      "@oge-ui/react-tabs",
      "@oge-ui/react-upload"
    ],
    "commercial": false,
    "styles": true
  },
  "@oge-ui/react-gantt": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/gantt-engine",
      "@oge-ui/react-forms",
      "@oge-ui/react-overlay"
    ],
    "commercial": true,
    "styles": true
  },
  "@oge-ui/react-grid": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/react-forms",
      "@oge-ui/react-inputs",
      "@oge-ui/react-layout",
      "@oge-ui/react-overlay"
    ],
    "commercial": false,
    "styles": true
  },
  "@oge-ui/react-inputs": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/react-navigation",
      "@oge-ui/react-overlay"
    ],
    "commercial": false,
    "styles": true
  },
  "@oge-ui/react-kanban": {
    "deps": [
      "@oge-ui/kanban-engine",
      "@oge-ui/react-forms",
      "@oge-ui/react-overlay"
    ],
    "commercial": true,
    "styles": true
  },
  "@oge-ui/react-layout": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/react-overlay"
    ],
    "commercial": false,
    "styles": true
  },
  "@oge-ui/react-navigation": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/react-overlay"
    ],
    "commercial": false,
    "styles": true
  },
  "@oge-ui/react-overlay": {
    "deps": [
      "@oge-ui/behavior"
    ],
    "commercial": false,
    "styles": true
  },
  "@oge-ui/react-pivot": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/pivot-engine",
      "@oge-ui/react-grid"
    ],
    "commercial": true,
    "styles": true
  },
  "@oge-ui/react-scheduler": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/react-forms",
      "@oge-ui/react-inputs",
      "@oge-ui/react-overlay",
      "@oge-ui/scheduler-engine"
    ],
    "commercial": true,
    "styles": true
  },
  "@oge-ui/react-tabs": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/react-overlay"
    ],
    "commercial": false,
    "styles": true
  },
  "@oge-ui/react-tree-list": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/react-forms",
      "@oge-ui/react-grid",
      "@oge-ui/react-inputs",
      "@oge-ui/react-layout",
      "@oge-ui/react-overlay"
    ],
    "commercial": false,
    "styles": true
  },
  "@oge-ui/react-upload": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/react-layout",
      "@oge-ui/react-overlay"
    ],
    "commercial": false,
    "styles": true
  },
  "@oge-ui/scheduler": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/forms",
      "@oge-ui/inputs",
      "@oge-ui/overlay",
      "@oge-ui/scheduler-engine"
    ],
    "commercial": true,
    "styles": false
  },
  "@oge-ui/scheduler-engine": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core"
    ],
    "commercial": true,
    "styles": false
  },
  "@oge-ui/tabs": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/overlay"
    ],
    "commercial": false,
    "styles": false
  },
  "@oge-ui/tree-list": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/core",
      "@oge-ui/forms",
      "@oge-ui/grid",
      "@oge-ui/inputs",
      "@oge-ui/layout",
      "@oge-ui/overlay"
    ],
    "commercial": false,
    "styles": false
  },
  "@oge-ui/upload": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/layout",
      "@oge-ui/overlay"
    ],
    "commercial": false,
    "styles": false
  },
  "oge-ui": {
    "deps": [
      "@oge-ui/behavior",
      "@oge-ui/buttons",
      "@oge-ui/core",
      "@oge-ui/editor",
      "@oge-ui/forms",
      "@oge-ui/grid",
      "@oge-ui/inputs",
      "@oge-ui/layout",
      "@oge-ui/locales",
      "@oge-ui/navigation",
      "@oge-ui/overlay",
      "@oge-ui/tabs",
      "@oge-ui/tree-list",
      "@oge-ui/upload"
    ],
    "commercial": false,
    "styles": false
  }
};
