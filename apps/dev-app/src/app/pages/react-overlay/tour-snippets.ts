import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React tour page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 * Section-for-section mirror of `../overlay/tour.ts`.
 */
const STEPS = `const steps: OgeTourStep[] = [
  {
    target: '#tour-search',
    title: 'Search everything',
    content: 'Type a customer, an invoice number or an amount.',
  },
  {
    target: '#tour-filters',
    title: 'Narrow it down',
    content: 'Filters keep their state when you come back.',
    placement: 'bottom-start',
  },
  {
    target: '#tour-export',
    title: 'Take the data with you',
    content: 'Export the current view to Excel or PDF.',
    placement: 'left',
  },
  // no target: the card is centered
  { title: 'You are all set', content: 'Reopen this tour any time from the Help menu.' },
];`;

const WELCOME = `const steps: OgeTourStep[] = [
  { title: 'Welcome to OGE', content: 'A two-minute look at what is new.' },
  { title: 'Faster grids', content: 'Scrolling 100,000 rows now runs at 60 fps.' },
  { title: 'New components', content: 'Image viewer, command palette and this tour.' },
];`;

export const OVERLAY_TOUR_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Guided tour',
    description:
      'Targets are CSS selectors here (an element or a function works too); placement picks the side of the card, which flips to fit. The last step has no target, so its card is centered. onClosed reports how it ended.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-overlay': ['OgeTour'] },
      types: { '@oge-ui/react-overlay': ['OgeTourHandle', 'OgeTourStep'] },
      name: 'TourBasicsDemo',
      before: STEPS,
      body: `const tour = useRef<OgeTourHandle>(null);
const [last, setLast] = useState('Not taken yet');`,
      jsx: `<>
  <div className="toolbar">
    <input id="tour-search" type="search" aria-label="Search" />
    <button id="tour-filters" type="button">Filters</button>
    <button id="tour-export" type="button">Export</button>
  </div>
  <button type="button" onClick={() => tour.current?.start()}>
    Take the tour
  </button>
  <OgeTour
    ref={tour}
    steps={steps}
    onClosed={(e) => setLast(\`Closed by \${e.reason} on step \${e.step + 1}\`)}
  />
  <p>{last}</p>
</>`,
    }),
  },
  {
    title: 'Resuming & centered steps',
    description:
      'step / onStepChange and opened / onOpenedChange are controlled, so a tour can resume where the user left off. Steps without a target center the card; closeOnBackdropClick lets a press on the page skip the tour.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-overlay': ['OgeTour'] },
      types: { '@oge-ui/react-overlay': ['OgeTourStep'] },
      name: 'TourControlledDemo',
      before: WELCOME,
      body: `const [step, setStep] = useState(0);
const [opened, setOpened] = useState(false);`,
      jsx: `<>
  <button type="button" onClick={() => setOpened(true)}>
    Resume the tour
  </button>
  <OgeTour
    steps={steps}
    step={step}
    onStepChange={setStep}
    opened={opened}
    onOpenedChange={setOpened}
    closeOnBackdropClick
  />
  <p>
    Step {step + 1} of {steps.length}
  </p>
</>`,
    }),
  },
];
