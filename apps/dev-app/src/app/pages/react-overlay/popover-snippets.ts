import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React popover page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../overlay/popover.ts`.
 */
export const OVERLAY_POPOVER_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Basics',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['OgePopover'],
      },
      name: 'PopoverDemo',
      jsx: `<OgePopover
  trigger={<OgeButton text="Share" />}
  title="Share report"
  arrow
  renderFooter={({ close }) => (
    <>
      <OgeButton text="Done" stylingMode="text" onClick={close} />
      <OgeButton text="Copy link" onClick={close} />
    </>
  )}
>
  <p>Anyone with the link can view this report.</p>
  {/* the trigger gets aria-haspopup="dialog", aria-expanded and
      aria-controls; Escape, outside clicks and the ✕ close it */}
</OgePopover>`,
    }),
  },
  {
    title: 'Triggers',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['OgePopover'],
      },
      types: { '@oge-ui/react-overlay': ['OgePopoverHandle'] },
      react: ['useRef'],
      name: 'PopoverTriggersDemo',
      body: `const manual = useRef<OgePopoverHandle>(null);`,
      jsx: `<>
  {/* click (default): the APG disclosure */}
  <OgePopover trigger={<OgeButton text="Click" />} title="Click">
    Toggles on activation.
  </OgePopover>
  {/* hover: dwell + a grace period that survives moving into the panel;
      keyboard focus opens it too */}
  <OgePopover
    trigger={<OgeButton text="Hover" />}
    showOn="hover"
    showCloseButton={false}
    ariaLabel="Hover help"
  >
    Move into me — I stay open. <a href="#hover">Links work</a>.
  </OgePopover>
  {/* focus: opens while the trigger (or the panel) has focus */}
  <OgePopover
    trigger={<input aria-label="Coupon" placeholder="Coupon code" />}
    showOn="focus"
    showCloseButton={false}
    ariaLabel="Coupon help"
  >
    Codes are case-insensitive.
  </OgePopover>
  {/* manual: only code opens it (the ref handle) */}
  <OgePopover
    ref={manual}
    trigger={<OgeButton text="Manual" onClick={() => manual.current?.toggle()} />}
    showOn="manual"
    title="Manual"
  >
    Opened from code.
  </OgePopover>
</>`,
    }),
  },
  {
    title: 'Placement & arrow',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['OgePopover'],
      },
      name: 'PopoverPlacementDemo',
      jsx: `<>
  <OgePopover trigger={<OgeButton text="Top" />} placement="top" arrow title="Top">
    Centered above; flips below when there is no room.
  </OgePopover>
  <OgePopover
    trigger={<OgeButton text="Right start" />}
    placement="right-start"
    arrow
    width={220}
    title="Right start"
  >
    The arrow keeps pointing at the trigger after the viewport clamp.
  </OgePopover>
</>`,
    }),
  },
  {
    title: 'Modal vs non-modal',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['OgePopover'],
      },
      name: 'PopoverModalDemo',
      jsx: `<>
  {/* non-modal (default): Tab moves from the trigger into the panel and
      on past it — focus order matches the visual order */}
  <OgePopover trigger={<OgeButton text="Filter" />} title="Filter">
    <label>Contains <input /></label>
  </OgePopover>
  {/* modal: aria-modal, focus moves in, Tab is trapped, focus returns */}
  <OgePopover
    trigger={<OgeButton text="Rename" />}
    title="Rename file"
    modal
    renderFooter={({ close }) => (
      <>
        <OgeButton text="Cancel" stylingMode="text" onClick={close} />
        <OgeButton text="Save" onClick={close} />
      </>
    )}
  >
    <label>Name <input defaultValue="report.xlsx" /></label>
  </OgePopover>
</>`,
    }),
  },
  {
    title: 'Events & imperative API',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['OgePopover'],
      },
      types: { '@oge-ui/react-overlay': ['OgePopoverClosingEvent'] },
      react: ['useState'],
      name: 'PopoverEventsDemo',
      body: `const [open, setOpen] = useState(false);
const [pinned] = useState(false);

// onClosing is cancelable: keep the popover while "pinned"
const guard = (event: OgePopoverClosingEvent) => {
  event.cancel = pinned && event.reason !== 'closeButton';
};`,
      jsx: `<>
  <OgePopover
    trigger={<OgeButton text="Details" />}
    title="Order #1042"
    open={open}
    onOpenChange={setOpen}
    onOpened={(e) => console.log('opened:', e.reason)}
    onClosing={guard}
    onClosed={(e) => console.log('closed:', e.reason)}
  >
    Shipped today.
  </OgePopover>
  {/* the controlled state opens it through the same pipeline */}
  <OgeButton text="Open from code" stylingMode="outlined" onClick={() => setOpen(true)} />
</>`,
    }),
  },
];
