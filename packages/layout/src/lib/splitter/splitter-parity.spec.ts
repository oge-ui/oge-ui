import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeSplitter } from './splitter';
import { OgeSplitterPane } from './splitter-pane';
import type { OgeSplitterPaneData, OgeSplitterSize } from './splitter-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  selector: 'oge-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeSplitter],
  template: `<oge-splitter [panes]="panes()" [(sizes)]="sizes" />`,
})
class Host {
  readonly splitter = viewChild.required(OgeSplitter);
  readonly panes = signal<readonly OgeSplitterPaneData[]>([]);
  readonly sizes = signal<readonly OgeSplitterSize[] | undefined>(undefined);
}

async function render(panes: readonly OgeSplitterPaneData[]) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.panes.set(panes);
  await settle(fixture);
  const el: HTMLElement = fixture.nativeElement;
  return {
    fixture,
    host: fixture.componentInstance,
    el,
    root: el.querySelector('.oge-splitter') as HTMLElement,
    template: () =>
      (el.querySelector('.oge-splitter') as HTMLElement).style
        .gridTemplateColumns,
  };
}

describe('OgeSplitter reference parity', () => {
  describe('reference splitter: items and sizing', () => {
    it('items[] maps to panes with size / minSize / maxSize / resizable / visible', async () => {
      const view = await render([
        { key: 'a', size: 40, minSize: 10, maxSize: 80, resizable: true },
        { key: 'b', size: 60 },
        { key: 'gone', visible: false },
      ]);
      expect(view.el.querySelectorAll('.oge-splitter-pane')).toHaveLength(2);
      expect(view.template()).toBe('minmax(0, 40fr) 6px minmax(0, 60fr)');
    });

    it('items[].collapsed and collapsedSize seed the collapsed state', async () => {
      const view = await render([
        {
          key: 'a',
          size: 30,
          collapsible: true,
          collapsed: true,
          collapsedSize: '24px',
        },
        { key: 'b', size: 70 },
      ]);
      expect(view.host.splitter().isCollapsed('a')).toBe(true);
      expect(view.template()).toBe('24px 6px minmax(0, 100fr)');
    });

    it('items[].text renders as the pane body', async () => {
      const view = await render([
        { key: 'a', text: 'plain body' },
        { key: 'b' },
      ]);
      expect(view.el.textContent).toContain('plain body');
    });

    it('items[].splitter maps to a nested panes array on the same component', async () => {
      const view = await render([
        { key: 'a' },
        { key: 'b', panes: [{ key: 'x' }, { key: 'y' }] },
      ]);
      expect(view.el.querySelectorAll('oge-splitter')).toHaveLength(2);
    });

    it('separatorSize sets the separator track width', async () => {
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.panes.set([{ key: 'a' }, { key: 'b' }]);
      await settle(fixture);
      const root = (fixture.nativeElement as HTMLElement).querySelector(
        '.oge-splitter',
      ) as HTMLElement;
      // default separatorSize is 6px — see splitter config
      expect(root.style.gridTemplateColumns).toContain('6px');
    });

    it('exposes the onResizeStart / onResize / onResizeEnd trio', async () => {
      const splitter = (
        await render([{ key: 'a' }, { key: 'b' }])
      ).host.splitter();
      expect(splitter.resizeStarted).toBeDefined();
      expect(splitter.resized).toBeDefined();
      expect(splitter.resizeEnded).toBeDefined();
    });

    it('exposes onItemCollapsed / onItemExpanded and a cancelable pre-event', async () => {
      const splitter = (
        await render([{ key: 'a' }, { key: 'b' }])
      ).host.splitter();
      expect(splitter.paneCollapsed).toBeDefined();
      expect(splitter.paneExpanded).toBeDefined();
      expect(splitter.paneCollapsing).toBeDefined();
      expect(splitter.paneExpanding).toBeDefined();
      expect(splitter.paneClick).toBeDefined();
    });

    it('emits paneClick for the clicked pane only, never through a nested one', async () => {
      @Component({
        selector: 'oge-click-host',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [OgeSplitter],
        template: `
          <oge-splitter [panes]="panes" (paneClick)="clicks.push($event.key)" />
        `,
      })
      class ClickHost {
        readonly panes: OgeSplitterPaneData[] = [
          { key: 'a', text: 'A' },
          { key: 'outer', panes: [{ key: 'x', text: 'X' }, { key: 'y' }] },
        ];
        readonly clicks: (string | undefined)[] = [];
      }

      const fixture = TestBed.createComponent(ClickHost);
      await settle(fixture);
      const el: HTMLElement = fixture.nativeElement;
      const panes = el.querySelectorAll<HTMLElement>('.oge-splitter-pane');

      panes[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle(fixture);
      expect(fixture.componentInstance.clicks).toEqual(['a']);

      // A click inside a nested splitter belongs to that splitter's own
      // paneClick output. The outer one must stay silent rather than reporting
      // the ancestor pane the DOM event merely bubbles through.
      const nestedPane = el
        .querySelectorAll('oge-splitter')[1]
        .querySelector<HTMLElement>('.oge-splitter-pane');
      nestedPane?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle(fixture);
      expect(fixture.componentInstance.clicks).toEqual(['a']);
    });
  });

  describe('reference splitter: declarative panes', () => {
    it('pane scrollable toggles the overflow class', async () => {
      const view = await render([
        { key: 'a', scrollable: true },
        { key: 'b', scrollable: false },
      ]);
      const panes = view.el.querySelectorAll('.oge-splitter-pane');
      expect(panes[0].classList).toContain('oge-splitter-pane-scroll');
      expect(panes[1].classList).not.toContain('oge-splitter-pane-scroll');
    });

    it('layoutChange is covered by the two-way sizes model', async () => {
      const view = await render([
        { key: 'a', size: 50 },
        { key: 'b', size: 50 },
      ]);
      view.host.splitter().resize(0, 10);
      await settle(view.fixture);
      expect(view.host.sizes()).toEqual([60, 40]);
    });

    it('accepts px and percent strings for min / max / size', async () => {
      const view = await render([
        { key: 'a', size: '30%' },
        { key: 'b', size: '240px' },
        { key: 'c', size: '70%' },
      ]);
      expect(view.template()).toBe(
        'minmax(0, 30fr) 6px 240px 6px minmax(0, 70fr)',
      );
    });
  });

  describe('reference splitter: layout and gutters', () => {
    it('panelSizes maps to the sizes model', async () => {
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.panes.set([{ key: 'a' }, { key: 'b' }]);
      fixture.componentInstance.sizes.set([25, 75]);
      await settle(fixture);
      expect(
        (
          (fixture.nativeElement as HTMLElement).querySelector(
            '.oge-splitter',
          ) as HTMLElement
        ).style.gridTemplateColumns,
      ).toBe('minmax(0, 25fr) 6px minmax(0, 75fr)');
    });

    it('minSizes maps to a per-pane minSize', async () => {
      const view = await render([
        { key: 'a', size: 50, minSize: 30 },
        { key: 'b', size: 50 },
      ]);
      view.host.splitter().resize(0, -100);
      await settle(view.fixture);
      expect(view.template()).toBe('minmax(0, 30fr) 6px minmax(0, 70fr)');
    });

    it('stateKey is covered by persisting the sizes model', async () => {
      const view = await render([
        { key: 'a', size: 50 },
        { key: 'b', size: 50 },
      ]);
      view.host.splitter().resize(0, 10);
      await settle(view.fixture);
      const persisted = JSON.stringify(view.host.sizes());

      const restored = await render([{ key: 'a' }, { key: 'b' }]);
      restored.host.sizes.set(JSON.parse(persisted));
      await settle(restored.fixture);
      expect(restored.template()).toBe('minmax(0, 60fr) 6px minmax(0, 40fr)');
    });
  });

  describe('declarative pane parity', () => {
    it('exposes open / close style methods on the pane itself', async () => {
      @Component({
        selector: 'oge-decl-host',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [OgeSplitter, OgeSplitterPane],
        template: `
          <oge-splitter>
            <oge-splitter-pane #side key="side" [collapsible]="true">
              side
            </oge-splitter-pane>
            <oge-splitter-pane key="main">main</oge-splitter-pane>
          </oge-splitter>
        `,
      })
      class DeclHost {
        readonly splitter = viewChild.required(OgeSplitter);
        readonly side = viewChild.required<OgeSplitterPane>('side');
      }

      const fixture = TestBed.createComponent(DeclHost);
      await settle(fixture);
      const host = fixture.componentInstance;

      host.side().collapse();
      await settle(fixture);
      expect(host.splitter().isCollapsed('side')).toBe(true);

      host.side().toggle();
      await settle(fixture);
      expect(host.splitter().isCollapsed('side')).toBe(false);

      host.side().collapse();
      await settle(fixture);
      host.side().expand();
      await settle(fixture);
      expect(host.splitter().isCollapsed('side')).toBe(false);
    });
  });
});
