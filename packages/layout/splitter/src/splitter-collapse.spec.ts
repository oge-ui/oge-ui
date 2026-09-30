import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeSplitter } from './splitter';
import { OgeSplitterPane } from './splitter-pane';
import type {
  OgeSplitterPaneCollapsedEvent,
  OgeSplitterPaneCollapsingEvent,
} from './splitter-types';

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
      (paneCollapsing)="collapsing.push($event); onPre($event)"
      (paneExpanding)="expanding.push($event); onPre($event)"
      (paneCollapsed)="collapsed.push($event)"
      (paneExpanded)="expanded.push($event)"
    >
      <oge-splitter-pane
        key="side"
        [size]="30"
        [collapsible]="collapsible()"
        [collapsedSize]="collapsedSize()"
        [(collapsed)]="sideCollapsed"
      >
        <button type="button" class="inside">inside</button>
      </oge-splitter-pane>
      <oge-splitter-pane key="main" [size]="70">main</oge-splitter-pane>
    </oge-splitter>
  `,
})
class Host {
  readonly splitter = viewChild.required(OgeSplitter);
  readonly collapsible = signal(true);
  readonly collapsedSize = signal<string | number | undefined>(undefined);
  readonly sideCollapsed = signal(false);
  readonly veto = signal(false);
  readonly collapsing: OgeSplitterPaneCollapsingEvent[] = [];
  readonly expanding: OgeSplitterPaneCollapsingEvent[] = [];
  readonly collapsed: OgeSplitterPaneCollapsedEvent[] = [];
  readonly expanded: OgeSplitterPaneCollapsedEvent[] = [];

  onPre(event: OgeSplitterPaneCollapsingEvent): void {
    if (this.veto()) event.cancel = true;
  }
}

describe('OgeSplitter collapse', () => {
  async function render(setup?: (host: Host) => void) {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    setup?.(host);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    const root = el.querySelector('.oge-splitter') as HTMLElement;
    return {
      fixture,
      host,
      el,
      root,
      panes: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-splitter-pane')),
      separator: () =>
        el.querySelector('.oge-splitter-separator') as HTMLElement,
      grip: () => el.querySelector<HTMLElement>('.oge-splitter-grip'),
      template: () => root.style.gridTemplateColumns,
      press: async (key: string) => {
        const event = new KeyboardEvent('keydown', {
          key,
          bubbles: true,
          cancelable: true,
        });
        (
          el.querySelector('.oge-splitter-separator') as HTMLElement
        ).dispatchEvent(event);
        await settle(fixture);
        return event;
      },
    };
  }

  it('collapses the primary pane on Enter and restores it on the next Enter', async () => {
    const view = await render();
    expect(view.template()).toBe('minmax(0, 30fr) 6px minmax(0, 70fr)');

    await view.press('Enter');
    expect(view.template()).toBe('0px 6px minmax(0, 100fr)');
    expect(view.panes()[0].classList).toContain('oge-splitter-pane-collapsed');

    await view.press('Enter');
    expect(view.template()).toBe('minmax(0, 30fr) 6px minmax(0, 70fr)');
  });

  it('restores the size the pane had at the moment it was collapsed', async () => {
    const view = await render();
    await view.press('ArrowRight');
    expect(view.template()).toBe('minmax(0, 35fr) 6px minmax(0, 65fr)');
    await view.press('Enter');
    await view.press('Enter');
    expect(view.template()).toBe('minmax(0, 35fr) 6px minmax(0, 65fr)');
  });

  it('keeps a collapsedSize instead of going to zero', async () => {
    const view = await render((host) => host.collapsedSize.set('32px'));
    await view.press('Enter');
    expect(view.template()).toBe('32px 6px minmax(0, 100fr)');
  });

  it('makes a collapsed pane inert rather than removing it', async () => {
    const view = await render();
    await view.press('Enter');
    const pane = view.panes()[0];
    expect(pane.hasAttribute('inert')).toBe(true);
    // still in the DOM, so aria-controls keeps pointing at a real element
    expect(pane.querySelector('.inside')).not.toBeNull();
    expect(pane.hasAttribute('hidden')).toBe(false);
  });

  it('hands focus to the separator when the focused pane collapses', async () => {
    const view = await render();
    const inside = view.el.querySelector<HTMLElement>('.inside');
    inside?.focus();
    expect(document.activeElement).toBe(inside);

    view.host.splitter().collapse('side');
    await settle(view.fixture);
    expect(document.activeElement).toBe(view.separator());
  });

  it('emits the cancelable pre-event before the past-tense one', async () => {
    const view = await render();
    await view.press('Enter');
    expect(view.host.collapsing).toHaveLength(1);
    expect(view.host.collapsed).toHaveLength(1);
    expect(view.host.collapsed[0].key).toBe('side');
    expect(view.host.collapsed[0].index).toBe(0);

    await view.press('Enter');
    expect(view.host.expanding).toHaveLength(1);
    expect(view.host.expanded).toHaveLength(1);
  });

  it('blocks the change when the pre-event is canceled', async () => {
    const view = await render((host) => host.veto.set(true));
    await view.press('Enter');
    expect(view.host.collapsing).toHaveLength(1);
    expect(view.host.collapsed).toHaveLength(0);
    expect(view.template()).toBe('minmax(0, 30fr) 6px minmax(0, 70fr)');
  });

  it('reverts a vetoed write to the declarative [(collapsed)] model', async () => {
    const view = await render((host) => host.veto.set(true));
    view.host.sideCollapsed.set(true);
    await settle(view.fixture);
    expect(view.host.sideCollapsed()).toBe(false);
    expect(view.template()).toBe('minmax(0, 30fr) 6px minmax(0, 70fr)');
  });

  it('follows a write to the declarative [(collapsed)] model', async () => {
    const view = await render();
    view.host.sideCollapsed.set(true);
    await settle(view.fixture);
    expect(view.template()).toBe('0px 6px minmax(0, 100fr)');
    expect(view.host.collapsed).toHaveLength(1);
  });

  it('pushes an imperative collapse back into the model', async () => {
    const view = await render();
    expect(view.host.splitter().collapse('side')).toBe(true);
    await settle(view.fixture);
    expect(view.host.sideCollapsed()).toBe(true);
    expect(view.host.splitter().isCollapsed('side')).toBe(true);

    expect(view.host.splitter().expand(0)).toBe(true);
    await settle(view.fixture);
    expect(view.host.sideCollapsed()).toBe(false);
  });

  it('toggles and reports unknown targets', async () => {
    const view = await render();
    expect(view.host.splitter().toggle('side')).toBe(true);
    await settle(view.fixture);
    expect(view.host.splitter().isCollapsed('side')).toBe(true);
    expect(view.host.splitter().toggle('nope')).toBe(false);
    expect(view.host.splitter().isCollapsed('nope')).toBe(false);
  });

  it('does nothing for a pane that is not collapsible', async () => {
    const view = await render((host) => host.collapsible.set(false));
    await view.press('Enter');
    expect(view.host.collapsing).toHaveLength(0);
    expect(view.template()).toBe('minmax(0, 30fr) 6px minmax(0, 70fr)');
    expect(view.grip()).toBeNull();
  });

  it('toggles from the grip and from a double click', async () => {
    const view = await render();
    view.el
      .querySelector('.oge-splitter-grip-start')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(view.fixture);
    expect(view.host.splitter().isCollapsed('side')).toBe(true);

    view
      .separator()
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(view.fixture);
    expect(view.host.splitter().isCollapsed('side')).toBe(false);
  });

  it('locks the separator of a collapsed pane against dragging', async () => {
    const view = await render();
    await view.press('Enter');
    expect(view.separator().getAttribute('aria-disabled')).toBe('true');
    expect(view.separator().classList).toContain(
      'oge-splitter-separator-locked',
    );
  });
});
