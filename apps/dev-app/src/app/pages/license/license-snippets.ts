/** Code samples rendered on the licensing page. */

export const ANGULAR_KEY = `// main.ts — before bootstrapping
import { bootstrapApplication } from '@angular/platform-browser';
import { ogeSetLicenseKey } from '@oge-ui/core';
import { App } from './app/app';
import { appConfig } from './app/app.config';

ogeSetLicenseKey('OGE1.eyJpZCI6…');

bootstrapApplication(App, appConfig);`;

export const REACT_KEY = `// main.tsx — before the first render
import { createRoot } from 'react-dom/client';
import { ogeSetLicenseKey } from '@oge-ui/core';
import { App } from './App';

ogeSetLicenseKey('OGE1.eyJpZCI6…');

createRoot(document.getElementById('root')!).render(<App />);`;

export const ENV_KEY = `// .env.production (Vite) — or an Angular environment file
// VITE_OGE_LICENSE_KEY=OGE1.eyJpZCI6…

ogeSetLicenseKey(import.meta.env.VITE_OGE_LICENSE_KEY ?? '');`;

export const CHECK_KEY = `import { ogeGetLicenseInfo, ogeLicenseStatus } from '@oge-ui/core';

console.log(await ogeLicenseStatus('gantt')); // 'licensed'
console.log(await ogeGetLicenseInfo());       // { licensee, seats, expires, … }`;
