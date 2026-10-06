import { Component, signal, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeCarousel } from './carousel';
import { OgeCarouselSlide } from './carousel-slide';
import { provideOgeCarouselConfig } from './config';
import { OgeCarouselSlideTemplate } from './templates';
import type {
  OgeCarouselAutoplayChangedEvent,
  OgeCarouselIndicators,
  OgeCarouselItem,
  OgeCarouselSlideChangedEvent,
} from './carousel-types';

const ITEMS: OgeCarouselItem[] = [
  { key: 'a', title: 'Alpha', image: '/a.jpg', imageAlt: 'A' },
  { key: 'b', title: 'Beta', image: '/b.jpg' },
  { key: 'c', title: 'Gamma', description: 'Third' },
  { key: 'd', label: 'Delta' },
];

@Component({
  imports: [OgeCarousel],
  template: `
    <oge-carousel
      [items]="items()"
      [(selectedIndex)]="index"
      [loop]="loop()"
      [slidesPerView]="perView()"
      [indicators]="indicators()"
      [autoplay]="autoplay()"
      [autoplayInterval]="2000"
      [ariaLabel]="label()"
      locale="en-US"
      (slideChanged)="changes.push($event)"
      (autoplayChanged)="autoplayChanges.push($event)"
    />
  `,
})
class Host {
  readonly items = signal<OgeCarouselItem[]>([...ITEMS]);
  readonly index = signal(0);
  readonly loop = signal(false);
  readonly perView = signal(1);
  readonly indicators = signal<OgeCarouselIndicators>('dots');
  readonly autoplay = signal(false);
  readonly label = signal<string | undefined>('Highlights');
  readonly carousel = viewChild.required(OgeCarousel);
  readonly changes: OgeCarouselSlideChangedEvent[] = [];
  readonly autoplayChanges: OgeCarouselAutoplayChangedEvent[] = [];
}

@Component({
  imports: [OgeCarousel, OgeCarouselSlide, OgeCarouselSlideTemplate],
  template: `
    <oge-carousel [items]="items" locale="en-US">
      <oge-carousel-slide label="First" thumbnail="/t1.jpg">
        <p class="child-one">One</p>
      </oge-carousel-slide>
      <oge-carousel-slide [visible]="false"><p>Hidden</p></oge-carousel-slide>
      <ng-template ogeCarouselSlideTemplate let-item let-index="index">
        <p class="custom">{{ item.title }} #{{ index }}</p>
      </ng-template>
    </oge-carousel>
  `,
})
class DeclarativeHost {
  readonly items: OgeCarouselItem[] = [{ key: 'x', title: 'Item' }];
}

async function settle<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const q = (fixture: ComponentFixture<unknown>, selector: string) =>
  fixture.nativeElement.querySelector(selector) as HTMLElement;
const qa = (fixture: ComponentFixture<unknown>, selector: string) =>
  Array.from(fixture.nativeElement.querySelectorAll(selector)) as HTMLElement[];

describe('OgeCarousel', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await settle(fixture);
  });

  it('renders the APG carousel roles', () => {
    const root = q(fixture, 'oge-carousel');
    expect(root.getAttribute('role')).toBe('region');
    expect(root.getAttribute('aria-roledescription')).toBe('carousel');
    expect(root.getAttribute('aria-label')).toBe('Highlights');
    const slides = qa(fixture, '.oge-carousel-slide');
    expect(slides).toHaveLength(4);
    expect(slides[0].getAttribute('role')).toBe('tabpanel');
    expect(slides[0].getAttribute('aria-roledescription')).toBe('slide');
    expect(slides[0].getAttribute('aria-label')).toBe('Alpha, 1 of 4');
    expect(slides[3].getAttribute('aria-label')).toBe('Delta, 4 of 4');
    expect(slides[0].hasAttribute('inert')).toBe(false);
    expect(slides[1].hasAttribute('inert')).toBe(true);
    expect(slides[1].getAttribute('aria-hidden')).toBe('true');
    expect(q(fixture, '.oge-carousel-track').getAttribute('aria-live')).toBe(
      'polite',
    );
  });

  it('falls back to a group named by the label message', async () => {
    host.label.set(undefined);
    await settle(fixture);
    const root = q(fixture, 'oge-carousel');
    expect(root.getAttribute('role')).toBe('group');
    expect(root.getAttribute('aria-label')).toBe('Carousel');
  });

  it('renders the default image + caption template', () => {
    const img = q(fixture, '.oge-carousel-slide img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/a.jpg');
    expect(img.getAttribute('alt')).toBe('A');
    expect(qa(fixture, '.oge-carousel-slide img')[1].getAttribute('alt')).toBe(
      '',
    );
    expect(
      qa(fixture, '.oge-carousel-caption-text')[0].textContent?.trim(),
    ).toBe('Third');
  });

  it('steps with the buttons, blocks at the ends without loop', async () => {
    const prev = q(fixture, '.oge-carousel-prev');
    const next = q(fixture, '.oge-carousel-next');
    expect(prev.getAttribute('aria-disabled')).toBe('true');
    expect(prev.getAttribute('aria-label')).toBe('Previous slide');
    prev.click();
    await settle(fixture);
    expect(host.index()).toBe(0);
    next.click();
    await settle(fixture);
    expect(host.index()).toBe(1);
    expect(host.changes).toEqual([
      { index: 1, previousIndex: 0, source: 'next' },
    ]);
    host.carousel().goTo(9);
    await settle(fixture);
    expect(host.index()).toBe(3);
    expect(next.getAttribute('aria-disabled')).toBe('true');
    next.click();
    await settle(fixture);
    expect(host.index()).toBe(3);
  });

  it('wraps with loop', async () => {
    host.loop.set(true);
    await settle(fixture);
    q(fixture, '.oge-carousel-prev').click();
    await settle(fixture);
    expect(host.index()).toBe(3);
    host.carousel().next();
    await settle(fixture);
    expect(host.index()).toBe(0);
  });

  it('runs the APG tabs keyboard on the picker', async () => {
    const tabs = qa(fixture, '[role="tab"]');
    expect(tabs).toHaveLength(4);
    expect(q(fixture, '[role="tablist"]').getAttribute('aria-label')).toBe(
      'Choose a slide',
    );
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].tabIndex).toBe(0);
    expect(tabs[1].tabIndex).toBe(-1);
    expect(tabs[2].getAttribute('aria-label')).toBe('Slide 3');
    expect(tabs[0].getAttribute('aria-controls')).toBe(
      qa(fixture, '.oge-carousel-slide')[0].id,
    );
    tabs[0].focus();
    tabs[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    await settle(fixture);
    expect(host.index()).toBe(3);
    expect(document.activeElement).toBe(qa(fixture, '[role="tab"]')[3]);
    qa(fixture, '[role="tab"]')[3].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    await settle(fixture);
    expect(host.index()).toBe(0);
    qa(fixture, '[role="tab"]')[2].click();
    await settle(fixture);
    expect(host.index()).toBe(2);
    expect(host.changes.at(-1)?.source).toBe('picker');
  });

  it('mirrors the picker arrows in RTL', async () => {
    fixture.nativeElement.setAttribute('dir', 'rtl');
    const tabs = qa(fixture, '[role="tab"]');
    tabs[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    await settle(fixture);
    expect(host.index()).toBe(1);
  });

  it('switches to a button picker with several slides per view', async () => {
    host.perView.set(2);
    await settle(fixture);
    expect(qa(fixture, '[role="tab"]')).toHaveLength(0);
    const group = q(fixture, '.oge-carousel-picker');
    expect(group.getAttribute('role')).toBe('group');
    const buttons = qa(fixture, '.oge-carousel-picker button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0].getAttribute('aria-current')).toBe('true');
    const slides = qa(fixture, '.oge-carousel-slide');
    expect(slides[0].getAttribute('role')).toBe('group');
    expect(slides[1].hasAttribute('inert')).toBe(false);
    expect(slides[2].hasAttribute('inert')).toBe(true);
    host.carousel().goTo(5);
    await settle(fixture);
    expect(host.index()).toBe(2);
  });

  it('hides the picker for indicators none and the thumbnails show images', async () => {
    host.indicators.set('thumbnails');
    await settle(fixture);
    const thumbs = qa(fixture, '.oge-carousel-thumb');
    expect(thumbs).toHaveLength(4);
    expect(thumbs[0].querySelector('img')?.getAttribute('alt')).toBe('');
    expect(thumbs[2].querySelector('img')).toBeNull();
    host.indicators.set('none');
    await settle(fixture);
    expect(qa(fixture, '.oge-carousel-picker')).toHaveLength(0);
  });

  describe('autoplay', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('rotates, rewinds and is stopped by the rotation control', async () => {
      host.index.set(2);
      host.autoplay.set(true);
      fixture.detectChanges();
      const rotation = q(fixture, '.oge-carousel-rotation');
      expect(rotation.getAttribute('aria-label')).toBe(
        'Stop automatic slide show',
      );
      expect(q(fixture, '.oge-carousel-track').getAttribute('aria-live')).toBe(
        'off',
      );
      vi.advanceTimersByTime(2000);
      fixture.detectChanges();
      expect(host.index()).toBe(3);
      vi.advanceTimersByTime(2000);
      fixture.detectChanges();
      // rotation rewinds even without loop
      expect(host.index()).toBe(0);
      expect(host.changes.at(-1)?.source).toBe('autoplay');
      rotation.click();
      fixture.detectChanges();
      expect(rotation.getAttribute('aria-label')).toBe(
        'Start automatic slide show',
      );
      expect(host.autoplayChanges).toEqual([
        { playing: false, source: 'user' },
      ]);
      vi.advanceTimersByTime(6000);
      expect(host.index()).toBe(0);
    });

    it('pauses on hover and stops when keyboard focus enters', async () => {
      host.autoplay.set(true);
      fixture.detectChanges();
      const root = q(fixture, 'oge-carousel');
      const enter = new MouseEvent('pointerenter');
      Object.defineProperty(enter, 'pointerType', { value: 'mouse' });
      root.dispatchEvent(enter);
      vi.advanceTimersByTime(5000);
      expect(host.index()).toBe(0);
      const leave = new MouseEvent('pointerleave');
      Object.defineProperty(leave, 'pointerType', { value: 'mouse' });
      root.dispatchEvent(leave);
      vi.advanceTimersByTime(2000);
      fixture.detectChanges();
      expect(host.index()).toBe(1);
      // keyboard focus (no pointer press first) stops it for good
      q(fixture, '.oge-carousel-next').dispatchEvent(
        new FocusEvent('focusin', { bubbles: true }),
      );
      fixture.detectChanges();
      expect(host.autoplayChanges).toEqual([
        { playing: false, source: 'user' },
      ]);
      vi.advanceTimersByTime(6000);
      expect(host.index()).toBe(1);
      host.carousel().play();
      expect(host.autoplayChanges.at(-1)).toEqual({
        playing: true,
        source: 'api',
      });
      host.carousel().pause();
      expect(host.autoplayChanges.at(-1)).toEqual({
        playing: false,
        source: 'api',
      });
    });
  });
});

describe('OgeCarousel declarative slides', () => {
  it('renders children first, honours visible and the item template', async () => {
    const fixture = TestBed.createComponent(DeclarativeHost);
    await settle(fixture);
    const slides = qa(fixture, '.oge-carousel-slide');
    expect(slides).toHaveLength(2);
    expect(slides[0].querySelector('.child-one')?.textContent).toBe('One');
    expect(slides[0].getAttribute('aria-label')).toBe('First, 1 of 2');
    expect(slides[1].querySelector('.custom')?.textContent?.trim()).toBe(
      'Item #1',
    );
  });

  it('reads the config messages', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeCarouselConfig({
          indicators: 'none',
          messages: { next: 'Weiter', slideLabel: '{index}/{count}' },
        }),
      ],
    });
    const fixture = TestBed.createComponent(DeclarativeHost);
    await settle(fixture);
    expect(q(fixture, '.oge-carousel-next').getAttribute('aria-label')).toBe(
      'Weiter',
    );
    expect(qa(fixture, '.oge-carousel-picker')).toHaveLength(0);
    expect(
      qa(fixture, '.oge-carousel-slide')[1].getAttribute('aria-label'),
    ).toBe('Item, 2 of 2');
  });
});
