import { StrictMode, useRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import {
  OGE_LIVE_ANNOUNCER_ATTR,
  OGE_LOAD_PANEL_TARGET_CLASS,
  getOgeLiveAnnouncer,
  ogeProgressRingGeometry,
  type OgeExpansionPanelExpandingEvent,
} from '@oge-ui/behavior';
import {
  OgeExpansionPanel,
  type OgeExpansionPanelHandle,
} from './expansion-panel';
import { OgeLoadIndicatorConfigProvider } from './layout-config';
import { OgeLoadPanel } from './load-panel';
import {
  OgePanelBar,
  type OgePanelBarHandle,
  type OgePanelBarItemDefinition,
} from './panel-bar';
import { OgeProgressBar } from './progress-bar';

const q = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector(selector) as T;
const wait = (ms: number) =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

// --- circular progress -----------------------------------------------------

describe('<OgeProgressBar type="circular">', () => {
  it('draws the shared ring geometry and keeps the aria contract', () => {
    render(
      <OgeProgressBar
        type="circular"
        value={25}
        size={80}
        thickness={10}
        chunkCount={4}
        bufferValue={50}
      />,
    );
    const bar = q('.oge-progress-bar');
    expect(bar).toHaveClass('oge-progress-bar-circular');
    expect(bar).toHaveAttribute('role', 'progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '25');
    expect(q('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(q('svg')).toHaveAttribute('viewBox', '0 0 80 80');
    const value = q('.oge-progress-ring-value');
    expect(value).toHaveAttribute('r', '35');
    expect(Number(value.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      ogeProgressRingGeometry({ ratio: 0.25, size: 80, thickness: 10 })
        .dashOffset,
    );
    expect(document.querySelector('.oge-progress-bar-chunk')).toBeNull();
    expect(document.querySelector('.oge-progress-bar-buffer')).toBeNull();
  });

  it('indeterminate omits aria-valuenow; the label is centred', () => {
    const { rerender } = render(<OgeProgressBar type="circular" />);
    expect(q('.oge-progress-bar')).not.toHaveAttribute('aria-valuenow');
    expect(q('.oge-progress-bar')).toHaveClass(
      'oge-progress-bar-indeterminate',
    );
    rerender(
      <OgeProgressBar
        type="circular"
        value={3}
        max={4}
        showLabel
        formatLabel={(v) => `${v} of 4`}
      />,
    );
    expect(q('.oge-progress-ring .oge-progress-ring-label').textContent).toBe(
      '3 of 4',
    );
    expect(q('.oge-progress-bar')).toHaveAttribute('aria-valuetext', '3 of 4');
  });
});

// --- load panel ------------------------------------------------------------

describe('<OgeLoadPanel>', () => {
  afterEach(() => getOgeLiveAnnouncer().clear());

  function Covered(props: {
    visible: boolean;
    showDelay?: number;
    minDisplayTime?: number;
    onShown?: () => void;
    onHidden?: () => void;
    message?: string;
  }) {
    return (
      <section className="target" aria-busy="false">
        <button type="button">Act</button>
        <OgeLoadPanel {...props} />
      </section>
    );
  }

  it('marks the parent busy while shown and restores it', () => {
    const log: string[] = [];
    const { rerender } = render(
      <Covered
        visible={false}
        onShown={() => log.push('shown')}
        onHidden={() => log.push('hidden')}
      />,
    );
    expect(q('.oge-load-panel')).not.toHaveClass('oge-load-panel-shown');
    rerender(
      <Covered
        visible
        onShown={() => log.push('shown')}
        onHidden={() => log.push('hidden')}
      />,
    );
    expect(q('.oge-load-panel')).toHaveClass('oge-load-panel-shown');
    expect(q('.target')).toHaveAttribute('aria-busy', 'true');
    expect(q('.target')).toHaveClass(OGE_LOAD_PANEL_TARGET_CLASS);
    expect(q('.oge-load-panel-message').textContent).toBe('Loading…');
    expect(q('.oge-load-indicator')).toHaveAttribute('aria-label', 'Loading…');
    rerender(
      <Covered
        visible={false}
        onShown={() => log.push('shown')}
        onHidden={() => log.push('hidden')}
      />,
    );
    expect(q('.target')).toHaveAttribute('aria-busy', 'false');
    expect(q('.target')).not.toHaveClass(OGE_LOAD_PANEL_TARGET_CLASS);
    expect(log).toEqual(['shown', 'hidden']);
  });

  it('announces through the shared polite region, never a local one', async () => {
    render(<Covered visible message="Fetching orders" />);
    await wait(150);
    expect(
      document.querySelector(`[${OGE_LIVE_ANNOUNCER_ATTR}="polite"]`)
        ?.textContent,
    ).toBe('Fetching orders');
    expect(
      q('.oge-load-panel').querySelector('[aria-live], [role="status"]'),
    ).toBeNull();
  });

  it('swallows pointer input meant for the container', () => {
    let clicks = 0;
    render(
      <div onClick={() => clicks++}>
        <Covered visible />
      </div>,
    );
    fireEvent.click(q('.oge-load-panel'));
    expect(clicks).toBe(0);
    const down = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    q('.oge-load-panel').dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  });

  it('honours showDelay and minDisplayTime', () => {
    vi.useFakeTimers();
    try {
      const log: string[] = [];
      const props = {
        showDelay: 200,
        minDisplayTime: 300,
        onShown: () => log.push('shown'),
        onHidden: () => log.push('hidden'),
      };
      const { rerender } = render(<Covered visible {...props} />);
      act(() => vi.advanceTimersByTime(199));
      expect(log).toEqual([]);
      act(() => vi.advanceTimersByTime(1));
      expect(log).toEqual(['shown']);
      rerender(<Covered visible={false} {...props} />);
      act(() => vi.advanceTimersByTime(299));
      expect(log).toEqual(['shown']);
      act(() => vi.advanceTimersByTime(1));
      expect(log).toEqual(['shown', 'hidden']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('portals into an explicit target given as a ref', () => {
    function WithRef() {
      const ref = useRef<HTMLDivElement | null>(null);
      return (
        <>
          <div className="elsewhere" ref={ref} />
          <section className="target" aria-busy="false">
            <OgeLoadPanel visible target={ref} />
          </section>
        </>
      );
    }
    render(<WithRef />);
    expect(q('.oge-load-panel').parentElement).toBe(q('.elsewhere'));
    expect(q('.elsewhere')).toHaveAttribute('aria-busy', 'true');
    expect(q('.target')).toHaveAttribute('aria-busy', 'false');
  });

  it('full screen without a target marks nothing', () => {
    render(
      <section className="target" aria-busy="false">
        <OgeLoadPanel visible fullScreen />
      </section>,
    );
    expect(q('.oge-load-panel')).toHaveClass('oge-load-panel-full-screen');
    expect(q('.target')).toHaveAttribute('aria-busy', 'false');
  });

  it('reads loadPanelMessage from the load-indicator provider', () => {
    render(
      <OgeLoadIndicatorConfigProvider
        config={{ messages: { loadPanelMessage: 'Yükleniyor…' } }}
      >
        <Covered visible />
      </OgeLoadIndicatorConfigProvider>,
    );
    expect(q('.oge-load-panel-message').textContent).toBe('Yükleniyor…');
  });

  it('survives a StrictMode double mount', () => {
    const log: string[] = [];
    const { rerender } = render(
      <StrictMode>
        <Covered visible onShown={() => log.push('shown')} />
      </StrictMode>,
    );
    expect(q('.target')).toHaveAttribute('aria-busy', 'true');
    expect(log).toEqual(['shown']);
    rerender(
      <StrictMode>
        <Covered visible={false} onShown={() => log.push('shown')} />
      </StrictMode>,
    );
    expect(q('.target')).toHaveAttribute('aria-busy', 'false');
    expect(q('.oge-load-panel')).not.toHaveClass('oge-load-panel-shown');
  });
});

// --- expansion panel -------------------------------------------------------

describe('<OgeExpansionPanel>', () => {
  const toggle = () => q<HTMLButtonElement>('.oge-expansion-panel-toggle');
  const region = () => q('.oge-expansion-panel-region');

  it('follows the APG disclosure contract and toggles', async () => {
    const log: string[] = [];
    render(
      <OgeExpansionPanel
        title="Shipping"
        subtitle="2 addresses"
        headerActions={
          <button type="button" className="edit">
            Edit
          </button>
        }
        onExpanding={() => log.push('expanding')}
        onOpened={() => log.push('opened')}
        onCollapsing={() => log.push('collapsing')}
        onClosed={() => log.push('closed')}
      >
        <span className="body">Body</span>
      </OgeExpansionPanel>,
    );
    expect(toggle().closest('h3')).not.toBeNull();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(toggle()).toHaveAttribute('aria-controls', region().id);
    expect(region()).toHaveAttribute('role', 'region');
    expect(region()).toHaveAttribute('aria-labelledby', toggle().id);
    // deferred: the body is not rendered before the first expand
    expect(document.querySelector('.body')).toBeNull();
    expect(q('.edit').closest('.oge-expansion-panel-toggle')).toBeNull();

    fireEvent.click(toggle());
    await flush();
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('.body')).not.toBeNull();
    fireEvent.click(toggle());
    await flush();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    // kept once rendered
    expect(document.querySelector('.body')).not.toBeNull();
    expect(log).toEqual(['expanding', 'opened', 'collapsing', 'closed']);
  });

  it('a canceled onExpanding and a guard both veto', async () => {
    const cancel = (e: OgeExpansionPanelExpandingEvent) => (e.cancel = true);
    const { rerender } = render(
      <OgeExpansionPanel title="A" onExpanding={cancel} />,
    );
    fireEvent.click(toggle());
    await flush();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    rerender(<OgeExpansionPanel title="A" expandGuard={() => false} />);
    fireEvent.click(toggle());
    await flush();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('controlled: reports through onExpandedChange', async () => {
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <span className="state">{String(open)}</span>
          <OgeExpansionPanel
            title="A"
            expanded={open}
            onExpandedChange={setOpen}
          />
        </>
      );
    }
    render(<Controlled />);
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle());
    await flush();
    expect(q('.state').textContent).toBe('false');
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('disabled refuses and leaves the Tab sequence; the handle works', async () => {
    const ref: { current: OgeExpansionPanelHandle | null } = { current: null };
    const { rerender } = render(
      <OgeExpansionPanel title="A" disabled ref={ref} />,
    );
    expect(toggle()).toHaveAttribute('aria-disabled', 'true');
    expect(toggle().tabIndex).toBe(-1);
    fireEvent.click(toggle());
    await flush();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    rerender(<OgeExpansionPanel title="A" ref={ref} />);
    await act(async () => {
      await ref.current?.expand();
    });
    expect(ref.current?.isExpanded()).toBe(true);
  });

  it('survives a StrictMode double mount', async () => {
    render(
      <StrictMode>
        <OgeExpansionPanel title="A">Body</OgeExpansionPanel>
      </StrictMode>,
    );
    fireEvent.click(toggle());
    await flush();
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
  });
});

// --- panel bar -------------------------------------------------------------

const ITEMS: OgePanelBarItemDefinition[] = [
  {
    key: 'mail',
    title: 'Mail',
    expanded: true,
    children: [
      { key: 'inbox', title: 'Inbox', badge: 4 },
      { key: 'sent', title: 'Sent', disabled: true },
      { key: 'drafts', title: 'Drafts' },
    ],
  },
  {
    key: 'projects',
    title: 'Projects',
    children: [
      {
        key: 'archive',
        title: 'Archive',
        children: [{ key: 'old', title: 'Old' }],
      },
    ],
  },
  { key: 'about', title: 'About', content: <em className="about">v1</em> },
];

describe('<OgePanelBar>', () => {
  const header = (id: string) =>
    document.querySelector(`[data-node-id="${id}"]`) as HTMLButtonElement;

  it('renders nested disclosure groups, seeded from the items', () => {
    render(<OgePanelBar items={ITEMS} />);
    expect(header('mail')).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(
      header('mail').getAttribute('aria-controls') as string,
    );
    expect(panel?.contains(header('inbox'))).toBe(true);
    expect(header('inbox')).not.toHaveAttribute('aria-expanded');
    expect(header('sent')).toHaveAttribute('aria-disabled', 'true');
    expect(header('archive')).toBeNull(); // deferred
    expect(document.querySelector('[role="tree"]')).toBeNull();
  });

  it('single mode collapses the open sibling and reports it', async () => {
    const log: string[] = [];
    render(
      <OgePanelBar
        items={ITEMS}
        expandMode="single"
        onItemExpanded={(e) => log.push(`expanded:${e.key}`)}
        onItemCollapsed={(e) => log.push(`collapsed:${e.key}`)}
      />,
    );
    fireEvent.click(header('projects'));
    await flush();
    expect(header('mail')).toHaveAttribute('aria-expanded', 'false');
    expect(header('projects')).toHaveAttribute('aria-expanded', 'true');
    expect(log).toEqual(['collapsed:mail', 'expanded:projects']);
  });

  it('a canceled onItemExpanding keeps the group closed', async () => {
    render(
      <OgePanelBar
        items={ITEMS}
        onItemExpanding={(e) => {
          e.cancel = true;
        }}
      />,
    );
    fireEvent.click(header('projects'));
    await flush();
    expect(header('projects')).toHaveAttribute('aria-expanded', 'false');
  });

  it('selects leaves (uncontrolled) with aria-current', async () => {
    const changes: (string | undefined)[][] = [];
    render(
      <OgePanelBar
        items={ITEMS}
        onSelectionChanged={(e) => changes.push([e.key, e.previousKey])}
      />,
    );
    fireEvent.click(header('inbox'));
    fireEvent.click(header('drafts'));
    fireEvent.click(header('sent'));
    await flush();
    expect(header('drafts')).toHaveAttribute('aria-current', 'true');
    expect(header('inbox')).not.toHaveAttribute('aria-current');
    expect(changes).toEqual([
      ['inbox', undefined],
      ['drafts', 'inbox'],
    ]);
  });

  it('controlled expandedKeys and selectedKey', async () => {
    function Controlled() {
      const [open, setOpen] = useState<readonly string[]>(['projects']);
      const [page, setPage] = useState('drafts');
      return (
        <>
          <span className="open">{open.join(',')}</span>
          <OgePanelBar
            items={ITEMS}
            expandedKeys={open}
            onExpandedKeysChange={setOpen}
            selectedKey={page}
            onSelectedKeyChange={setPage}
          />
        </>
      );
    }
    render(<Controlled />);
    expect(header('mail')).toHaveAttribute('aria-expanded', 'false');
    expect(header('projects')).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(header('mail'));
    await flush();
    expect(q('.open').textContent).toBe('mail,projects');
    expect(header('drafts')).toHaveAttribute('aria-current', 'true');
  });

  it('renders content items lazily, through renderContent when given', async () => {
    const { rerender } = render(<OgePanelBar items={ITEMS} />);
    expect(document.querySelector('.about')).toBeNull();
    fireEvent.click(header('about'));
    await flush();
    expect(q('.oge-panel-bar-content .about').textContent).toBe('v1');
    rerender(
      <OgePanelBar
        items={ITEMS}
        renderContent={({ item }) => <b className="tpl">tpl {item.key}</b>}
      />,
    );
    expect(q('.oge-panel-bar-content .tpl').textContent).toBe('tpl about');
  });

  it('keyboard: arrows walk headers, Right/Left expand and climb', async () => {
    render(<OgePanelBar items={ITEMS} />);
    header('inbox').focus();
    fireEvent.keyDown(header('inbox'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(header('drafts'));
    fireEvent.keyDown(header('drafts'), { key: 'End' });
    expect(document.activeElement).toBe(header('about'));
    fireEvent.keyDown(header('about'), { key: 'Home' });
    expect(document.activeElement).toBe(header('mail'));
    header('projects').focus();
    fireEvent.keyDown(header('projects'), { key: 'ArrowRight' });
    await flush();
    expect(header('projects')).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(header('projects'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(header('archive'));
    fireEvent.keyDown(header('archive'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(header('projects'));
  });

  it('the handle drives the groups', async () => {
    const ref: { current: OgePanelBarHandle | null } = { current: null };
    render(<OgePanelBar items={ITEMS} ref={ref} />);
    act(() => ref.current?.expandAll());
    await flush();
    expect(ref.current?.isExpanded('archive')).toBe(true);
    act(() => ref.current?.collapseAll());
    await flush();
    expect(header('mail')).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the empty text without items', () => {
    render(<OgePanelBar items={[]} />);
    expect(q('.oge-panel-bar-empty').textContent).toBe(
      'No sections to display',
    );
  });

  it('survives a StrictMode double mount', async () => {
    render(
      <StrictMode>
        <OgePanelBar items={ITEMS} />
      </StrictMode>,
    );
    fireEvent.click(header('projects'));
    await flush();
    expect(header('projects')).toHaveAttribute('aria-expanded', 'true');
  });
});
