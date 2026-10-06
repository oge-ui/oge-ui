import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import type { OgeTimelineItem } from '@oge-ui/behavior';
import { OgeTimeline } from './timeline';
import { OgeAppBar } from './app-bar';
import {
  OgeAppBarConfigProvider,
  OgeTimelineConfigProvider,
} from './layout-config';

const ITEMS: OgeTimelineItem[] = [
  {
    key: 'a',
    title: 'Ordered',
    description: 'Payment received',
    time: new Date(2026, 2, 14, 9, 30),
    severity: 'success',
  },
  { key: 'b', title: 'Shipped', time: 'Yesterday', opposite: 'Warehouse 3' },
  { key: 'c', title: 'Delivered', variant: 'outlined', icon: 'M5 12h14' },
];
const FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

const items = () =>
  Array.from(document.querySelectorAll<HTMLElement>('li.oge-timeline-item'));

describe('<OgeTimeline>', () => {
  it('renders the Angular markup: an ordered list with decoration hidden', () => {
    render(
      <StrictMode>
        <OgeTimeline
          items={ITEMS}
          locale="en-US"
          dateFormat={FORMAT}
          ariaLabel="Order history"
        />
      </StrictMode>,
    );
    const list = document.querySelector('ol.oge-timeline-list') as HTMLElement;
    expect(list.getAttribute('aria-label')).toBe('Order history');
    expect(items()).toHaveLength(3);
    const time = items()[0].querySelector('time') as HTMLElement;
    expect(time.getAttribute('datetime')).toBe('2026-03-14T09:30:00');
    expect(time.textContent).toBe('Mar 14, 2026');
    expect(items()[1].querySelector('time')?.hasAttribute('datetime')).toBe(
      false,
    );
    for (const sep of document.querySelectorAll('.oge-timeline-separator'))
      expect(sep.getAttribute('aria-hidden')).toBe('true');
    expect(items()[2].querySelector('.oge-timeline-connector')).toBeNull();
    expect(items()[0].className).toContain('oge-timeline-severity-success');
    const marker = items()[2].querySelector(
      '.oge-timeline-marker',
    ) as HTMLElement;
    expect(marker.className).toContain('oge-timeline-marker-outlined');
    expect(marker.querySelector('path')?.getAttribute('d')).toBe('M5 12h14');
    expect(document.querySelector('.oge-timeline')?.className).toContain(
      'oge-timeline-vertical',
    );
  });

  it('alternates and moves the time into the opposite column', () => {
    render(
      <OgeTimeline
        items={ITEMS}
        align="alternate"
        locale="en-US"
        dateFormat={FORMAT}
      />,
    );
    expect(document.querySelector('.oge-timeline')?.className).toContain(
      'oge-timeline-alternating',
    );
    expect(
      items().map((li) => li.classList.contains('oge-timeline-item-end')),
    ).toEqual([true, false, true]);
    expect(
      items()[0]
        .querySelector('.oge-timeline-opposite time')
        ?.getAttribute('datetime'),
    ).toBe('2026-03-14T09:30:00');
    expect(items()[0].querySelector('.oge-timeline-content time')).toBeNull();
    expect(
      items()[1].querySelector('.oge-timeline-opposite')?.textContent,
    ).toBe('Warehouse 3');
  });

  it('renders the render props with their context', () => {
    render(
      <OgeTimeline
        items={ITEMS}
        align="alternate"
        renderContent={({ item, index }) => (
          <em className="custom-content">{`${index}:${item.title}`}</em>
        )}
        renderMarker={({ index }) => (
          <b className="custom-marker">{index + 1}</b>
        )}
        renderOpposite={({ side, last }) => (
          <i className="custom-opposite">{`${side}${last ? '!' : ''}`}</i>
        )}
      />,
    );
    expect(
      Array.from(document.querySelectorAll('.custom-content')).map(
        (n) => n.textContent,
      ),
    ).toEqual(['0:Ordered', '1:Shipped', '2:Delivered']);
    expect(
      document.querySelectorAll('.oge-timeline-marker-custom'),
    ).toHaveLength(3);
    expect(
      Array.from(document.querySelectorAll('.custom-opposite')).map(
        (n) => n.textContent,
      ),
    ).toEqual(['end', 'start', 'end!']);
  });

  it('reads orientation and align from the provider', () => {
    render(
      <OgeTimelineConfigProvider
        config={{ orientation: 'horizontal', align: 'start' }}
      >
        <OgeTimeline items={ITEMS} />
      </OgeTimelineConfigProvider>,
    );
    expect(document.querySelector('.oge-timeline')?.className).toContain(
      'oge-timeline-horizontal',
    );
    expect(document.querySelectorAll('.oge-timeline-item-start')).toHaveLength(
      3,
    );
  });
});

describe('<OgeAppBar>', () => {
  const bar = () => document.querySelector('.oge-app-bar') as HTMLElement;

  it('renders the sections and the defaults, with no landmark', () => {
    render(
      <StrictMode>
        <OgeAppBar
          ariaLabel="Mail"
          start={<button className="start-btn">Menu</button>}
          center={<span className="center-marked">Sub</span>}
          end={<button className="end-btn">Out</button>}
        >
          <h1>Inbox</h1>
        </OgeAppBar>
      </StrictMode>,
    );
    expect(bar().querySelector('.oge-app-bar-start .start-btn')).not.toBeNull();
    expect(bar().querySelector('.oge-app-bar-end .end-btn')).not.toBeNull();
    const center = bar().querySelector('.oge-app-bar-center') as HTMLElement;
    expect(center.firstElementChild?.className).toBe('center-marked');
    expect(center.querySelector('h1')?.textContent).toBe('Inbox');
    for (const cls of [
      'oge-app-bar-top',
      'oge-app-bar-static',
      'oge-app-bar-color-default',
      'oge-app-bar-md',
    ])
      expect(bar().className).toContain(cls);
    expect(bar().hasAttribute('role')).toBe(false);
    expect(bar().hasAttribute('aria-label')).toBe(false);
  });

  it('adds a named landmark and maps the presets', () => {
    render(
      <OgeAppBar
        landmark="navigation"
        ariaLabel="Mail"
        position="bottom"
        positionMode="fixed"
        color="primary"
        elevated
        centerAlign="center"
        className="consumer"
      />,
    );
    expect(bar().getAttribute('role')).toBe('navigation');
    expect(bar().getAttribute('aria-label')).toBe('Mail');
    for (const cls of [
      'oge-app-bar-bottom',
      'oge-app-bar-fixed',
      'oge-app-bar-color-primary',
      'oge-app-bar-elevated',
      'consumer',
    ])
      expect(bar().className).toContain(cls);
    expect(bar().querySelector('.oge-app-bar-center')?.className).toContain(
      'oge-app-bar-center-centered',
    );
  });

  it('reads defaults from the provider', () => {
    render(
      <OgeAppBarConfigProvider
        config={{ color: 'inverse', size: 'lg', positionMode: 'sticky' }}
      >
        <OgeAppBar>Title</OgeAppBar>
      </OgeAppBarConfigProvider>,
    );
    expect(bar().className).toContain('oge-app-bar-color-inverse');
    expect(bar().className).toContain('oge-app-bar-lg');
    expect(bar().className).toContain('oge-app-bar-sticky');
  });
});
