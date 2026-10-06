import { demoSource } from '../../shared/demo-source';

export const POPOVER_BASIC_SNIPPET = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton'],
    '@oge-ui/overlay': ['OgePopover', 'OgePopoverTrigger', 'OgePopoverFooter'],
  },
  template: `<oge-button text="Share" [ogePopover]="share" />

<oge-popover #share title="Share report" [arrow]="true">
  <p>Anyone with the link can view this report.</p>
  <div *ogePopoverFooter="let close">
    <oge-button text="Done" stylingMode="text" (clicked)="close()" />
    <oge-button text="Copy link" (clicked)="copied(); close()" />
  </div>
</oge-popover>

<!-- the trigger gets aria-haspopup="dialog", aria-expanded and
     aria-controls; Escape, outside clicks and the ✕ close it -->`,
  body: `protected copied(): void {
  console.log('link copied');
}`,
});

export const POPOVER_TRIGGERS_SNIPPET = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton'],
    '@oge-ui/overlay': ['OgePopover', 'OgePopoverTrigger'],
  },
  template: `<!-- click (default): the APG disclosure -->
<oge-button text="Click" [ogePopover]="click" />
<oge-popover #click title="Click">Toggles on activation.</oge-popover>

<!-- hover: dwell + a grace period that survives moving into the panel;
     keyboard focus opens it too -->
<oge-button text="Hover" [ogePopover]="hover" />
<oge-popover #hover showOn="hover" [showCloseButton]="false" ariaLabel="Hover help">
  Move into me — I stay open. <a href="#hover">Links work</a>.
</oge-popover>

<!-- focus: opens while the trigger (or the panel) has focus -->
<input aria-label="Coupon" placeholder="Coupon code" [ogePopover]="focus" />
<oge-popover #focus showOn="focus" [showCloseButton]="false" ariaLabel="Coupon help">
  Codes are case-insensitive.
</oge-popover>

<!-- manual: only code opens it (exportAs: 'ogePopover') -->
<oge-button text="Manual" [ogePopover]="manual" (clicked)="manual.toggle()" />
<oge-popover #manual showOn="manual" title="Manual">Opened from code.</oge-popover>`,
});

export const POPOVER_PLACEMENT_SNIPPET = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton'],
    '@oge-ui/overlay': ['OgePopover', 'OgePopoverTrigger'],
  },
  template: `<oge-button text="Top" [ogePopover]="top" />
<oge-popover #top placement="top" [arrow]="true" title="Top">
  Centered above; flips below when there is no room.
</oge-popover>

<oge-button text="Right start" [ogePopover]="right" />
<oge-popover #right placement="right-start" [arrow]="true" [width]="220" title="Right start">
  The arrow keeps pointing at the trigger after the viewport clamp.
</oge-popover>`,
});

export const POPOVER_MODAL_SNIPPET = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton'],
    '@oge-ui/overlay': ['OgePopover', 'OgePopoverTrigger', 'OgePopoverFooter'],
  },
  template: `<!-- non-modal (default): Tab moves from the trigger into the panel and
     on past it — focus order matches the visual order -->
<oge-button text="Filter" [ogePopover]="filter" />
<oge-popover #filter title="Filter">
  <label>Contains <input /></label>
</oge-popover>

<!-- modal: aria-modal, focus moves in, Tab is trapped, focus returns -->
<oge-button text="Rename" [ogePopover]="rename" />
<oge-popover #rename title="Rename file" [modal]="true">
  <label>Name <input value="report.xlsx" /></label>
  <div *ogePopoverFooter="let close">
    <oge-button text="Cancel" stylingMode="text" (clicked)="close()" />
    <oge-button text="Save" (clicked)="close()" />
  </div>
</oge-popover>`,
});

export const POPOVER_EVENTS_SNIPPET = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton'],
    '@oge-ui/overlay': ['OgePopover', 'OgePopoverTrigger'],
  },
  types: { '@oge-ui/overlay': ['OgePopoverClosingEvent'] },
  template: `<oge-button text="Details" [ogePopover]="details" />
<!-- opened from code, it anchors to its first [ogePopover] trigger
     (or to [anchor]) -->
<oge-button text="Open from code" stylingMode="outlined" (clicked)="details.open()" />

<oge-popover
  #details
  title="Order #1042"
  [(visible)]="visible"
  (opened)="log('opened: ' + $event.reason)"
  (closing)="guard($event)"
  (closed)="log('closed: ' + $event.reason)"
>
  Shipped today.
</oge-popover>`,
  body: `protected readonly visible = signal(false);
protected readonly pinned = signal(false);

// closing is cancelable: keep the popover while "pinned"
protected guard(event: OgePopoverClosingEvent): void {
  event.cancel = this.pinned() && event.reason !== 'closeButton';
}

protected log(message: string): void {
  console.log(message);
}`,
});
