import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArrayDataSource } from '@oge-ui/core';
import { OgeSplitter } from './splitter';
import { OgeSplitterPane } from './splitter-pane';
import type {
  OgeSplitterPaneData,
  OgeSplitterPaneHoldEvent,
} from './splitter-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeSplitter],
  template: `
    <oge-splitter
      [panes]="panes()"
      [dataSource]="source()"
      [itemHoldTimeout]="20"
      (paneHold)="held.push($event)"
      (paneContextMenu)="menued.push($event)"
    />
  `,
})
class ExtrasHost {
  readonly panes = signal<readonly OgeSplitterPaneData[]>([
    { key: 'a', text: 'A', htmlAttributes: { 'data-role': 'nav' } },
    { key: 'b', text: 'B' },
  ]);
  readonly source = signal<ArrayDataSource<OgeSplitterPaneData> | undefined>(
    undefined,
  );
  readonly held: OgeSplitterPaneHoldEvent[] = [];
  readonly menued: OgeSplitterPaneHoldEvent[] = [];
}

async function render(setup?: (host: ExtrasHost) => void) {
  const fixture = TestBed.createComponent(ExtrasHost);
  setup?.(fixture.componentInstance);
  await settle(fixture);
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    el,
    panes: () =>
      Array.from(el.querySelectorAll<HTMLElement>('.oge-splitter-pane')),
  };
}

describe('OgeSplitter — reference-parity extras', () => {
  it('applies the per-pane htmlAttributes bag and clears removed keys', async () => {
    const { fixture, host, panes } = await render();
    expect(panes()[0].getAttribute('data-role')).toBe('nav');

    host.panes.set([
      { key: 'a', text: 'A' },
      { key: 'b', text: 'B' },
    ]);
    await settle(fixture);
    expect(panes()[0].hasAttribute('data-role')).toBe(false);
  });

  it('fires paneHold after itemHoldTimeout and cancels on pointerup', async () => {
    const { host, panes } = await render();
    panes()[1].dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(host.held.map((e) => e.key)).toEqual(['b']);

    host.held.length = 0;
    panes()[0].dispatchEvent(new Event('pointerdown', { bubbles: true }));
    panes()[0].dispatchEvent(new Event('pointerup', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(host.held).toEqual([]);
  });

  it('fires paneContextMenu on right click, with the pane index', async () => {
    const { fixture, host, panes } = await render();
    panes()[1].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    await settle(fixture);
    expect(host.menued.map((e) => [e.index, e.key])).toEqual([[1, 'b']]);
  });

  it('does not report a nested splitter’s pane as its own', async () => {
    @Component({
      imports: [OgeSplitter, OgeSplitterPane],
      template: `
        <oge-splitter (paneContextMenu)="outer.push($event.key ?? '')">
          <oge-splitter-pane key="left">left</oge-splitter-pane>
          <oge-splitter-pane key="right">
            <oge-splitter (paneContextMenu)="inner.push($event.key ?? '')">
              <oge-splitter-pane key="top">top</oge-splitter-pane>
              <oge-splitter-pane key="bottom">bottom</oge-splitter-pane>
            </oge-splitter>
          </oge-splitter-pane>
        </oge-splitter>
      `,
    })
    class NestedHost {
      readonly outer: string[] = [];
      readonly inner: string[] = [];
    }
    const fixture = TestBed.createComponent(NestedHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const nestedPane = Array.from(
      el.querySelectorAll<HTMLElement>('.oge-splitter-pane'),
    ).find((pane) => pane.textContent?.trim() === 'bottom');
    nestedPane?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    await settle(fixture);
    expect(fixture.componentInstance.inner).toEqual(['bottom']);
    expect(fixture.componentInstance.outer).toEqual([]);
  });

  it('loads panes from a dataSource, merged after panes', async () => {
    const { fixture, host, panes } = await render();
    expect(panes().length).toBe(2);

    host.source.set(
      new ArrayDataSource<OgeSplitterPaneData>(
        [{ key: 'remote', text: 'Remote' }],
        { key: 'key' },
      ),
    );
    await settle(fixture);
    await settle(fixture);
    expect(panes().length).toBe(3);
    expect(panes()[2].textContent).toContain('Remote');
  });
});
