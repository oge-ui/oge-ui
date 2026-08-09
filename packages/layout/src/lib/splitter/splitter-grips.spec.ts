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
      [showCollapseGrips]="showCollapseGrips()"
    />
  `,
})
class Host {
  readonly splitter = viewChild.required(OgeSplitter);
  readonly panes = signal<readonly OgeSplitterPaneData[]>([]);
  readonly orientation = signal<OgeSplitterOrientation>('horizontal');
  readonly showCollapseGrips = signal(true);
}

describe('OgeSplitter collapse grips', () => {
  async function render(panes: readonly OgeSplitterPaneData[]) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.panes.set(panes);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    const separator = () =>
      el.querySelector('.oge-splitter-separator') as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      separator,
      grips: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-splitter-grip')).map(
          (g) => g.dataset['grip'],
        ),
      grip: (side: 'start' | 'end') =>
        el.querySelector<HTMLElement>(`.oge-splitter-grip-${side}`),
      press: async (key: string, ctrl = false) => {
        const event = new KeyboardEvent('keydown', {
          key,
          ctrlKey: ctrl,
          bubbles: true,
          cancelable: true,
        });
        separator().dispatchEvent(event);
        await settle(fixture);
        return event;
      },
      template: () =>
        (el.querySelector('.oge-splitter') as HTMLElement).style
          .gridTemplateColumns,
    };
  }

  const bothCollapsible: OgeSplitterPaneData[] = [
    { key: 'a', size: 30, collapsible: true },
    { key: 'b', size: 70, collapsible: true },
  ];

  it('renders one grip per collapsible neighbour', async () => {
    expect((await render(bothCollapsible)).grips()).toEqual(['start', 'end']);
    expect(
      (await render([{ key: 'a', collapsible: true }, { key: 'b' }])).grips(),
    ).toEqual(['start']);
    expect(
      (await render([{ key: 'a' }, { key: 'b', collapsible: true }])).grips(),
    ).toEqual(['end']);
    expect((await render([{ key: 'a' }, { key: 'b' }])).grips()).toEqual([]);
  });

  it('hides the grips behind showCollapseGrips', async () => {
    const view = await render(bothCollapsible);
    view.host.showCollapseGrips.set(false);
    await settle(view.fixture);
    expect(view.grips()).toEqual([]);
    // the keyboard path stays available
    await view.press('Enter');
    expect(view.host.splitter().isCollapsed('a')).toBe(true);
  });

  it('collapses the pane after the separator from the end grip', async () => {
    const view = await render(bothCollapsible);
    view.grip('end')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(view.fixture);
    expect(view.host.splitter().isCollapsed('b')).toBe(true);
    expect(view.host.splitter().isCollapsed('a')).toBe(false);
    expect(view.template()).toBe('minmax(0, 100fr) 6px 0px');
  });

  it('collapses the preceding pane from the start grip', async () => {
    const view = await render(bothCollapsible);
    view
      .grip('start')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(view.fixture);
    expect(view.host.splitter().isCollapsed('a')).toBe(true);
    expect(view.host.splitter().isCollapsed('b')).toBe(false);
  });

  it('flips a grip chevron once its pane is collapsed', async () => {
    const view = await render(bothCollapsible);
    const before = view.grip('start')?.querySelector('path')?.getAttribute('d');
    view.host.splitter().collapse('a');
    await settle(view.fixture);
    const after = view.grip('start')?.querySelector('path')?.getAttribute('d');
    expect(before).not.toBe(after);
  });

  it('Enter still targets the primary pane only', async () => {
    const view = await render(bothCollapsible);
    await view.press('Enter');
    expect(view.host.splitter().isCollapsed('a')).toBe(true);
    expect(view.host.splitter().isCollapsed('b')).toBe(false);
  });

  it('Ctrl+Arrow collapses the pane the arrow points at', async () => {
    const view = await render(bothCollapsible);
    await view.press('ArrowRight', true);
    expect(view.host.splitter().isCollapsed('b')).toBe(true);

    // pointing back the other way restores it before touching the near pane
    await view.press('ArrowLeft', true);
    expect(view.host.splitter().isCollapsed('b')).toBe(false);
    expect(view.host.splitter().isCollapsed('a')).toBe(false);

    await view.press('ArrowLeft', true);
    expect(view.host.splitter().isCollapsed('a')).toBe(true);
  });

  it('Ctrl+Arrow reaches a pane that Enter cannot', async () => {
    const view = await render([{ key: 'a' }, { key: 'b', collapsible: true }]);
    await view.press('Enter');
    expect(view.host.splitter().isCollapsed('b')).toBe(false);

    await view.press('ArrowRight', true);
    expect(view.host.splitter().isCollapsed('b')).toBe(true);
  });

  it('uses the vertical arrows on a vertical splitter', async () => {
    const view = await render(bothCollapsible);
    view.host.orientation.set('vertical');
    await settle(view.fixture);
    await view.press('ArrowDown', true);
    expect(view.host.splitter().isCollapsed('b')).toBe(true);
  });

  it('does not preventDefault a Ctrl+Arrow it cannot act on', async () => {
    const view = await render([{ key: 'a' }, { key: 'b' }]);
    expect((await view.press('ArrowRight', true)).defaultPrevented).toBe(false);
    // and a plain arrow still resizes rather than collapsing
    await view.press('ArrowRight');
    expect(view.template()).toBe('minmax(0, 55fr) 6px minmax(0, 45fr)');
  });
});
