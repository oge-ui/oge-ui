import { demoSource } from '../../shared/demo-source';

export const DETERMINATE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeProgressBar'] },
  template: `<!-- role="progressbar" with the full aria triple. showLabel
     renders the rounded percent; formatLabel replaces it AND feeds
     aria-valuetext, so display and announcement never diverge. -->
<oge-progress-bar [value]="uploaded()" [showLabel]="true" />

<oge-progress-bar
  [value]="uploaded()"
  [max]="200"
  [showLabel]="true"
  [formatLabel]="asMegabytes"
  ariaLabel="Upload"
/>`,
  body: `protected readonly uploaded = signal(80);
protected readonly asMegabytes = (value: number): string => \`\${value} MB\`;`,
});

export const INDETERMINATE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeProgressBar'] },
  template: `<!-- value: null (the default) is the indeterminate sliding bar.
     Per the ARIA guidance aria-valuenow is then OMITTED entirely — never
     pinned to a sentinel. bufferValue adds Material's second layer (media
     pre-loading behind the play position). -->
<oge-progress-bar ariaLabel="Preparing" />

<oge-progress-bar [value]="played()" [bufferValue]="buffered()" ariaLabel="Playback" />`,
  body: `protected readonly played = signal(35);
protected readonly buffered = signal(70);`,
});

export const CHUNK_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeProgressBar'] },
  template: `<!-- chunkCount renders Kendo's segmented variant — the filled
     segment count is the rounded ratio. severity recolors the fill with the
     card/toast vocabulary. -->
<oge-progress-bar [value]="step() * 20" [chunkCount]="5" ariaLabel="Steps" />

<oge-progress-bar [value]="92" severity="success" [showLabel]="true" ariaLabel="Sync" />
<oge-progress-bar [value]="45" severity="danger" [showLabel]="true" ariaLabel="Disk" />`,
  body: `protected readonly step = signal(3);`,
});

export const LOAD_INDICATOR_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeLoadIndicator'] },
  template: `<!-- The suite's canonical ring, deliberately indeterminate-only
     (a circle filling toward completion is the progress bar's job). Under
     prefers-reduced-motion it slows rather than stops — a frozen ring reads
     as finished. inheritSize makes a 1em ring for buttons. -->
<oge-load-indicator size="sm" />
<oge-load-indicator />
<oge-load-indicator size="lg" ariaLabel="Loading report" />

<button type="button" disabled>
  <oge-load-indicator [inheritSize]="true" /> Saving…
</button>`,
});

export const SKELETON_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeSkeleton'] },
  template: `<!-- Always aria-hidden decoration: the loading REGION owns the
     announcement — put aria-busy (and a visually-hidden status text where
     the change should be announced) on the container. shimmer is the
     card/accordion gradient recipe; pulse is the grid filler rows' beat. -->
<div [attr.aria-busy]="loading() ? true : null" class="flex items-center gap-3">
  <oge-skeleton shape="circle" [width]="40" [height]="40" />
  <div class="flex-1">
    <oge-skeleton [width]="'60%'" />
    <oge-skeleton class="mt-2" [width]="'40%'" animation="pulse" />
  </div>
</div>

<oge-skeleton shape="rectangle" height="96px" class="mt-3" />

<!-- lines: the tapered multi-line text stack in one input. -->
<oge-skeleton [lines]="3" class="mt-3" />`,
  body: `protected readonly loading = signal(true);`,
});

export const ASYNC_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeProgressBar', 'OgeSkeleton'] },
  template: `<!-- A real flow: indeterminate while the size is unknown, then
     determinate, then a one-shot completed event. -->
@if (total() === null) {
  <oge-progress-bar ariaLabel="Download" />
} @else {
  <oge-progress-bar
    [value]="received()"
    [max]="total()!"
    [showLabel]="true"
    ariaLabel="Download"
    (completed)="done.set(true)"
  />
}`,
  body: `protected readonly total = signal<number | null>(null);
protected readonly received = signal(0);
protected readonly done = signal(false);`,
});
