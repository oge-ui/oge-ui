import { Component, signal, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { resetScrollLockForTests } from '@oge-ui/behavior';
import { provideOgeOverlayConfig } from '../config';
import { OgeActionSheet } from './action-sheet';
import { OgeActionSheetItemTemplate } from './action-sheet-templates';
import type {
  OgeActionSheetClosedEvent,
  OgeActionSheetClosingEvent,
  OgeActionSheetItem,
  OgeActionSheetItemClickEvent,
} from '@oge-ui/behavior';

const ITEMS: OgeActionSheetItem[] = [
  { key: 'share', text: 'Share', icon: 'M4 12h16' },
  { key: 'copy', text: 'Copy link', disabled: true },
  { key: 'report', text: 'Report', group: 'bottom' },
  { key: 'delete', text: 'Delete', destructive: true, description: 'Forever' },
];

@Component({
  imports: [OgeActionSheet],
  template: `
    <button id="trigger" type="button" (click)="sheet.open()">More</button>
    <oge-action-sheet
      #sheet
      [items]="items"
      [title]="title()"
      description="Choose what to do"
      [(opened)]="opened"
      (closing)="onClosing($event)"
      (closed)="closed.push($event)"
      (itemClick)="onItem($event)"
    />
  `,
})
class Host {
  readonly items = ITEMS;
  readonly title = signal<string | undefined>('Photo');
  readonly opened = signal(false);
  readonly sheet = viewChild.required(OgeActionSheet);
  readonly closed: OgeActionSheetClosedEvent[] = [];
  readonly clicks: OgeActionSheetItemClickEvent[] = [];
  veto = false;
  keepOpen = false;
  onClosing(event: OgeActionSheetClosingEvent): void {
    event.cancel = this.veto;
  }
  onItem(event: OgeActionSheetItemClickEvent): void {
    event.keepOpen = this.keepOpen;
    this.clicks.push(event);
  }
}

@Component({
  imports: [OgeActionSheet, OgeActionSheetItemTemplate],
  providers: [
    provideOgeOverlayConfig({ messages: { actionSheetCancel: 'Vazgeç' } }),
  ],
  template: `
    <oge-action-sheet [items]="items" [opened]="true">
      <p class="extra">Projected</p>
      <ng-template ogeActionSheetItemTemplate let-item let-index="index">
        <b class="custom">{{ index }}:{{ item.text }}</b>
      </ng-template>
    </oge-action-sheet>
  `,
})
class TemplateHost {
  readonly items: OgeActionSheetItem[] = [{ text: 'One' }, { text: 'Two' }];
}

async function settle<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const sheetEl = () =>
  document.body.querySelector('.oge-action-sheet') as HTMLElement | null;
const menuItems = () =>
  Array.from(
    document.body.querySelectorAll('[role="menuitem"]'),
  ) as HTMLElement[];
const key = (el: Element, k: string) =>
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }),
  );

describe('OgeActionSheet', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  beforeEach(async () => {
    resetScrollLockForTests();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0),
    );
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  async function openSheet(): Promise<{
    result: Promise<OgeActionSheetItem | null>;
  }> {
    const trigger = document.getElementById('trigger') as HTMLButtonElement;
    trigger.focus();
    const result = host.sheet().open();
    await settle(fixture);
    // wrapped: an async function would otherwise adopt the pending promise
    return { result };
  }

  it('renders nothing while closed', () => {
    expect(sheetEl()).toBeNull();
  });

  it('opens as a labelled modal dialog portaled to the body', async () => {
    await openSheet();
    const sheet = sheetEl()!;
    expect(sheet.parentElement?.parentElement).toBe(document.body);
    expect(sheet.getAttribute('role')).toBe('dialog');
    expect(sheet.getAttribute('aria-modal')).toBe('true');
    const title = sheet.querySelector('h2')!;
    expect(sheet.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.textContent?.trim()).toBe('Photo');
    expect(
      document.getElementById(sheet.getAttribute('aria-describedby')!)
        ?.textContent,
    ).toContain('Choose what to do');
    const menu = sheet.querySelector('[role="menu"]')!;
    expect(menu.getAttribute('aria-labelledby')).toBe(title.id);
    // bottom group renders after a divider
    expect(menuItems().map((i) => i.textContent?.trim())).toEqual([
      'Share',
      'Copy link',
      'DeleteForever',
      'Report',
    ]);
    expect(sheet.querySelector('[role="separator"]')).not.toBeNull();
    expect(menuItems()[2].classList).toContain(
      'oge-action-sheet-item-destructive',
    );
    expect(menuItems()[1].getAttribute('aria-disabled')).toBe('true');
    // focus moved to the first action, which owns the tab stop
    expect(document.activeElement).toBe(menuItems()[0]);
    expect(menuItems()[0].tabIndex).toBe(0);
    expect(menuItems()[2].tabIndex).toBe(-1);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('names the sheet from the messages without a title', async () => {
    host.title.set(undefined);
    await openSheet();
    expect(sheetEl()!.getAttribute('aria-label')).toBe('Actions');
    expect(
      sheetEl()!.querySelector('.oge-action-sheet-cancel')?.textContent?.trim(),
    ).toBe('Cancel');
  });

  it('runs the menu keyboard and activates with Enter', async () => {
    const { result } = await openSheet();
    key(menuItems()[0], 'ArrowDown');
    await settle(fixture);
    // Copy link is disabled but focusable; arrows skip it per the core rule
    expect(document.activeElement).toBe(menuItems()[2]);
    key(menuItems()[2], 'End');
    await settle(fixture);
    expect(document.activeElement).toBe(menuItems()[3]);
    key(menuItems()[3], 'ArrowDown');
    await settle(fixture);
    expect(document.activeElement).toBe(menuItems()[0]);
    key(menuItems()[0], 'Enter');
    await settle(fixture);
    expect(host.clicks.map((c) => c.item.key)).toEqual(['share']);
    expect(sheetEl()).toBeNull();
    expect(host.closed).toEqual([{ reason: 'action', item: ITEMS[0] }]);
    await expect(result).resolves.toBe(ITEMS[0]);
    // focus went back to the trigger
    expect(document.activeElement?.id).toBe('trigger');
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps the sheet open when itemClick sets keepOpen, ignores disabled', async () => {
    host.keepOpen = true;
    await openSheet();
    menuItems()[0].click();
    menuItems()[1].click();
    await settle(fixture);
    expect(host.clicks).toHaveLength(1);
    expect(sheetEl()).not.toBeNull();
  });

  it('closes on Escape, Cancel and the backdrop; closing can veto', async () => {
    let { result } = await openSheet();
    key(menuItems()[0], 'Escape');
    await settle(fixture);
    expect(sheetEl()).toBeNull();
    await expect(result).resolves.toBeNull();

    ({ result } = await openSheet());
    (
      sheetEl()!.querySelector('.oge-action-sheet-cancel') as HTMLElement
    ).click();
    await settle(fixture);
    expect(sheetEl()).toBeNull();

    await openSheet();
    host.veto = true;
    const layer = document.body.querySelector(
      '.oge-action-sheet-layer',
    ) as HTMLElement;
    const down = new MouseEvent('pointerdown', { bubbles: true });
    Object.defineProperty(down, 'pointerId', { value: 1 });
    layer.dispatchEvent(down);
    await settle(fixture);
    expect(sheetEl()).not.toBeNull();
    host.veto = false;
    layer.dispatchEvent(down);
    await settle(fixture);
    expect(sheetEl()).toBeNull();
    expect(host.closed.map((c) => c.reason)).toEqual([
      'escape',
      'cancel',
      'backdrop',
    ]);
  });

  it('closes on an Escape pressed before the sheet has rendered', async () => {
    const trigger = document.getElementById('trigger') as HTMLButtonElement;
    trigger.focus();
    const result = host.sheet().open();
    // no change detection yet: the layer does not exist, focus is still on
    // the trigger — the Escape is already the sheet's
    key(trigger, 'Escape');
    await settle(fixture);
    expect(sheetEl()).toBeNull();
    expect(host.opened()).toBe(false);
    await expect(result).resolves.toBeNull();
    expect(host.closed.map((c) => c.reason)).toEqual(['escape']);
    // the stack slot is released: a sheet opened afterwards works as usual
    const again = await openSheet();
    key(menuItems()[0], 'Escape');
    await settle(fixture);
    expect(sheetEl()).toBeNull();
    await expect(again.result).resolves.toBeNull();
  });

  it('opening can be vetoed and toggle closes', async () => {
    const sub = host.sheet().opening.subscribe((e) => (e.cancel = true));
    await expect(host.sheet().open()).resolves.toBeNull();
    await settle(fixture);
    expect(sheetEl()).toBeNull();
    sub.unsubscribe();
    host.sheet().toggle();
    await settle(fixture);
    expect(sheetEl()).not.toBeNull();
    host.sheet().toggle();
    await settle(fixture);
    expect(sheetEl()).toBeNull();
    expect(host.opened()).toBe(false);
  });
});

describe('OgeActionSheet templates', () => {
  it('renders projected content, the item template and config messages', async () => {
    const fixture = TestBed.createComponent(TemplateHost);
    await settle(fixture);
    expect(document.body.querySelector('.extra')?.textContent).toBe(
      'Projected',
    );
    expect(
      Array.from(document.body.querySelectorAll('.custom')).map(
        (el) => el.textContent,
      ),
    ).toEqual(['0:One', '1:Two']);
    expect(
      document.body
        .querySelector('.oge-action-sheet-cancel')
        ?.textContent?.trim(),
    ).toBe('Vazgeç');
    fixture.destroy();
    expect(document.body.querySelector('.oge-action-sheet')).toBeNull();
  });
});
