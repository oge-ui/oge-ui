/** Code samples rendered on the Vite, Angular CLI and Nx guide. */
import { demoSource } from '../../shared/demo-source';
import { reactDemoSource } from '../../shared/react-demo-source';

export const VITE_CREATE = `npm create vite@latest orders -- --template react-ts
cd orders
npm install @oge-ui/react-grid @oge-ui/react-buttons`;

export const VITE_MAIN = `// src/main.tsx — the stylesheets once, at the entry
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@oge-ui/react-grid/styles.css';
import '@oge-ui/react-buttons/styles.css';
import '@oge-ui/core/themes/dark.css'; // optional theme
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);`;

export const VITE_APP = reactDemoSource({
  use: { '@oge-ui/react-grid': ['OgeGrid'] },
  name: 'App',
  before: `// the 'use client' line is for React Server Component frameworks; Vite ignores it
const columns = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' as const },
  { field: 'name', caption: 'Name' },
  { field: 'title', caption: 'Title' },
];`,
  dataset: 'employees',
  jsx: `<OgeGrid data={employees} keyField="id" columns={columns} locale="en-US" />`,
});

export const CLI_CREATE = `ng new orders --style=css
cd orders
ng add @oge-ui/grid --theme=dark   # installs, registers the theme, writes AGENTS.md`;

export const CLI_STYLES = `/* src/styles.css — the manual equivalent of --theme (an Nx repo, a library) */
@import '@oge-ui/core/themes/dark.css';`;

export const CLI_COMPONENT = demoSource({
  use: { '@oge-ui/grid': ['OgeGrid', 'OgeColumn'] },
  dataset: 'employees',
  template: `<oge-grid [data]="employees" keyField="id" [filterRow]="true">
  <oge-column field="firstName" caption="First name" />
  <oge-column field="department" caption="Department" />
  <oge-column field="salary" caption="Salary" dataType="number" />
</oge-grid>`,
});

export const NX_INSTALL = `# OGE packages are ordinary npm dependencies of the workspace
npm install @oge-ui/grid @oge-ui/inputs        # Angular apps
npm install @oge-ui/react-grid                 # React apps

# no ng add step: an Nx workspace has no angular.json for the schematic to edit
# (it would only warn: "no angular.json found — Add @import … instead")`;

export const NX_PROJECT = `// apps/orders/project.json (excerpt) — a theme in the build styles, first
{
  "targets": {
    "build": {
      "options": {
        "styles": [
          "node_modules/@oge-ui/core/themes/dark.css",
          "apps/orders/src/styles.css"
        ]
      }
    }
  }
}`;
