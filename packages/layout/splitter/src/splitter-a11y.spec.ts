import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideOgeSplitterConfig } from './config';
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
      [ariaLabel]="ariaLabel()"
    />
  `,
})
class Host {
  readonly splitter = viewChild.required(OgeSplitter);
  readonly panes = signal<readonly OgeSplitterPaneData[]>([]);
  readonly orientation = signal<OgeSplitterOrientation>('horizontal');
  readonly ariaLabel = signal<string | undefined>(undefined);
}

describe('OgeSplitter accessibility', () => {
  async function render(panes: readonly OgeSplitterPaneData[]) {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    host.panes.set(panes);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      host,
      el,
      root: el.querySelector('.oge-splitter') as HTMLElement,
      separators: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-splitter-separator')),
      panes: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-splitter-pane')),
    };
  }

  const even: OgeSplitterPaneData[] = [
    { key: 'a', size: 30 },
    { key: 'b', size: 70 },
  ];

  it('gives each separator the APG role, orientation and tab stop', async () => {
    const view = await render(even);
    const separator = view.separators()[0];
    expect(separator.getAttribute('role')).toBe('separator');
    expect(separator.getAttribute('aria-orientation')).toBe('horizontal');
    expect(separator.tabIndex).toBe(0);
  });

  it('mirrors aria-orientation onto the vertical axis', async () => {
    const view = await render(even);
    view.host.orientation.set('vertical');
    await settle(view.fixture);
    expect(view.separators()[0].getAttribute('aria-orientation')).toBe(
      'vertical',
    );
  });

  it('points aria-controls at the primary (preceding) pane', async () => {
    const view = await render([{ key: 'a' }, { key: 'b' }, { key: 'c' }]);
    const panes = view.panes();
    expect(view.separators()[0].getAttribute('aria-controls')).toBe(
      panes[0].id,
    );
    expect(view.separators()[1].getAttribute('aria-controls')).toBe(
      panes[1].id,
    );
    expect(panes[0].id).not.toBe('');
  });

  it('reports the primary pane size as aria-valuenow on a 0-100 scale', async () => {
    const view = await render(even);
    expect(view.separators()[0].getAttribute('aria-valuenow')).toBe('30');
    expect(view.separators()[0].getAttribute('aria-valuemin')).toBe('0');
    expect(view.separators()[0].getAttribute('aria-valuemax')).toBe('100');
  });

  it('narrows valuemin and valuemax to the reachable range', async () => {
    const view = await render([
      { key: 'a', size: 50, minSize: 20, maxSize: 60 },
      { key: 'b', size: 50, minSize: 25 },
    ]);
    const separator = view.separators()[0];
    expect(separator.getAttribute('aria-valuenow')).toBe('50');
    expect(separator.getAttribute('aria-valuemin')).toBe('20');
    // capped by the neighbour's own minimum (100 - 25), not just by maxSize
    expect(separator.getAttribute('aria-valuemax')).toBe('60');
  });

  it('keeps aria-valuenow in step with a resize', async () => {
    const view = await render(even);
    view.host.splitter().resize(0, 20);
    await settle(view.fixture);
    expect(view.separators()[0].getAttribute('aria-valuenow')).toBe('50');
  });

  it('labels the separator from the messages and marks it disabled when locked', async () => {
    const view = await render([{ key: 'a', resizable: false }, { key: 'b' }]);
    const separator = view.separators()[0];
    expect(separator.getAttribute('aria-label')).toBe('Resize panes 1 and 2');
    expect(separator.getAttribute('aria-disabled')).toBe('true');
  });

  it('advertises Enter only when the primary pane is collapsible', async () => {
    const view = await render([
      { key: 'a', collapsible: true },
      { key: 'b' },
      { key: 'c' },
    ]);
    expect(view.separators()[0].getAttribute('aria-keyshortcuts')).toContain(
      'Enter',
    );
    expect(view.separators()[1].getAttribute('aria-keyshortcuts')).toBeNull();
  });

  it('advertises Ctrl+Arrow when only the following pane is collapsible', async () => {
    const view = await render([{ key: 'a' }, { key: 'b', collapsible: true }]);
    const shortcuts = view.separators()[0].getAttribute('aria-keyshortcuts');
    // Enter is the APG binding for the primary pane, which is not collapsible
    expect(shortcuts).not.toContain('Enter');
    expect(shortcuts).toBe('Control+ArrowLeft Control+ArrowRight');
  });

  it('announces a collapsed primary pane in the separator label', async () => {
    const view = await render([{ key: 'a', collapsible: true }, { key: 'b' }]);
    view.host.splitter().collapse('a');
    await settle(view.fixture);
    expect(view.separators()[0].getAttribute('aria-label')).toContain(
      'collapsed',
    );
  });

  it('keeps every decorative glyph out of the accessibility tree', async () => {
    const view = await render([{ key: 'a', collapsible: true }, { key: 'b' }]);
    const decorative = view
      .separators()[0]
      .querySelectorAll('.oge-splitter-separator-line, .oge-splitter-grip');
    expect(decorative.length).toBe(2);
    decorative.forEach((el) =>
      expect(el.getAttribute('aria-hidden')).toBe('true'),
    );
    // the APG separator is the only focusable thing inside itself — a real
    // <button> here would be a nested-interactive violation
    expect(
      view.separators()[0].querySelectorAll('button, a, input').length,
    ).toBe(0);
  });

  it('applies an ariaLabel to the container', async () => {
    const view = await render(even);
    view.host.ariaLabel.set('Editor layout');
    await settle(view.fixture);
    expect(view.root.getAttribute('aria-label')).toBe('Editor layout');
  });

  it('takes the separator label from the config messages', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideOgeSplitterConfig({
          messages: { separator: '{{first}} ile {{second}} arası' },
        }),
      ],
    });

    @Component({
      selector: 'oge-msg-host',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [OgeSplitter],
      template: `<oge-splitter [panes]="[{ key: 'a' }, { key: 'b' }]" />`,
    })
    class MsgHost {}

    const fixture = TestBed.createComponent(MsgHost);
    await settle(fixture);
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.oge-splitter-separator')
        ?.getAttribute('aria-label'),
    ).toBe('1 ile 2 arası');
  });
});
