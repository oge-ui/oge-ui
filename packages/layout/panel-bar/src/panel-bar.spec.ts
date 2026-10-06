import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  OgePanelBarExpandMode,
  OgePanelBarItem,
  OgePanelBarItemExpandingEvent,
  OgePanelBarSelectionChangedEvent,
} from '@oge-ui/behavior';
import { OgePanelBar, OgePanelBarContentTemplate } from './panel-bar';

const ITEMS: OgePanelBarItem[] = [
  {
    key: 'mail',
    title: 'Mail',
    expanded: true,
    children: [
      { key: 'inbox', title: 'Inbox', badge: 4 },
      { key: 'sent', title: 'Sent', disabled: true },
      { key: 'drafts', title: 'Drafts' },
    ],
  },
  {
    key: 'projects',
    title: 'Projects',
    children: [
      {
        key: 'archive',
        title: 'Archive',
        children: [{ key: 'old', title: 'Old' }],
      },
    ],
  },
  { key: 'about', title: 'About', content: 'Version 1' },
];

@Component({
  imports: [OgePanelBar, OgePanelBarContentTemplate],
  template: `
    <oge-panel-bar
      [items]="items()"
      [expandMode]="mode()"
      [(selectedKey)]="selected"
      [(expandedKeys)]="expanded"
      (itemExpanding)="onExpanding($event)"
      (itemExpanded)="log.push('expanded:' + $event.key)"
      (itemCollapsed)="log.push('collapsed:' + $event.key)"
      (selectionChanged)="changes.push($event)"
    >
      @if (useTemplate()) {
        <ng-template ogePanelBarContentTemplate let-item>
          <span class="tpl">tpl {{ item.key }}</span>
        </ng-template>
      }
    </oge-panel-bar>
  `,
})
class PanelBarHost {
  readonly items = signal<OgePanelBarItem[]>(ITEMS);
  readonly mode = signal<OgePanelBarExpandMode>('multiple');
  readonly selected = signal<string | undefined>(undefined);
  readonly expanded = signal<readonly string[] | undefined>(undefined);
  readonly useTemplate = signal(false);
  readonly bar = viewChild.required(OgePanelBar);
  readonly log: string[] = [];
  readonly changes: OgePanelBarSelectionChangedEvent[] = [];
  vetoKey: string | null = null;

  onExpanding(event: OgePanelBarItemExpandingEvent): void {
    this.log.push('expanding:' + event.key);
    if (event.key === this.vetoKey) event.cancel = true;
  }
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgePanelBar', () => {
  let fixture: ComponentFixture<PanelBarHost>;
  let host: PanelBarHost;
  let el: HTMLElement;

  const header = (id: string) =>
    el.querySelector(`[data-node-id="${id}"]`) as HTMLButtonElement;
  const press = (id: string, key: string) =>
    header(id).dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );

  beforeEach(async () => {
    fixture = TestBed.createComponent(PanelBarHost);
    host = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
    await settle(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    el.remove();
  });

  it('renders the disclosure pattern with nested groups', () => {
    const mail = header('mail');
    expect(mail.getAttribute('aria-expanded')).toBe('true');
    const panel = document.getElementById(
      mail.getAttribute('aria-controls') as string,
    );
    expect(panel?.contains(header('inbox'))).toBe(true);
    // leaves are plain buttons — no aria-expanded
    expect(header('inbox').hasAttribute('aria-expanded')).toBe(false);
    expect(el.querySelector('.oge-panel-bar-badge')?.textContent).toBe('4');
    expect(header('sent').getAttribute('aria-disabled')).toBe('true');
    expect(header('sent').tabIndex).toBe(-1);
    expect(el.querySelector('[role="tree"], [role="treeitem"]')).toBeNull();
  });

  it('seeds expandedKeys from the items and defers collapsed groups', () => {
    expect(host.expanded()).toEqual(['mail']);
    // the collapsed group's children are not rendered yet
    expect(header('archive')).toBeNull();
    const projects = document.getElementById(
      header('projects').getAttribute('aria-controls') as string,
    );
    expect(projects?.hasAttribute('inert')).toBe(true);
  });

  it('expands on click, renders the children and keeps them', async () => {
    header('projects').click();
    await settle(fixture);
    expect(header('projects').getAttribute('aria-expanded')).toBe('true');
    expect(header('archive')).not.toBeNull();
    expect(host.expanded()).toEqual(['mail', 'projects']);
    header('projects').click();
    await settle(fixture);
    expect(header('archive')).not.toBeNull();
    expect(host.log).toEqual([
      'expanding:projects',
      'expanded:projects',
      'collapsed:projects',
    ]);
  });

  it('single mode collapses the open sibling', async () => {
    host.mode.set('single');
    await settle(fixture);
    header('projects').click();
    await settle(fixture);
    expect(header('mail').getAttribute('aria-expanded')).toBe('false');
    expect(host.log).toContain('collapsed:mail');
    expect(host.expanded()).toEqual(['projects']);
  });

  it('a canceled itemExpanding keeps the group closed', async () => {
    host.vetoKey = 'projects';
    header('projects').click();
    await settle(fixture);
    expect(header('projects').getAttribute('aria-expanded')).toBe('false');
  });

  it('selects leaves with aria-current and reports the change', async () => {
    header('inbox').click();
    await settle(fixture);
    expect(host.selected()).toBe('inbox');
    expect(header('inbox').getAttribute('aria-current')).toBe('true');
    header('drafts').click();
    await settle(fixture);
    expect(header('inbox').hasAttribute('aria-current')).toBe(false);
    expect(host.changes.map((c) => [c.key, c.previousKey])).toEqual([
      ['inbox', undefined],
      ['drafts', 'inbox'],
    ]);
    // disabled leaves never select
    header('sent').click();
    await settle(fixture);
    expect(host.selected()).toBe('drafts');
  });

  it('a consumer expandedKeys write drives the state', async () => {
    host.expanded.set(['projects']);
    await settle(fixture);
    expect(header('mail').getAttribute('aria-expanded')).toBe('false');
    expect(header('projects').getAttribute('aria-expanded')).toBe('true');
  });

  it('renders content items as text or through the template', async () => {
    header('about').click();
    await settle(fixture);
    expect(
      el.querySelector('.oge-panel-bar-content')?.textContent?.trim(),
    ).toBe('Version 1');
    host.useTemplate.set(true);
    await settle(fixture);
    expect(el.querySelector('.oge-panel-bar-content .tpl')?.textContent).toBe(
      'tpl about',
    );
  });

  it('arrow keys move focus over rendered, enabled headers', async () => {
    header('inbox').focus();
    press('inbox', 'ArrowDown');
    expect(document.activeElement).toBe(header('drafts'));
    press('drafts', 'ArrowUp');
    expect(document.activeElement).toBe(header('inbox'));
    press('inbox', 'End');
    expect(document.activeElement).toBe(header('about'));
    press('about', 'Home');
    expect(document.activeElement).toBe(header('mail'));
  });

  it('Right expands then enters, Left collapses then goes to the parent', async () => {
    header('projects').focus();
    press('projects', 'ArrowRight');
    await settle(fixture);
    expect(header('projects').getAttribute('aria-expanded')).toBe('true');
    press('projects', 'ArrowRight');
    expect(document.activeElement).toBe(header('archive'));
    press('archive', 'ArrowLeft');
    expect(document.activeElement).toBe(header('projects'));
    press('projects', 'ArrowLeft');
    await settle(fixture);
    expect(header('projects').getAttribute('aria-expanded')).toBe('false');
  });

  it('collapsing a group that holds focus hands it to the header', async () => {
    header('inbox').focus();
    await host.bar().collapse('mail');
    await settle(fixture);
    expect(document.activeElement).toBe(header('mail'));
  });

  it('expandAll / collapseAll and the methods', async () => {
    host.bar().expandAll();
    await settle(fixture);
    expect(host.bar().isExpanded('archive')).toBe(true);
    host.bar().collapseAll();
    await settle(fixture);
    expect(host.expanded()).toEqual([]);
    await host.bar().toggle('about');
    expect(host.bar().isExpanded('about')).toBe(true);
    await expect(host.bar().expand('nope')).resolves.toBe(false);
  });

  it('shows the empty text without items', async () => {
    host.items.set([]);
    await settle(fixture);
    expect(el.querySelector('.oge-panel-bar-empty')?.textContent).toBe(
      'No sections to display',
    );
  });
});
