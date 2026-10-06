import { demoSource } from '../../shared/demo-source';

export const SEVERITIES_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAlert'] },
  template: `<!-- Role follows the severity: info / success are role="status"
     (polite), warning / error role="alert" (assertive). The glyph is
     aria-hidden; a visually hidden prefix ("Warning") carries the meaning. -->
<oge-alert severity="info">A new version is available.</oge-alert>
<oge-alert severity="success">Your changes were saved.</oge-alert>
<oge-alert severity="warning">Your trial ends in three days.</oge-alert>
<oge-alert severity="error">The payment could not be processed.</oge-alert>`,
});

export const MODES_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAlert'] },
  template: `<!-- soft (default) is a tinted surface, outlined a coloured frame,
     filled the solid severity colour with --oge-severity-contrast text. -->
<oge-alert severity="success" stylingMode="soft">Soft</oge-alert>
<oge-alert severity="success" stylingMode="outlined">Outlined</oge-alert>
<oge-alert severity="success" stylingMode="filled">Filled</oge-alert>`,
});

export const DISMISS_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAlert', 'OgeAlertActions'] },
  types: { '@oge-ui/layout': ['OgeAlertClosingEvent'] },
  template: `<!-- dismissible adds a real "Dismiss" button; closing is cancelable and
     focus moves past the alert instead of dropping to <body>. -->
<oge-alert
  severity="warning"
  title="Storage almost full"
  [dismissible]="true"
  [(visible)]="visible"
  (closing)="confirmClose($event)"
>
  You have used 92% of your quota.
  <div ogeAlertActions>
    <button type="button">Manage storage</button>
  </div>
</oge-alert>
@if (!visible()) {
  <button type="button" (click)="visible.set(true)">Show again</button>
}`,
  body: `protected readonly visible = signal(true);

protected confirmClose(event: OgeAlertClosingEvent): void {
  // e.g. keep it while an upload is still running
  event.cancel = false;
}`,
});

export const LIVE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAlert'] },
  template: `<!-- The role stays on the host while it is hidden, so showing the alert
     again inserts its text into an existing live region — and screen readers
     announce it. live="off" renders no role for a permanent note. -->
<button type="button" (click)="saved.set(!saved())">Toggle saved</button>
<oge-alert severity="success" [(visible)]="saved">Draft saved.</oge-alert>
<oge-alert severity="info" live="off">This page is read-only.</oge-alert>`,
  body: `protected readonly saved = signal(false);`,
});

export const ICON_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAlert', 'OgeAlertIcon'] },
  template: `<!-- [ogeAlertIcon] replaces the default glyph; it is rendered inside an
     aria-hidden wrapper. showIcon=false drops the icon column. -->
<oge-alert severity="info" title="Tip">
  <svg ogeAlertIcon viewBox="0 0 24 24" width="20" height="20" fill="none"
       stroke="currentColor" stroke-width="2">
    <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" />
  </svg>
  Press <kbd>?</kbd> to see every keyboard shortcut.
</oge-alert>
<oge-alert severity="info" [showIcon]="false">No icon at all.</oge-alert>`,
});
