import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeSplitter } from './splitter';
import type {
  OgeSplitterOrientation,
  OgeSplitterPaneData,
  OgeSplitterResizeEvent,
} from './splitter-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  selector: 'oge-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeSplitter],
  template: `
    <oge-splitter
      [panes]="panes()"
      [orientation]="orientation()"
      [step]="step()"
      [keyboardNavigation]="keyboardNavigation()"
      (resizeEnded)="ended.push($event)"
    />
  `,
})
class Host {
  readonly splitter = viewChild.required(OgeSplitter);
  readonly panes = signal<readonly OgeSplitterPaneData[]>([]);
  readonly orientation = signal<OgeSplitterOrientation>('horizontal');
  readonly step = signal(5);
  readonly keyboardNavigation = signal(true);
  readonly ended: OgeSplitterResizeEvent[] = [];
}

describe('OgeSplitter keyboard', () => {
  async function render(panes: readonly OgeSplitterPaneData[]) {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    host.panes.set(panes);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    const root = el.querySelector('.oge-splitter') as HTMLElement;
    const separators = () =>
      Array.from(el.querySelectorAll<HTMLElement>('.oge-splitter-separator'));

    async function press(index: number, key: string) {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      separators()[index].dispatchEvent(event);
      await settle(fixture);
      return event;
    }

    return {
      fixture,
      host,
      el,
      root,
      separators,
      press,
      template: () =>
        root.style.gridTemplateColumns || root.style.gridTemplateRows,
    };
  }

  const even: OgeSplitterPaneData[] = [
    { key: 'a', size: 50 },
    { key: 'b', size: 50 },
  ];

  it('moves the separator by step on Left and Right', async () => {
    const view = await render(even);
    await view.press(0, 'ArrowRight');
    expect(view.template()).toBe('minmax(0, 55fr) 6px minmax(0, 45fr)');
    await view.press(0, 'ArrowLeft');
    await view.press(0, 'ArrowLeft');
    expect(view.template()).toBe('minmax(0, 45fr) 6px minmax(0, 55fr)');
  });

  it('uses Up and Down on a vertical splitter', async () => {
    const view = await render(even);
    view.host.orientation.set('vertical');
    await settle(view.fixture);
    await view.press(0, 'ArrowDown');
    expect(view.root.style.gridTemplateRows).toBe(
      'minmax(0, 55fr) 6px minmax(0, 45fr)',
    );
  });

  it('ignores the cross-axis arrows', async () => {
    const view = await render(even);
    await view.press(0, 'ArrowDown');
    await view.press(0, 'ArrowUp');
    expect(view.template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('honours the step input', async () => {
    const view = await render(even);
    view.host.step.set(20);
    await settle(view.fixture);
    await view.press(0, 'ArrowRight');
    expect(view.template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');
  });

  it('mirrors the arrows in RTL', async () => {
    const view = await render(even);
    view.root.style.direction = 'rtl';
    await view.press(0, 'ArrowRight');
    expect(view.template()).toBe('minmax(0, 45fr) 6px minmax(0, 55fr)');
  });

  it('jumps to the primary pane minimum on Home and its maximum on End', async () => {
    const view = await render([
      { key: 'a', size: 50, minSize: 20, maxSize: 70 },
      { key: 'b', size: 50 },
    ]);
    await view.press(0, 'End');
    expect(view.template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');
    await view.press(0, 'Home');
    expect(view.template()).toBe('minmax(0, 20fr) 6px minmax(0, 80fr)');
  });

  it('stops End at the neighbour minimum', async () => {
    const view = await render([
      { key: 'a', size: 50 },
      { key: 'b', size: 50, minSize: 30 },
    ]);
    await view.press(0, 'End');
    expect(view.template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');
  });

  it('calls preventDefault on the keys it handles and not on others', async () => {
    const view = await render(even);
    expect((await view.press(0, 'ArrowRight')).defaultPrevented).toBe(true);
    expect((await view.press(0, 'Home')).defaultPrevented).toBe(true);
    expect((await view.press(0, 'Tab')).defaultPrevented).toBe(false);
    expect((await view.press(0, 'PageUp')).defaultPrevented).toBe(false);
  });

  it('emits the resize events for a keyboard nudge too', async () => {
    const view = await render(even);
    await view.press(0, 'ArrowRight');
    expect(view.host.ended).toHaveLength(1);
    expect(view.host.ended[0].sizes).toEqual([55, 45]);
    expect(view.host.ended[0].previousSizes).toEqual([50, 50]);
  });

  it('does nothing while keyboardNavigation is off', async () => {
    const view = await render(even);
    view.host.keyboardNavigation.set(false);
    await settle(view.fixture);
    await view.press(0, 'ArrowRight');
    expect(view.template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('takes separators out of the tab order while keyboardNavigation is off', async () => {
    const view = await render(even);
    expect(view.separators()[0].tabIndex).toBe(0);
    view.host.keyboardNavigation.set(false);
    await settle(view.fixture);
    expect(view.separators()[0].tabIndex).toBe(-1);
  });

  it('focuses a separator through focus()', async () => {
    const view = await render([{ key: 'a' }, { key: 'b' }, { key: 'c' }]);
    view.host.splitter().focus(1);
    expect(document.activeElement).toBe(view.separators()[1]);
    view.host.splitter().focus();
    expect(document.activeElement).toBe(view.separators()[0]);
  });
});
