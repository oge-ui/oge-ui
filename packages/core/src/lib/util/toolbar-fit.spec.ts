import { fitToolbarItems, type OgeToolbarFitItem } from './toolbar-fit';

function auto(size: number): OgeToolbarFitItem {
  return { size, policy: 'auto' };
}
function always(size: number): OgeToolbarFitItem {
  return { size, policy: 'always' };
}
function never(size: number): OgeToolbarFitItem {
  return { size, policy: 'never' };
}

describe('fitToolbarItems', () => {
  it('keeps everything inline and hides the button when the row fits', () => {
    const fit = fitToolbarItems({
      containerSize: 300,
      items: [auto(50), auto(50), auto(50)],
      menuButtonSize: 32,
    });
    expect(fit.inline).toEqual([0, 1, 2]);
    expect(fit.inMenu).toEqual([]);
    expect(fit.menuVisible).toBe(false);
  });

  it('counts the gap between rendered entries', () => {
    // 3 × 50 + 2 × 10 = 170 fits in 170 but not in 169.
    const items = [auto(50), auto(50), auto(50)];
    expect(
      fitToolbarItems({
        containerSize: 170,
        items,
        menuButtonSize: 32,
        gap: 10,
      }).menuVisible,
    ).toBe(false);
    expect(
      fitToolbarItems({
        containerSize: 169,
        items,
        menuButtonSize: 32,
        gap: 10,
      }).inMenu,
    ).toEqual([2]);
  });

  it('drops auto entries from the end of the visual order', () => {
    const fit = fitToolbarItems({
      containerSize: 100,
      items: [auto(40), auto(40), auto(40), auto(40)],
      menuButtonSize: 20,
    });
    // 20 (button) + 2 × 40 = 100.
    expect(fit.inline).toEqual([0, 1]);
    expect(fit.inMenu).toEqual([2, 3]);
  });

  it('reserves room for the overflow button once it appears', () => {
    // Two 60px items fit in 120 exactly, but not once the 30px button shows.
    const fit = fitToolbarItems({
      containerSize: 120,
      items: [auto(60), auto(60), always(60)],
      menuButtonSize: 30,
    });
    expect(fit.inline).toEqual([0]);
    expect(fit.inMenu).toEqual([1, 2]);
  });

  it("keeps 'never' entries inline even when the row overflows", () => {
    const fit = fitToolbarItems({
      containerSize: 50,
      items: [never(80), auto(40), never(80)],
      menuButtonSize: 20,
    });
    expect(fit.inline).toEqual([0, 2]);
    expect(fit.inMenu).toEqual([1]);
  });

  it("moves 'always' entries into the menu with room to spare", () => {
    const fit = fitToolbarItems({
      containerSize: 1000,
      items: [auto(40), always(40), auto(40)],
      menuButtonSize: 30,
    });
    expect(fit.inline).toEqual([0, 2]);
    expect(fit.inMenu).toEqual([1]);
    expect(fit.menuVisible).toBe(true);
  });

  it('reports every entry inline while the container is unmeasured', () => {
    // jsdom and the pre-layout first render both report 0.
    const fit = fitToolbarItems({
      containerSize: 0,
      items: [auto(400), never(400), always(40)],
      menuButtonSize: 30,
    });
    expect(fit.inline).toEqual([0, 1]);
    expect(fit.inMenu).toEqual([2]);
  });

  it('collapses every auto entry when nothing can fit', () => {
    const fit = fitToolbarItems({
      containerSize: 10,
      items: [auto(40), auto(40)],
      menuButtonSize: 30,
    });
    expect(fit.inline).toEqual([]);
    expect(fit.inMenu).toEqual([0, 1]);
    expect(fit.menuVisible).toBe(true);
  });

  it('handles an empty toolbar', () => {
    const fit = fitToolbarItems({
      containerSize: 200,
      items: [],
      menuButtonSize: 30,
    });
    expect(fit.inline).toEqual([]);
    expect(fit.inMenu).toEqual([]);
    expect(fit.menuVisible).toBe(false);
  });
});

describe('fitToolbarItems — priority', () => {
  function pri(size: number, priority: number): OgeToolbarFitItem {
    return { size, policy: 'auto', priority };
  }

  it('drops the lowest priority first, whatever its position', () => {
    // Room for two of three 50px entries plus the 32px button (2×50+32+2×0=132).
    const fit = fitToolbarItems({
      containerSize: 132,
      items: [pri(50, 0), pri(50, 5), pri(50, 9)],
      menuButtonSize: 32,
    });
    // Index 0 has the lowest priority, so it yields even though it is first.
    expect(fit.inline).toEqual([1, 2]);
    expect(fit.inMenu).toEqual([0]);
  });

  it('keeps the highest priority entry last of all', () => {
    const fit = fitToolbarItems({
      containerSize: 82, // one 50px entry + the 32px button
      items: [pri(50, 9), pri(50, 1), pri(50, 2)],
      menuButtonSize: 32,
    });
    expect(fit.inline).toEqual([0]);
    expect(fit.inMenu).toEqual([1, 2]);
  });

  it('breaks equal priorities end-first, so the default reproduces the reference order', () => {
    const withPriority = fitToolbarItems({
      containerSize: 132,
      items: [pri(50, 3), pri(50, 3), pri(50, 3)],
      menuButtonSize: 32,
    });
    const withoutPriority = fitToolbarItems({
      containerSize: 132,
      items: [auto(50), auto(50), auto(50)],
      menuButtonSize: 32,
    });
    expect(withPriority.inline).toEqual([0, 1]);
    expect(withPriority.inMenu).toEqual([2]);
    expect(withoutPriority.inline).toEqual(withPriority.inline);
    expect(withoutPriority.inMenu).toEqual(withPriority.inMenu);
  });

  it('a negative priority yields before every default entry', () => {
    const fit = fitToolbarItems({
      containerSize: 132,
      items: [pri(50, -1), auto(50), auto(50)],
      menuButtonSize: 32,
    });
    expect(fit.inMenu).toEqual([0]);
  });

  it('priority never overrides the policies', () => {
    const fit = fitToolbarItems({
      containerSize: 82,
      items: [
        { size: 50, policy: 'never', priority: -100 },
        pri(50, 100),
        { size: 50, policy: 'always', priority: 100 },
      ],
      menuButtonSize: 32,
    });
    // 'never' stays despite the lowest priority; 'always' goes despite the highest.
    expect(fit.inline).toEqual([0]);
    expect(fit.inMenu).toEqual([1, 2]);
  });
});
