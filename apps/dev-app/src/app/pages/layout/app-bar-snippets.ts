import { demoSource } from '../../shared/demo-source';

export const SECTIONS_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeAppBar', 'OgeAppBarEnd', 'OgeAppBarStart'],
  },
  template: `<!-- [ogeAppBarStart] / [ogeAppBarEnd] size to their content; unmarked
     content goes to the center section, which takes the rest and lets a
     long title truncate instead of pushing the actions off a phone. -->
<oge-app-bar>
  <button ogeAppBarStart type="button" aria-label="Open menu" (click)="last.set('menu')">
    ☰
  </button>
  <strong>Inbox</strong>
  <button ogeAppBarEnd type="button" (click)="last.set('search')">Search</button>
  <button ogeAppBarEnd type="button" (click)="last.set('profile')">Profile</button>
</oge-app-bar>
<p>last action → {{ last() }}</p>`,
  body: `protected readonly last = signal('—');`,
});

export const COLORS_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAppBar', 'OgeAppBarEnd'] },
  template: `<!-- default is the page surface with a hairline on the content edge,
     primary the accent, inverse the dark tooltip surface, transparent
     none. size is the 48 / 56 / 64 px density; elevated adds the card
     shadow. All colours are tokens, so a theme re-tunes every bar. -->
<oge-app-bar size="sm"><strong>Default · sm</strong></oge-app-bar>
<oge-app-bar color="primary" [elevated]="true">
  <strong>Primary · elevated</strong>
  <button ogeAppBarEnd type="button">Action</button>
</oge-app-bar>
<oge-app-bar color="inverse" size="lg" centerAlign="center">
  <strong>Inverse · lg · centered</strong>
</oge-app-bar>
<oge-app-bar color="transparent"><strong>Transparent</strong></oge-app-bar>`,
});

export const STICKY_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAppBar', 'OgeAppBarEnd'] },
  template: `<!-- sticky sticks to the top of the nearest scroll container; fixed pins
     to the viewport instead (positionMode="fixed" — not shown here, it would
     cover these docs). Both pad with env(safe-area-inset-*) as a floor, so
     the bar clears a notch once the app opts into viewport-fit=cover. -->
<div role="region" aria-label="Scrolling article" tabindex="0" style="max-height: 240px; overflow: auto">
  <oge-app-bar positionMode="sticky" [elevated]="true">
    <strong>Article</strong>
    <button ogeAppBarEnd type="button">Share</button>
  </oge-app-bar>
  @for (paragraph of paragraphs; track $index) {
    <p>{{ paragraph }}</p>
  }
</div>`,
  body: `protected readonly paragraphs = Array.from(
  { length: 8 },
  (_, i) => \`Paragraph \${i + 1}: scroll inside this box — the bar stays on top.\`,
);`,
});

export const BOTTOM_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAppBar'] },
  template: `<!-- position="bottom" moves the hairline and the shadow to the top
     edge and the safe-area padding to the home-indicator edge. -->
<div role="region" aria-label="Phone screen" tabindex="0" style="max-height: 240px; overflow: auto">
  @for (paragraph of paragraphs; track $index) {
    <p>{{ paragraph }}</p>
  }
  <oge-app-bar position="bottom" positionMode="sticky" centerAlign="center">
    <button type="button" [attr.aria-pressed]="tab() === 'home'" (click)="tab.set('home')">Home</button>
    <button type="button" [attr.aria-pressed]="tab() === 'search'" (click)="tab.set('search')">Search</button>
    <button type="button" [attr.aria-pressed]="tab() === 'me'" (click)="tab.set('me')">Me</button>
  </oge-app-bar>
</div>`,
  body: `protected readonly tab = signal('home');
protected readonly paragraphs = Array.from(
  { length: 8 },
  (_, i) => \`Message \${i + 1}\`,
);`,
});

export const LANDMARK_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAppBar', 'OgeAppBarStart'] },
  template: `<!-- A landmark only on request: landmark="banner" for the ONE page header,
     "contentinfo" for a page footer, "navigation" / "region" plus an
     ariaLabel for a named secondary bar. ariaLabel is written only when a
     landmark is set — on a role-less element it would be invalid ARIA. -->
<oge-app-bar landmark="navigation" ariaLabel="Project" color="inverse" size="sm">
  <strong ogeAppBarStart>Project</strong>
  <a href="#landmarks">Overview</a>
  <a href="#landmarks">Issues</a>
  <a href="#landmarks">Settings</a>
</oge-app-bar>`,
});
