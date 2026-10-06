import {
  OGE_CAROUSEL_DRAGGING_CLASS,
  OGE_CAROUSEL_MIN_INTERVAL,
  OGE_DEFAULT_CAROUSEL_MESSAGES,
  OgeCarouselAutoplay,
  beginOgeCarouselSwipe,
  ogeCarouselClampIndex,
  ogeCarouselIndexFromOffset,
  ogeCarouselLive,
  ogeCarouselMaxIndex,
  ogeCarouselPerView,
  ogeCarouselPickerKey,
  ogeCarouselPickerLabel,
  ogeCarouselPickerMode,
  ogeCarouselPickerTarget,
  ogeCarouselPositions,
  ogeCarouselScrollOffset,
  ogeCarouselScrollTo,
  ogeCarouselSlideLabel,
  ogeCarouselSlideVisible,
  ogeCarouselStep,
  ogeCarouselSwipeTarget,
  resolveOgeCarouselConfig,
} from './carousel-core';

describe('carousel config', () => {
  it('merges messages one level deep', () => {
    const config = resolveOgeCarouselConfig({
      loop: true,
      messages: { next: 'Weiter' },
    });
    expect(config.loop).toBe(true);
    expect(config.messages.next).toBe('Weiter');
    expect(config.messages.previous).toBe('Previous slide');
  });
});

describe('carousel index arithmetic', () => {
  it('sanitises slides per view', () => {
    expect(ogeCarouselPerView(3, 5)).toBe(3);
    expect(ogeCarouselPerView(9, 5)).toBe(5);
    expect(ogeCarouselPerView(0, 5)).toBe(1);
    expect(ogeCarouselPerView(Number.NaN, 5)).toBe(1);
    expect(ogeCarouselPerView(2.7, 5)).toBe(2);
  });

  it('stops the last view at the last slide', () => {
    expect(ogeCarouselMaxIndex(5)).toBe(4);
    expect(ogeCarouselMaxIndex(5, 3)).toBe(2);
    expect(ogeCarouselMaxIndex(0)).toBe(0);
    expect(ogeCarouselPositions(5, 3)).toBe(3);
    expect(ogeCarouselPositions(0)).toBe(0);
    expect(ogeCarouselClampIndex(9, 5, 2)).toBe(3);
    expect(ogeCarouselClampIndex(-2, 5)).toBe(0);
    expect(ogeCarouselClampIndex(Number.NaN, 5)).toBe(0);
  });

  it('steps, blocks at the ends and wraps with loop', () => {
    expect(ogeCarouselStep(0, 1, 3)).toBe(1);
    expect(ogeCarouselStep(2, 1, 3)).toBeNull();
    expect(ogeCarouselStep(0, -1, 3)).toBeNull();
    expect(ogeCarouselStep(2, 1, 3, 1, true)).toBe(0);
    expect(ogeCarouselStep(0, -1, 3, 1, true)).toBe(2);
    expect(ogeCarouselStep(0, -1, 5, 3, true)).toBe(2);
    expect(ogeCarouselStep(0, 1, 1, 1, true)).toBeNull();
    expect(ogeCarouselStep(0, 1, 2, 2, true)).toBeNull();
  });

  it('reports visibility, picker shape and live politeness', () => {
    expect(ogeCarouselSlideVisible(1, 0, 2)).toBe(true);
    expect(ogeCarouselSlideVisible(2, 0, 2)).toBe(false);
    expect(ogeCarouselPickerMode(1)).toBe('tabs');
    expect(ogeCarouselPickerMode(3)).toBe('buttons');
    expect(ogeCarouselLive(true)).toBe('off');
    expect(ogeCarouselLive(false)).toBe('polite');
  });

  it('maps scroll offsets both ways, negating in RTL', () => {
    expect(ogeCarouselScrollOffset(2, 300, false)).toBe(600);
    expect(ogeCarouselScrollOffset(2, 300, true)).toBe(-600);
    expect(ogeCarouselIndexFromOffset(610, 300, 4)).toBe(2);
    expect(ogeCarouselIndexFromOffset(-610, 300, 4)).toBe(2);
    expect(ogeCarouselIndexFromOffset(5000, 300, 4)).toBe(4);
    expect(ogeCarouselIndexFromOffset(100, 0, 4)).toBe(0);
  });
});

describe('carousel swipe target', () => {
  const base = { index: 1, step: 300, count: 5 };

  it('ignores a short drag', () => {
    expect(ogeCarouselSwipeTarget({ ...base, deltaX: -20 })).toBe(1);
  });

  it('moves forward when content is dragged towards the start edge', () => {
    expect(ogeCarouselSwipeTarget({ ...base, deltaX: -80 })).toBe(2);
    expect(ogeCarouselSwipeTarget({ ...base, deltaX: 80 })).toBe(0);
    // RTL: the start edge is on the right
    expect(ogeCarouselSwipeTarget({ ...base, deltaX: 80, rtl: true })).toBe(2);
  });

  it('moves by whole slides for long drags and clamps', () => {
    expect(ogeCarouselSwipeTarget({ ...base, deltaX: -620 })).toBe(3);
    expect(ogeCarouselSwipeTarget({ ...base, deltaX: -3000 })).toBe(4);
  });

  it('wraps from an end only with loop', () => {
    const last = { ...base, index: 4 };
    expect(ogeCarouselSwipeTarget({ ...last, deltaX: -80 })).toBe(4);
    expect(ogeCarouselSwipeTarget({ ...last, deltaX: -80, loop: true })).toBe(
      0,
    );
    expect(
      ogeCarouselSwipeTarget({ ...base, index: 0, deltaX: 80, loop: true }),
    ).toBe(4);
  });
});

describe('carousel picker keyboard', () => {
  it('mirrors the arrows in RTL', () => {
    expect(ogeCarouselPickerKey('ArrowRight', false)).toBe('next');
    expect(ogeCarouselPickerKey('ArrowRight', true)).toBe('previous');
    expect(ogeCarouselPickerKey('ArrowLeft', true)).toBe('next');
    expect(ogeCarouselPickerKey('Home', false)).toBe('first');
    expect(ogeCarouselPickerKey('End', true)).toBe('last');
    expect(ogeCarouselPickerKey('ArrowDown', false)).toBeNull();
  });

  it('wraps like APG tabs', () => {
    expect(ogeCarouselPickerTarget('next', 4, 5)).toBe(0);
    expect(ogeCarouselPickerTarget('previous', 0, 5)).toBe(4);
    expect(ogeCarouselPickerTarget('first', 3, 5)).toBe(0);
    expect(ogeCarouselPickerTarget('last', 0, 5)).toBe(4);
    expect(ogeCarouselPickerTarget('next', 0, 0)).toBe(0);
  });
});

describe('carousel labels', () => {
  const m = OGE_DEFAULT_CAROUSEL_MESSAGES;

  it('names slides with and without a title', () => {
    expect(ogeCarouselSlideLabel(1, 5, m, undefined, 'en-US')).toBe('2 of 5');
    expect(ogeCarouselSlideLabel(0, 5, m, 'Beach', 'en-US')).toBe(
      'Beach, 1 of 5',
    );
    expect(ogeCarouselSlideLabel(0, 5, m, '  ', 'en-US')).toBe('1 of 5');
    expect(ogeCarouselPickerLabel(2, m, 'en-US')).toBe('Slide 3');
  });

  it('formats numbers in the locale', () => {
    expect(ogeCarouselPickerLabel(2, m, 'ar-EG')).toBe('Slide ٣');
  });
});

describe('OgeCarouselAutoplay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ticks while playing and reports state changes', () => {
    const ticks: number[] = [];
    const changes: boolean[] = [];
    const autoplay = new OgeCarouselAutoplay({
      interval: 2000,
      onTick: () => ticks.push(Date.now()),
      onChange: (p) => changes.push(p),
    });
    autoplay.play();
    expect(autoplay.isPlaying()).toBe(true);
    vi.advanceTimersByTime(4100);
    expect(ticks).toHaveLength(2);
    autoplay.pause();
    vi.advanceTimersByTime(5000);
    expect(ticks).toHaveLength(2);
    expect(changes).toEqual([true, false]);
  });

  it('holds temporarily and restarts the full interval on release', () => {
    let ticks = 0;
    const autoplay = new OgeCarouselAutoplay({
      interval: 2000,
      onTick: () => ticks++,
    });
    autoplay.play();
    vi.advanceTimersByTime(1500);
    autoplay.hold('hover');
    expect(autoplay.isRunning()).toBe(false);
    expect(autoplay.isPlaying()).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(ticks).toBe(0);
    autoplay.hold('hidden');
    autoplay.release('hover');
    expect(autoplay.isRunning()).toBe(false);
    autoplay.release('hidden');
    vi.advanceTimersByTime(1999);
    expect(ticks).toBe(0);
    vi.advanceTimersByTime(1);
    expect(ticks).toBe(1);
    // releasing a reason that was not held does not reschedule
    autoplay.release('drag');
    expect(autoplay.isRunning()).toBe(true);
  });

  it('clamps the interval and survives destroy / revive', () => {
    let ticks = 0;
    const autoplay = new OgeCarouselAutoplay({
      interval: 10,
      onTick: () => ticks++,
    });
    autoplay.play();
    vi.advanceTimersByTime(OGE_CAROUSEL_MIN_INTERVAL - 1);
    expect(ticks).toBe(0);
    vi.advanceTimersByTime(1);
    expect(ticks).toBe(1);
    autoplay.destroy();
    vi.advanceTimersByTime(5000);
    expect(ticks).toBe(1);
    autoplay.play();
    expect(autoplay.isRunning()).toBe(false);
    autoplay.revive();
    expect(autoplay.isRunning()).toBe(true);
    autoplay.setInterval(Number.NaN);
    vi.advanceTimersByTime(4999);
    expect(ticks).toBe(1);
    vi.advanceTimersByTime(1);
    expect(ticks).toBe(2);
  });

  it('restart only reschedules a running timer', () => {
    let ticks = 0;
    const autoplay = new OgeCarouselAutoplay({
      interval: 2000,
      onTick: () => ticks++,
    });
    autoplay.restart();
    expect(autoplay.isRunning()).toBe(false);
    autoplay.play();
    vi.advanceTimersByTime(1500);
    autoplay.restart();
    vi.advanceTimersByTime(1500);
    expect(ticks).toBe(0);
    vi.advanceTimersByTime(500);
    expect(ticks).toBe(1);
  });
});

function pointer(
  type: string,
  init: { clientX: number; clientY?: number; pointerType?: string },
): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX,
    clientY: init.clientY ?? 0,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', {
    value: init.pointerType ?? 'mouse',
  });
  return event;
}

function makeTrack(): HTMLElement {
  const track = document.createElement('div');
  for (let i = 0; i < 4; i++) {
    const slide = document.createElement('div');
    slide.getBoundingClientRect = () =>
      ({ left: i * 300, width: 300 }) as DOMRect;
    track.appendChild(slide);
  }
  document.body.appendChild(track);
  return track;
}

describe('beginOgeCarouselSwipe', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('drags the track and lands on the swipe target', () => {
    const track = makeTrack();
    const landed: [number, boolean][] = [];
    const down = pointer('pointerdown', { clientX: 400 });
    track.dispatchEvent(down);
    const handle = beginOgeCarouselSwipe(down as unknown as PointerEvent, {
      track,
      index: 1,
      count: 4,
      rtl: false,
      onFinish: (i, c) => landed.push([i, c]),
    });
    expect(handle).not.toBeNull();
    track.dispatchEvent(pointer('pointermove', { clientX: 300 }));
    expect(track.classList.contains(OGE_CAROUSEL_DRAGGING_CLASS)).toBe(true);
    track.dispatchEvent(pointer('pointerup', { clientX: 300 }));
    expect(track.classList.contains(OGE_CAROUSEL_DRAGGING_CLASS)).toBe(false);
    expect(landed).toEqual([[2, true]]);
  });

  it('stays put when cancelled, and skips text fields and other buttons', () => {
    const track = makeTrack();
    const landed: [number, boolean][] = [];
    const down = pointer('pointerdown', { clientX: 400 });
    track.dispatchEvent(down);
    const handle = beginOgeCarouselSwipe(down as unknown as PointerEvent, {
      track,
      index: 1,
      count: 4,
      rtl: false,
      onFinish: (i, c) => landed.push([i, c]),
    });
    track.dispatchEvent(pointer('pointermove', { clientX: 200 }));
    handle?.cancel();
    expect(landed).toEqual([[1, false]]);

    const input = document.createElement('input');
    track.firstElementChild!.appendChild(input);
    const onInput = pointer('pointerdown', { clientX: 10 });
    input.dispatchEvent(onInput);
    expect(
      beginOgeCarouselSwipe(onInput as unknown as PointerEvent, {
        track,
        index: 0,
        count: 4,
        rtl: false,
        onFinish: () => undefined,
      }),
    ).toBeNull();

    const right = {
      ...(pointer('pointerdown', { clientX: 10 }) as unknown as PointerEvent),
      button: 2,
    };
    expect(
      beginOgeCarouselSwipe(right as PointerEvent, {
        track,
        index: 0,
        count: 4,
        rtl: false,
        onFinish: () => undefined,
      }),
    ).toBeNull();
  });

  it('scrollTo writes the RTL-negated offset', () => {
    const track = makeTrack();
    const calls: ScrollToOptions[] = [];
    track.scrollTo = ((options: ScrollToOptions) =>
      calls.push(options)) as typeof track.scrollTo;
    ogeCarouselScrollTo(track, 2, { rtl: true, behavior: 'auto' });
    expect(calls).toEqual([{ left: -600, behavior: 'auto' }]);
    ogeCarouselScrollTo(null, 2, { rtl: false, behavior: 'auto' });
  });
});
