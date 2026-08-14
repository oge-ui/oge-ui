import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React progress & loading page. Pure data, no React
 * imports — the `llms.txt` generator and the compile gate load this module in
 * plain Node.
 *
 * Section-for-section mirror of `../layout/progress.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same six sections, same order, same
 * example content, React idiom (`onCompleted` for the `(completed)` output).
 */
export const LAYOUT_PROGRESS_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Determinate bar',
    description:
      'Transform-driven fill (no layout work per frame, mirrors in RTL), value changes glide on a token transition. formatLabel replaces the percent label AND feeds aria-valuetext — display and announcement never diverge.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeProgressBar'] },
      name: 'ProgressDeterminateDemo',
      before: `const asMegabytes = (value: number): string => \`\${value} MB\`;`,
      body: `const [uploaded, setUploaded] = useState(80);`,
      jsx: `<>
  {/* role="progressbar" with the full aria triple. showLabel renders the
      rounded percent; formatLabel replaces it AND feeds aria-valuetext. */}
  <OgeProgressBar value={uploaded} showLabel />

  <OgeProgressBar
    value={uploaded}
    max={200}
    showLabel
    formatLabel={asMegabytes}
    ariaLabel="Upload"
  />

  <label>
    Value
    <input
      type="range"
      min={0}
      max={200}
      value={uploaded}
      onChange={(event) => setUploaded(Number(event.target.value))}
    />
  </label>
</>`,
    }),
  },
  {
    title: 'Indeterminate & buffer',
    description:
      'value: null (the default) renders the sliding bar and omits aria-valuenow — the ARIA rule for the unknown state. bufferValue adds the second layer Material uses for media pre-loading.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeProgressBar'] },
      name: 'ProgressIndeterminateDemo',
      jsx: `<>
  {/* Per the ARIA guidance aria-valuenow is OMITTED entirely for the
      unknown state — never pinned to a sentinel. */}
  <OgeProgressBar ariaLabel="Preparing" />

  <OgeProgressBar value={35} bufferValue={70} ariaLabel="Playback" />
</>`,
    }),
  },
  {
    title: 'Chunks & severity',
    description:
      'chunkCount renders the segmented variant for step-based flows; severity recolors the fill with the card/toast vocabulary.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeProgressBar'] },
      name: 'ProgressChunkDemo',
      jsx: `<>
  {/* The filled segment count is the rounded ratio. */}
  <OgeProgressBar value={60} chunkCount={5} ariaLabel="Steps" />

  <OgeProgressBar value={92} severity="success" showLabel ariaLabel="Sync" />
  <OgeProgressBar value={45} severity="danger" showLabel ariaLabel="Disk" />
</>`,
    }),
  },
  {
    title: 'Load indicator',
    description:
      "The suite's canonical ring — deliberately indeterminate-only: a circle filling toward completion is the progress bar's job. Under prefers-reduced-motion the spin slows rather than stops, because a frozen ring reads as finished.",
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeLoadIndicator'] },
      name: 'LoadIndicatorDemo',
      jsx: `<div className="demo-row demo-row-start">
  <OgeLoadIndicator size="sm" />
  <OgeLoadIndicator />
  <OgeLoadIndicator size="lg" ariaLabel="Loading report" />
  <OgeLoadIndicator severity="success" />

  {/* inheritSize makes a 1em ring that scales with the button's font. */}
  <button type="button" disabled>
    <OgeLoadIndicator inheritSize /> Saving…
  </button>
</div>`,
    }),
  },
  {
    title: 'Skeleton',
    description:
      'Always aria-hidden decoration — the loading REGION owns the announcement: put aria-busy (plus a visually-hidden status text where the change should be announced) on the container. shimmer is the card/accordion gradient; pulse is the data grid’s beat.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeSkeleton'] },
      name: 'SkeletonDemo',
      jsx: `<>
  <div aria-busy="true" className="demo-row demo-row-start">
    <OgeSkeleton shape="circle" width={40} height={40} />
    <div style={{ flex: 1 }}>
      <OgeSkeleton width="60%" />
      <OgeSkeleton width="40%" animation="pulse" />
    </div>
  </div>

  <OgeSkeleton shape="rectangle" height="72px" />

  {/* lines: the tapered multi-line text stack in one prop. */}
  <OgeSkeleton lines={3} />
</>`,
    }),
  },
  {
    title: 'A real async flow',
    description:
      'Indeterminate while the total is unknown, determinate once it is, and a one-shot onCompleted at the end — fired once per arrival at max, again only after a reset.',
    source: reactDemoSource({
      react: ['useEffect', 'useRef', 'useState'],
      use: { '@oge-ui/react-layout': ['OgeProgressBar'] },
      name: 'ProgressAsyncDemo',
      body: `const [total, setTotal] = useState<number | null>(null);
const [received, setReceived] = useState(0);
const [done, setDone] = useState(false);
const discovery = useRef<ReturnType<typeof setTimeout> | null>(null);
const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

const stop = () => {
  if (discovery.current !== null) clearTimeout(discovery.current);
  if (ticker.current !== null) clearInterval(ticker.current);
  discovery.current = null;
  ticker.current = null;
};

// Timers never outlive the component — the React counterpart of the
// Angular page's DestroyRef cleanup.
useEffect(() => stop, []);
useEffect(() => {
  if (received >= 100) stop();
}, [received]);

const start = () => {
  stop();
  setTotal(null);
  setReceived(0);
  setDone(false);
  discovery.current = setTimeout(() => {
    setTotal(100); // "size discovered"
    ticker.current = setInterval(
      () => setReceived((current) => Math.min(current + 9, 100)),
      250,
    );
  }, 900);
};`,
      jsx: `<>
  {total === null ? (
    <OgeProgressBar ariaLabel="Download" />
  ) : (
    <OgeProgressBar
      value={received}
      max={total}
      showLabel
      ariaLabel="Download"
      onCompleted={() => setDone(true)}
    />
  )}
  <p>
    <button type="button" onClick={start}>
      Start download
    </button>
    {done && <span>completed ✓</span>}
  </p>
</>`,
    }),
  },
];
