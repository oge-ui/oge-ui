import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { OgeListBoxItemTemplate } from '@oge-ui/inputs/list-box';
import { OgeTransferList } from './transfer-list';
import type {
  OgeTransferListMovedEvent,
  OgeTransferListMovingEvent,
} from './transfer-list-types';

interface Perm {
  id: string;
  name: string;
  locked?: boolean;
}

const PERMS: Perm[] = [
  { id: 'read', name: 'Read' },
  { id: 'write', name: 'Write' },
  { id: 'admin', name: 'Admin', locked: true },
  { id: 'share', name: 'Share' },
];

@Component({
  imports: [OgeTransferList, OgeListBoxItemTemplate],
  template: `
    <oge-transfer-list
      label="Permissions"
      [items]="items"
      displayExpr="name"
      valueExpr="id"
      disabledExpr="locked"
      targetTitle="Granted"
      [searchEnabled]="true"
      [(value)]="value"
      (moving)="onMoving($event)"
      (moved)="moves.push($event)"
    >
      <ng-template ogeListBoxItemTemplate let-perm>
        <span class="perm">{{ perm.name }}</span>
      </ng-template>
    </oge-transfer-list>
  `,
})
class Host {
  readonly items = PERMS;
  readonly value = signal<readonly unknown[]>(['share']);
  readonly veto = signal(false);
  readonly moves: OgeTransferListMovedEvent<Perm>[] = [];
  onMoving(event: OgeTransferListMovingEvent<Perm>): void {
    if (this.veto()) event.cancel = true;
  }
}

@Component({
  imports: [OgeTransferList, ReactiveFormsModule],
  template: `<oge-transfer-list
    [items]="items"
    displayExpr="name"
    valueExpr="id"
    [formControl]="control"
  />`,
})
class FormHost {
  readonly items = PERMS;
  readonly control = new FormControl<string[]>([]);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const pane = (f: ComponentFixture<unknown>, side: 'source' | 'target') =>
  f.nativeElement.querySelector(
    `[data-oge-transfer-side="${side}"]`,
  ) as HTMLElement;
const texts = (f: ComponentFixture<unknown>, side: 'source' | 'target') =>
  Array.from(pane(f, side).querySelectorAll('[role="option"]')).map((o) =>
    o.textContent?.trim(),
  );
const option = (
  f: ComponentFixture<unknown>,
  side: 'source' | 'target',
  index: number,
) => pane(f, side).querySelectorAll<HTMLElement>('[role="option"]')[index];
const buttons = (f: ComponentFixture<unknown>) =>
  Array.from(
    f.nativeElement.querySelectorAll('.oge-transfer-list-action'),
  ) as HTMLButtonElement[];

function pointer(type: string, target: Element, x: number, y: number): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  target.dispatchEvent(event);
}

describe('OgeTransferList', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('splits the items into two named lists with counts', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    expect(texts(f, 'source')).toEqual(['Read', 'Write', 'Admin']);
    expect(texts(f, 'target')).toEqual(['Share']);
    const titles = f.nativeElement.querySelectorAll('.oge-transfer-list-title');
    expect(titles[0].textContent.trim()).toBe('Available');
    expect(titles[1].textContent.trim()).toBe('Granted');
    const source = pane(f, 'source').querySelector('[role="listbox"]')!;
    expect(source.getAttribute('aria-labelledby')).toBe(titles[0].id);
    expect(source.getAttribute('aria-keyshortcuts')).toBe(
      'Control+ArrowRight Control+Shift+ArrowRight',
    );
    expect(
      f.nativeElement
        .querySelector('.oge-transfer-list-count')
        .textContent.trim(),
    ).toBe('3 items');
    expect(f.nativeElement.querySelector('.perm')).not.toBeNull();
  });

  it('buttons move the selection and everything movable, then announce', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    const [addSelected, addAll, removeSelected, removeAll] = buttons(f);
    expect(addSelected.disabled).toBe(true);
    expect(removeAll.disabled).toBe(false);
    option(f, 'source', 1).click();
    await settle(f);
    expect(addSelected.disabled).toBe(false);
    addSelected.click();
    await settle(f);
    expect(f.componentInstance.value()).toEqual(['share', 'write']);
    expect(texts(f, 'target')).toEqual(['Share', 'Write']);
    expect(f.componentInstance.moves.at(-1)).toMatchObject({
      values: ['write'],
      from: 'source',
      to: 'target',
      cause: 'button',
    });
    // the moved items stay selected on their new side
    expect(option(f, 'target', 1).getAttribute('aria-selected')).toBe('true');
    expect(removeSelected.disabled).toBe(false);
    addAll.click();
    await settle(f);
    // Admin is locked — it stays
    expect(f.componentInstance.value()).toEqual(['share', 'write', 'read']);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const region = document.querySelector('[data-oge-live-announcer="polite"]');
    expect(region?.textContent).toContain('moved to Granted');
    removeAll.click();
    await settle(f);
    expect(f.componentInstance.value()).toEqual([]);
  });

  it('a vetoed moving event leaves the value untouched', async () => {
    const f = TestBed.createComponent(Host);
    f.componentInstance.veto.set(true);
    await settle(f);
    buttons(f)[1].click();
    await settle(f);
    expect(f.componentInstance.value()).toEqual(['share']);
    expect(f.componentInstance.moves.length).toBe(0);
  });

  it('Ctrl+ArrowRight on the focused source list moves its selection', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    const list = pane(f, 'source').querySelector<HTMLElement>(
      '[role="listbox"]',
    )!;
    list.focus();
    list.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
    );
    await settle(f);
    list.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle(f);
    expect(f.componentInstance.value()).toEqual(['share', 'read']);
    expect(f.componentInstance.moves.at(-1)?.cause).toBe('keyboard');
    const target = pane(f, 'target').querySelector<HTMLElement>(
      '[role="listbox"]',
    )!;
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
    await settle(f);
    expect(f.componentInstance.value()).toEqual([]);
  });

  it('dragging an option onto the other list runs the same move', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    const source = option(f, 'source', 0);
    const targetList = pane(f, 'target').querySelector('[role="listbox"]')!;
    pointer('pointerdown', source, 10, 10);
    pointer('pointermove', targetList, 60, 10);
    pointer('pointermove', targetList, 80, 12);
    await settle(f);
    expect(pane(f, 'target').classList).toContain(
      'oge-transfer-list-pane-drop',
    );
    pointer('pointerup', targetList, 80, 12);
    await settle(f);
    expect(f.componentInstance.value()).toEqual(['share', 'read']);
    expect(f.componentInstance.moves.at(-1)?.cause).toBe('drag');
    expect(pane(f, 'target').classList).not.toContain(
      'oge-transfer-list-pane-drop',
    );
    // a drop swallows the follow-up click until the next task
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('the buttons follow the search-filtered view', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    const [addSelected, addAll] = buttons(f);
    option(f, 'source', 1).click(); // Write
    await settle(f);
    expect(addSelected.disabled).toBe(false);
    const search = pane(f, 'source').querySelector<HTMLInputElement>(
      '.oge-list-box-search-input',
    )!;
    // only Read is shown: the selected Write is filtered out
    search.value = 'rea';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(f);
    expect(texts(f, 'source')).toEqual(['Read']);
    expect(addSelected.disabled).toBe(true);
    expect(addAll.disabled).toBe(false);
    // only the locked Admin is shown: nothing movable
    search.value = 'adm';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(f);
    expect(addAll.disabled).toBe(true);
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(f);
    expect(addSelected.disabled).toBe(false);
    expect(addAll.disabled).toBe(false);
  });

  it('binds reactive forms', async () => {
    const f = TestBed.createComponent(FormHost);
    await settle(f);
    f.componentInstance.control.setValue(['admin', 'read']);
    await settle(f);
    expect(texts(f, 'target')).toEqual(['Admin', 'Read']);
    buttons(f)[3].click();
    await settle(f);
    expect(f.componentInstance.control.value).toEqual([]);
    expect(f.componentInstance.control.dirty).toBe(true);
  });
});
