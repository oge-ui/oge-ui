import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type {
  OgeCarouselAutoplayChangedEvent,
  OgeCarouselItem,
  OgeCarouselSlideChangedEvent,
} from '@oge-ui/behavior';
import {
  OgeCarousel,
  OgeCarouselSlide,
  type OgeCarouselHandle,
} from './carousel';
import { OgeCarouselConfigProvider } from './layout-config';

const ITEMS: OgeCarouselItem[] = [
  { key: 'a', title: 'Alpha', image: '/a.jpg', imageAlt: 'A' },
  { key: 'b', title: 'Beta', image: 'javascript:alert(1)' },
  { key: 'c', title: 'Gamma', description: 'Third' },
  { key: 'd', label: 'Delta' },
];

const slides = () =>
  Array.from(document.querySelectorAll('.oge-carousel-slide')) as HTMLElement[];

describe('<OgeCarousel>', () => {
  it('renders the APG carousel roles', () => {
    render(<OgeCarousel items={ITEMS} ariaLabel="Highlights" locale="en-US" />);
    const root = screen.getByRole('region', { name: 'Highlights' });
    expect(root).toHaveAttribute('aria-roledescription', 'carousel');
    const all = slides();
    expect(all).toHaveLength(4);
    expect(all[0]).toHaveAttribute('role', 'tabpanel');
    expect(all[0]).toHaveAttribute('aria-roledescription', 'slide');
    expect(all[0]).toHaveAttribute('aria-label', 'Alpha, 1 of 4');
    expect(all[1]).toHaveAttribute('inert');
    expect(all[1]).toHaveAttribute('aria-hidden', 'true');
    expect(all[0]).not.toHaveAttribute('inert');
    expect(document.querySelector('.oge-carousel-track')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  it('sanitises image URLs and keeps alt text', () => {
    render(<OgeCarousel items={ITEMS} locale="en-US" />);
    const images = document.querySelectorAll('.oge-carousel-image');
    expect(images[0]).toHaveAttribute('src', '/a.jpg');
    expect(images[0]).toHaveAttribute('alt', 'A');
    expect(images[1]).toHaveAttribute('src', 'about:blank');
    expect(images[1]).toHaveAttribute('alt', '');
    expect(screen.getByRole('group', { name: 'Carousel' })).toBeTruthy();
  });

  it('steps with the buttons and blocks at the ends without loop', () => {
    const changes: OgeCarouselSlideChangedEvent[] = [];
    render(
      <OgeCarousel
        items={ITEMS}
        locale="en-US"
        onSlideChanged={(e) => changes.push(e)}
      />,
    );
    const prev = screen.getByRole('button', { name: 'Previous slide' });
    const next = screen.getByRole('button', { name: 'Next slide' });
    expect(prev).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(prev);
    expect(changes).toEqual([]);
    fireEvent.click(next);
    expect(changes).toEqual([{ index: 1, previousIndex: 0, source: 'next' }]);
    expect(screen.getAllByRole('tab', { hidden: true })[1]).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('is controllable and loops', () => {
    function Controlled() {
      const [index, setIndex] = useState(3);
      return (
        <>
          <OgeCarousel
            items={ITEMS}
            loop
            selectedIndex={index}
            onSelectedIndexChange={setIndex}
            locale="en-US"
          />
          <output data-testid="index">{index}</output>
        </>
      );
    }
    render(<Controlled />);
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(screen.getByTestId('index').textContent).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    expect(screen.getByTestId('index').textContent).toBe('3');
  });

  it('runs the APG tabs keyboard and mirrors it in RTL', () => {
    render(
      <div dir="rtl">
        <OgeCarousel items={ITEMS} locale="en-US" />
      </div>,
    );
    const tabs = screen.getAllByRole('tab');
    expect(screen.getByRole('tablist')).toHaveAttribute(
      'aria-label',
      'Choose a slide',
    );
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    expect(tabs[2]).toHaveAttribute('aria-label', 'Slide 3');
    tabs[0].focus();
    // RTL: ArrowLeft moves forward
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(document.activeElement).toBe(tabs[3]);
    fireEvent.keyDown(tabs[3], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tabs[0]);
  });

  it('switches to a button picker with several slides per view', () => {
    const ref = createRef<OgeCarouselHandle>();
    render(
      <OgeCarousel ref={ref} items={ITEMS} slidesPerView={2} locale="en-US" />,
    );
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    const group = screen.getByRole('group', { name: 'Choose a slide' });
    const buttons = group.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAttribute('aria-current', 'true');
    expect(slides()[1]).not.toHaveAttribute('inert');
    expect(slides()[2]).toHaveAttribute('inert');
    act(() => ref.current?.goTo(9));
    expect(
      screen
        .getByRole('group', { name: 'Choose a slide' })
        .querySelectorAll('button')[2],
    ).toHaveAttribute('aria-current', 'true');
  });

  it('renders declarative slides first and the render prop for items', () => {
    render(
      <OgeCarouselConfigProvider
        config={{ indicators: 'thumbnails', messages: { next: 'Weiter' } }}
      >
        <OgeCarousel
          items={[{ key: 'x', title: 'Item', thumbnail: '/x.jpg' }]}
          locale="en-US"
          renderSlide={({ item, index }) => (
            <p className="custom">
              {item.title} #{index}
            </p>
          )}
        >
          <OgeCarouselSlide label="First" thumbnail="/t1.jpg">
            <p className="child-one">One</p>
          </OgeCarouselSlide>
          <OgeCarouselSlide visible={false}>
            <p>Hidden</p>
          </OgeCarouselSlide>
        </OgeCarousel>
      </OgeCarouselConfigProvider>,
    );
    const all = slides();
    expect(all).toHaveLength(2);
    expect(all[0].querySelector('.child-one')?.textContent).toBe('One');
    expect(all[0]).toHaveAttribute('aria-label', 'First, 1 of 2');
    expect(all[1].querySelector('.custom')?.textContent).toBe('Item #1');
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeTruthy();
    const thumbs = document.querySelectorAll('.oge-carousel-thumb img');
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0]).toHaveAttribute('alt', '');
  });

  describe('autoplay', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('rotates, rewinds, pauses on hover and stops on keyboard focus', () => {
      const changes: OgeCarouselSlideChangedEvent[] = [];
      const autoplayChanges: OgeCarouselAutoplayChangedEvent[] = [];
      render(
        <OgeCarousel
          items={ITEMS}
          autoplay
          autoplayInterval={2000}
          defaultSelectedIndex={2}
          locale="en-US"
          onSlideChanged={(e) => changes.push(e)}
          onAutoplayChanged={(e) => autoplayChanges.push(e)}
        />,
      );
      const rotation = screen.getByRole('button', {
        name: 'Stop automatic slide show',
      });
      expect(document.querySelector('.oge-carousel-track')).toHaveAttribute(
        'aria-live',
        'off',
      );
      act(() => vi.advanceTimersByTime(2000));
      act(() => vi.advanceTimersByTime(2000));
      expect(changes.map((c) => c.index)).toEqual([3, 0]);
      expect(changes[1].source).toBe('autoplay');

      const root = document.querySelector('.oge-carousel')!;
      fireEvent.pointerEnter(root, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(6000));
      expect(changes).toHaveLength(2);
      fireEvent.pointerLeave(root, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(2000));
      expect(changes).toHaveLength(3);

      // keyboard focus entering (no pointer press first) stops it for good
      act(() => rotation.focus());
      expect(autoplayChanges).toEqual([{ playing: false, source: 'user' }]);
      expect(rotation).toHaveAttribute(
        'aria-label',
        'Start automatic slide show',
      );
      act(() => vi.advanceTimersByTime(6000));
      expect(changes).toHaveLength(3);
      fireEvent.click(rotation);
      expect(autoplayChanges.at(-1)).toEqual({ playing: true, source: 'user' });
    });

    it('survives StrictMode double effects', () => {
      const changes: number[] = [];
      render(
        <StrictMode>
          <OgeCarousel
            items={ITEMS}
            autoplay
            autoplayInterval={2000}
            locale="en-US"
            onSlideChanged={(e) => changes.push(e.index)}
          />
        </StrictMode>,
      );
      act(() => vi.advanceTimersByTime(2000));
      expect(changes).toEqual([1]);
      fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
      expect(changes).toEqual([1, 2]);
    });
  });
});
