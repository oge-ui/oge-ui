import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideOgeSplitterConfig } from './config';
import { OgeSplitter } from './splitter';
import { OgeSplitterPane } from './splitter-pane';
import type {
  OgeSplitterOrientation,
  OgeSplitterPaneData,
  OgeSplitterSize,
} from './splitter-types';
import { OgeSplitterPaneTemplate } from './templates';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  selector: 'oge-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeSplitter, OgeSplitterPane],
  template: `
    <oge-splitter
      [orientation]="orientation()"
      [panes]="panes()"
      [sizes]="sizes()"
      [separatorSize]="separatorSize()"
    >
      @for (pane of children(); track pane.key) {
        <oge-splitter-pane [key]="pane.key" [size]="pane.size">
          {{ pane.key }} body
        </oge-splitter-pane>
      }
    </oge-splitter>
  `,
})
class Host {
  readonly splitter = viewChild.required(OgeSplitter);
  readonly orientation = signal<OgeSplitterOrientation>('horizontal');
  readonly panes = signal<readonly OgeSplitterPaneData[] | undefined>(
    undefined,
  );
  readonly sizes = signal<readonly OgeSplitterSize[] | undefined>(undefined);
  readonly separatorSize = signal(6);
  readonly children = signal<{ key: string; size?: OgeSplitterSize }[]>([]);
}

describe('OgeSplitter rendering', () => {
  async function render(setup?: (host: Host) => void) {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    setup?.(host);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    const root = el.querySelector<HTMLElement>('.oge-splitter');
    return {
      fixture,
      host,
      el,
      root: root as HTMLElement,
      panes: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-splitter-pane')),
      separators: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-splitter-separator')),
      template: () =>
        root?.style.gridTemplateColumns || root?.style.gridTemplateRows || '',
    };
  }

  it('renders one pane per declarative child and a separator between them', async () => {
    const view = await render((host) =>
      host.children.set([{ key: 'a' }, { key: 'b' }, { key: 'c' }]),
    );
    expect(view.panes()).toHaveLength(3);
    expect(view.separators()).toHaveLength(2);
    expect(view.panes()[0].textContent?.trim()).toBe('a body');
  });

  it('merges declarative children before data-driven panes', async () => {
    const view = await render((host) => {
      host.children.set([{ key: 'child' }]);
      host.panes.set([{ key: 'data', text: 'from items' }]);
    });
    expect(view.panes()).toHaveLength(2);
    expect(view.panes()[0].textContent?.trim()).toBe('child body');
    expect(view.panes()[1].textContent?.trim()).toBe('from items');
  });

  it('drops panes with visible: false', async () => {
    const view = await render((host) =>
      host.panes.set([
        { key: 'a', text: 'A' },
        { key: 'b', text: 'B', visible: false },
        { key: 'c', text: 'C' },
      ]),
    );
    expect(view.panes()).toHaveLength(2);
    expect(view.separators()).toHaveLength(1);
  });

  it('renders the empty message when there is nothing to show', async () => {
    const view = await render();
    expect(view.el.querySelector('.oge-splitter-empty')?.textContent).toContain(
      'No panes to display',
    );
  });

  // The orientation union has exactly two members; a value missing from the
  // template bindings would silently lay the panes out along the wrong axis.
  it('renders every orientation value on the matching grid axis', async () => {
    const view = await render((host) =>
      host.children.set([{ key: 'a' }, { key: 'b' }]),
    );
    expect(view.root.dataset['orientation']).toBe('horizontal');
    expect(view.root.style.gridTemplateColumns).not.toBe('');
    expect(view.root.style.gridTemplateRows).toBe('');

    view.host.orientation.set('vertical');
    await settle(view.fixture);
    expect(view.root.dataset['orientation']).toBe('vertical');
    expect(view.root.style.gridTemplateRows).not.toBe('');
    expect(view.root.style.gridTemplateColumns).toBe('');
  });

  it('writes a track per pane and a fixed track per separator', async () => {
    const view = await render((host) =>
      host.children.set([
        { key: 'a', size: 30 },
        { key: 'b', size: 70 },
      ]),
    );
    expect(view.template()).toBe('minmax(0, 30fr) 6px minmax(0, 70fr)');
  });

  it('treats sizes as ratios, not percentages', async () => {
    const view = await render((host) =>
      host.children.set([
        { key: 'a', size: 30 },
        { key: 'b', size: 30 },
      ]),
    );
    expect(view.template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('pins a px size to a fixed track and shares out the rest', async () => {
    const view = await render((host) =>
      host.children.set([
        { key: 'a', size: '240px' },
        { key: 'b', size: 40 },
        { key: 'c', size: 60 },
      ]),
    );
    expect(view.template()).toBe(
      '240px 6px minmax(0, 40fr) 6px minmax(0, 60fr)',
    );
  });

  it('reads a percent string as a share', async () => {
    const view = await render((host) =>
      host.children.set([
        { key: 'a', size: '25%' },
        { key: 'b', size: '75%' },
      ]),
    );
    expect(view.template()).toBe('minmax(0, 25fr) 6px minmax(0, 75fr)');
  });

  it('warns about an unusable size and falls back to an even share', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await render((host) =>
      host.children.set([
        { key: 'a', size: '12rem' },
        { key: 'b', size: 50 },
      ]),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('is not a share number'),
    );
    expect(view.template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
    warn.mockRestore();
  });

  it('honours the separatorSize input', async () => {
    const view = await render((host) => {
      host.children.set([{ key: 'a' }, { key: 'b' }]);
      host.separatorSize.set(12);
    });
    expect(view.template()).toContain('12px');
  });

  it('lets [sizes] override the per-pane size inputs', async () => {
    const view = await render((host) => {
      host.children.set([
        { key: 'a', size: 50 },
        { key: 'b', size: 50 },
      ]);
      host.sizes.set([80, 20]);
    });
    expect(view.template()).toBe('minmax(0, 80fr) 6px minmax(0, 20fr)');
  });

  it('marks scrollable panes and applies a custom class', async () => {
    const view = await render((host) =>
      host.panes.set([
        { key: 'a', text: 'A', cssClass: 'my-pane' },
        { key: 'b', text: 'B', scrollable: false },
      ]),
    );
    expect(view.panes()[0].classList).toContain('oge-splitter-pane-scroll');
    expect(view.panes()[0].classList).toContain('my-pane');
    expect(view.panes()[1].classList).not.toContain('oge-splitter-pane-scroll');
  });

  it('renders a nested splitter for a pane with its own panes', async () => {
    const view = await render((host) =>
      host.panes.set([
        { key: 'left', text: 'L' },
        {
          key: 'right',
          panes: [
            { key: 'top', text: 'T' },
            { key: 'bottom', text: 'B' },
          ],
        },
      ]),
    );
    const nested = view.el.querySelectorAll('oge-splitter');
    expect(nested).toHaveLength(2);
    // a nested splitter flips the axis unless it names its own
    expect(nested[1].getAttribute('data-orientation')).toBe('vertical');
    expect(view.el.textContent).toContain('T');
    expect(view.el.textContent).toContain('B');
  });

  it('honours an explicit orientation on a nested pane', async () => {
    const view = await render((host) =>
      host.panes.set([
        { key: 'left', text: 'L' },
        {
          key: 'right',
          orientation: 'horizontal',
          panes: [
            { key: 'x', text: 'X' },
            { key: 'y', text: 'Y' },
          ],
        },
      ]),
    );
    expect(
      view.el
        .querySelectorAll('oge-splitter')[1]
        .getAttribute('data-orientation'),
    ).toBe('horizontal');
  });
});

describe('OgeSplitter templates and config', () => {
  it('renders the pane template for data-driven panes', async () => {
    @Component({
      selector: 'oge-tpl-host',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [OgeSplitter, OgeSplitterPaneTemplate],
      template: `
        <oge-splitter [panes]="panes">
          <ng-template ogeSplitterPaneTemplate let-pane let-index="index">
            <b class="tpl">{{ index }}:{{ pane.key }}</b>
          </ng-template>
        </oge-splitter>
      `,
    })
    class TplHost {
      readonly panes: OgeSplitterPaneData[] = [{ key: 'a' }, { key: 'b' }];
    }

    const fixture = TestBed.createComponent(TplHost);
    await settle(fixture);
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.tpl'),
    ).map((el) => el.textContent);
    expect(labels).toEqual(['0:a', '1:b']);
  });

  it('honors provideOgeSplitterConfig overrides', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideOgeSplitterConfig({
          separatorSize: 10,
          messages: { noData: 'Bölüm yok' },
        }),
      ],
    });

    @Component({
      selector: 'oge-config-host',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [OgeSplitter],
      template: `<oge-splitter [panes]="[]" />`,
    })
    class ConfigHost {}

    const fixture = TestBed.createComponent(ConfigHost);
    await settle(fixture);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.oge-splitter-empty',
      )?.textContent,
    ).toContain('Bölüm yok');
  });

  it('lets a per-instance [messages] win over the config', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideOgeSplitterConfig({ messages: { noData: 'config' } })],
    });

    @Component({
      selector: 'oge-msg-host',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [OgeSplitter],
      template: `<oge-splitter
        [panes]="[]"
        [messages]="{ noData: 'instance' }"
      />`,
    })
    class MsgHost {}

    const fixture = TestBed.createComponent(MsgHost);
    await settle(fixture);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.oge-splitter-empty',
      )?.textContent,
    ).toContain('instance');
  });
});
