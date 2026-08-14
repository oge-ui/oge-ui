import { render, screen } from '@testing-library/react';
import { OgeCard } from './card';
import { OgeLoadIndicator } from './load-indicator';
import { OgeProgressBar } from './progress-bar';
import { OgeSkeleton } from './skeleton';
import {
  OgeCardConfigProvider,
  OgeLoadIndicatorConfigProvider,
  OgeProgressBarConfigProvider,
  OgeSkeletonConfigProvider,
} from './layout-config';

const host = (selector: string) =>
  document.querySelector(selector) as HTMLElement;

describe('<OgeCard>', () => {
  it('renders the header row only when it has something to show', () => {
    const { unmount } = render(<OgeCard>body</OgeCard>);
    expect(document.querySelector('.oge-card-header')).toBeNull();
    expect(host('.oge-card-content').textContent).toBe('body');
    unmount();

    render(<OgeCard header="Revenue" subheader="Last 30 days" />);
    expect(host('.oge-card-title').textContent).toBe('Revenue');
    expect(host('.oge-card-subtitle').textContent).toBe('Last 30 days');
  });

  it('maps the presets onto the host classes', () => {
    render(
      <OgeCard
        stylingMode="raised"
        orientation="horizontal"
        size="lg"
        severity="warning"
        interactive
      />,
    );
    const el = host('.oge-card');
    expect(el.className).toContain('oge-card-raised');
    expect(el.className).toContain('oge-card-horizontal');
    expect(el.className).toContain('oge-card-lg');
    expect(el.className).toContain('oge-card-severity-warning');
    expect(el.className).toContain('oge-card-interactive');
  });

  it('loading swaps the content for the skeleton and marks aria-busy', () => {
    render(
      <OgeCard loading actions={<button>Act</button>}>
        body
      </OgeCard>,
    );
    expect(host('.oge-card')).toHaveAttribute('aria-busy', 'true');
    expect(document.querySelector('.oge-card-skeleton')).not.toBeNull();
    expect(document.querySelector('.oge-card-content')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders the slot props in the Angular projection order', () => {
    render(
      <OgeCard
        header="H"
        avatar={<span data-slot="avatar" />}
        headerActions={<span data-slot="header-actions" />}
        media={<img data-slot="media" alt="" />}
        actions={<span data-slot="actions" />}
        footer={<span data-slot="footer" />}
      >
        body
      </OgeCard>,
    );
    const order = Array.from(
      document.querySelectorAll('[data-slot], .oge-card-content'),
    ).map((el) => el.getAttribute('data-slot') ?? 'content');
    expect(order).toEqual([
      'avatar',
      'header-actions',
      'media',
      'content',
      'actions',
      'footer',
    ]);
  });

  it('gives each slot node its section class, on the node itself', () => {
    render(
      <OgeCard
        header="H"
        avatar={<span data-slot="avatar" />}
        headerActions={<span data-slot="header-actions" />}
        media={<img data-slot="media" alt="" className="rounded" />}
        actions={<div data-slot="actions" />}
        footer={<div data-slot="footer" />}
      >
        body
      </OgeCard>,
    );
    // the class lands on the consumer's own element — no wrapper — exactly
    // like the Angular attribute directives
    expect(host('[data-slot="avatar"]').className).toBe('oge-card-avatar');
    expect(host('[data-slot="header-actions"]').className).toBe(
      'oge-card-header-actions',
    );
    expect(host('[data-slot="actions"]').className).toBe('oge-card-actions');
    expect(host('[data-slot="footer"]').className).toBe('oge-card-footer');
    // an existing className is kept, not replaced
    expect(host('[data-slot="media"]').className).toBe(
      'rounded oge-card-media',
    );
  });

  it('actionsAlign maps onto the action row modifier', () => {
    render(
      <OgeCard actions={<div data-slot="actions" />} actionsAlign="end" />,
    );
    expect(host('[data-slot="actions"]').className).toBe(
      'oge-card-actions oge-card-actions-end',
    );
  });

  it('takes its defaults from the config provider', () => {
    render(
      <OgeCardConfigProvider config={{ stylingMode: 'filled', size: 'sm' }}>
        <OgeCard />
      </OgeCardConfigProvider>,
    );
    expect(host('.oge-card').className).toContain('oge-card-filled');
    expect(host('.oge-card').className).toContain('oge-card-sm');
  });
});

describe('<OgeProgressBar>', () => {
  it('reports the determinate ARIA contract', () => {
    render(<OgeProgressBar value={40} />);
    const el = host('.oge-progress-bar');
    expect(el).toHaveAttribute('role', 'progressbar');
    expect(el).toHaveAttribute('aria-valuemin', '0');
    expect(el).toHaveAttribute('aria-valuemax', '100');
    expect(el).toHaveAttribute('aria-valuenow', '40');
    expect(host('.oge-progress-bar-fill').style.transform).toBe('scaleX(0.4)');
  });

  it('indeterminate omits aria-valuenow entirely', () => {
    render(<OgeProgressBar value={null} />);
    const el = host('.oge-progress-bar');
    expect(el.className).toContain('oge-progress-bar-indeterminate');
    expect(el).not.toHaveAttribute('aria-valuenow');
  });

  it('clamps aria-valuenow into [min, max]', () => {
    render(<OgeProgressBar value={140} min={0} max={100} />);
    expect(host('.oge-progress-bar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('formatLabel drives both the visible label and aria-valuetext', () => {
    render(
      <OgeProgressBar
        value={3}
        max={5}
        showLabel
        formatLabel={(value, ratio) =>
          `${value}/5 (${Math.round(ratio * 100)}%)`
        }
      />,
    );
    expect(host('.oge-progress-bar-label').textContent).toBe('3/5 (60%)');
    expect(host('.oge-progress-bar')).toHaveAttribute(
      'aria-valuetext',
      '3/5 (60%)',
    );
  });

  it('chunkCount renders discrete segments with the filled prefix', () => {
    render(<OgeProgressBar value={50} chunkCount={4} />);
    expect(document.querySelectorAll('.oge-progress-bar-chunk')).toHaveLength(
      4,
    );
    expect(
      document.querySelectorAll('.oge-progress-bar-chunk-filled'),
    ).toHaveLength(2);
  });

  it('the buffer layer only renders for a determinate value', () => {
    const { unmount } = render(<OgeProgressBar value={30} bufferValue={70} />);
    expect(host('.oge-progress-bar-buffer').style.transform).toBe(
      'scaleX(0.7)',
    );
    unmount();
    render(<OgeProgressBar value={null} bufferValue={70} />);
    expect(document.querySelector('.oge-progress-bar-buffer')).toBeNull();
  });

  it('fires onCompleted once per arrival at max', () => {
    const completed = vi.fn();
    const { rerender } = render(
      <OgeProgressBar value={50} onCompleted={completed} />,
    );
    expect(completed).not.toHaveBeenCalled();
    rerender(<OgeProgressBar value={100} onCompleted={completed} />);
    expect(completed).toHaveBeenCalledTimes(1);
    expect(completed.mock.calls[0][0]).toEqual({ value: 100 });
    // staying at max does not re-fire
    rerender(<OgeProgressBar value={100} onCompleted={completed} />);
    expect(completed).toHaveBeenCalledTimes(1);
    // …but re-crossing after a reset does
    rerender(<OgeProgressBar value={20} onCompleted={completed} />);
    rerender(<OgeProgressBar value={100} onCompleted={completed} />);
    expect(completed).toHaveBeenCalledTimes(2);
  });

  it('takes its severity and label defaults from the config provider', () => {
    render(
      <OgeProgressBarConfigProvider
        config={{ severity: 'danger', showLabel: true }}
      >
        <OgeProgressBar value={10} />
      </OgeProgressBarConfigProvider>,
    );
    expect(host('.oge-progress-bar').className).toContain(
      'oge-progress-bar-danger',
    );
    expect(host('.oge-progress-bar-label').textContent).toBe('10%');
  });
});

describe('<OgeLoadIndicator>', () => {
  it('is an indeterminate progressbar with no aria-valuenow', () => {
    render(<OgeLoadIndicator />);
    const el = host('.oge-load-indicator');
    expect(el).toHaveAttribute('role', 'progressbar');
    expect(el).toHaveAttribute('aria-label', 'Loading');
    expect(el).not.toHaveAttribute('aria-valuenow');
  });

  it('maps size, inheritSize and severity onto the classes', () => {
    render(<OgeLoadIndicator size="lg" inheritSize severity="success" />);
    const el = host('.oge-load-indicator');
    expect(el.className).toContain('oge-load-indicator-lg');
    expect(el.className).toContain('oge-load-indicator-inherit');
    expect(el.className).toContain('oge-load-indicator-success');
  });

  it('the config provider localizes the fallback name', () => {
    render(
      <OgeLoadIndicatorConfigProvider
        config={{ messages: { loading: 'Yükleniyor' } }}
      >
        <OgeLoadIndicator />
      </OgeLoadIndicatorConfigProvider>,
    );
    expect(host('.oge-load-indicator')).toHaveAttribute(
      'aria-label',
      'Yükleniyor',
    );
  });
});

describe('<OgeSkeleton>', () => {
  it('is aria-hidden decoration with the shimmer default', () => {
    render(<OgeSkeleton />);
    const el = host('.oge-skeleton');
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el.className).not.toContain('oge-skeleton-pulse');
    expect(el.className).not.toContain('oge-skeleton-static');
  });

  it('shape and animation map onto the classes', () => {
    render(<OgeSkeleton shape="circle" animation="pulse" />);
    expect(host('.oge-skeleton').className).toContain('oge-skeleton-circle');
    expect(host('.oge-skeleton').className).toContain('oge-skeleton-pulse');
  });

  it('numbers mean pixels, strings pass through', () => {
    render(<OgeSkeleton width={40} height="2rem" />);
    const el = host('.oge-skeleton');
    expect(el.style.width).toBe('40px');
    expect(el.style.height).toBe('2rem');
  });

  it('lines renders stacked line blocks for the text shape only', () => {
    const { unmount } = render(<OgeSkeleton lines={3} />);
    expect(document.querySelectorAll('.oge-skeleton-line')).toHaveLength(3);
    expect(host('.oge-skeleton').className).toContain('oge-skeleton-multi');
    unmount();

    render(<OgeSkeleton shape="rectangle" lines={3} />);
    expect(document.querySelectorAll('.oge-skeleton-line')).toHaveLength(0);
  });

  it('takes its defaults from the config provider', () => {
    render(
      <OgeSkeletonConfigProvider config={{ animation: 'none' }}>
        <OgeSkeleton />
      </OgeSkeletonConfigProvider>,
    );
    expect(host('.oge-skeleton').className).toContain('oge-skeleton-static');
  });
});
