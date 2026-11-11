import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  resetScrollLockForTests,
  type OgeMenuItem,
  type OgeModalCloseBlockedEvent,
} from '@oge-ui/behavior';
import { OgeMenuList } from '../menu/menu-list';
import type { OgeMenuListItemClickEvent } from '../menu/menu-types';
import { OgeModal } from './modal';
import { OgeModalService } from './modal-service';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

@Component({
  imports: [OgeModal],
  template: `
    <oge-modal
      [(opened)]="opened"
      title="Edit"
      [busy]="busy()"
      [loading]="loading()"
      [autoFocus]="false"
      [closeGuard]="guard()"
      (closing)="cancelClosing() && ($event.cancel = true)"
      (closeBlocked)="blocked.push($event)"
    >
      <input class="first" />
    </oge-modal>
  `,
})
class ModalHost {
  readonly opened = signal(false);
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly cancelClosing = signal(false);
  readonly guard = signal<(() => boolean) | undefined>(undefined);
  readonly blocked: OgeModalCloseBlockedEvent[] = [];
  readonly modal = viewChild.required(OgeModal);
}

@Component({
  imports: [OgeMenuList],
  template: `<oge-menu-list
    [items]="items"
    (itemClick)="clicks.push($event)"
  />`,
})
class MenuHost {
  readonly items: OgeMenuItem[] = [
    { text: 'Open' },
    { text: '', separator: true },
    { text: 'Admin only', visible: false },
    { text: '', separator: true },
    { text: 'Delete', cssClass: 'menu-danger-zone', severity: 'danger' },
  ];
  readonly clicks: OgeMenuListItemClickEvent[] = [];
}

describe('Section 3: modal, confirm and menu additions', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetScrollLockForTests();
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.innerHTML = '';
  });

  async function openModal(): Promise<ComponentFixture<ModalHost>> {
    const fixture = TestBed.createComponent(ModalHost);
    await settle(fixture);
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    await flush();
    return fixture;
  }

  it('loading veils the body but still closes; autoFocus false focuses the panel', async () => {
    const fixture = await openModal();
    const host = fixture.componentInstance;
    const panel = document.querySelector('.oge-modal') as HTMLElement;
    expect(document.activeElement).toBe(panel);
    host.loading.set(true);
    await settle(fixture);
    expect(panel.getAttribute('aria-busy')).toBe('true');
    expect(document.querySelector('.oge-modal-busy-veil')).not.toBeNull();
    host.modal().close();
    await settle(fixture);
    expect(host.opened()).toBe(false);
    expect(host.blocked).toEqual([]);
  });

  it('says why a close was blocked', async () => {
    const fixture = await openModal();
    const host = fixture.componentInstance;
    const escape = () =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    host.busy.set(true);
    await settle(fixture);
    escape();
    host.busy.set(false);
    host.cancelClosing.set(true);
    await settle(fixture);
    escape();
    host.cancelClosing.set(false);
    host.guard.set(() => false);
    await settle(fixture);
    escape();
    await settle(fixture);
    expect(host.blocked).toEqual([
      { reason: 'escape', blockedBy: 'busy' },
      { reason: 'escape', blockedBy: 'closing' },
      { reason: 'escape', blockedBy: 'guard' },
    ]);
    expect(host.opened()).toBe(true);
  });

  it('confirm gates hold OK until the text is typed and the box ticked', async () => {
    const service = TestBed.inject(OgeModalService);
    const result = service.confirm({
      message: 'Delete the project?',
      details: ['12 files', '3 shared links'],
      typeToConfirm: 'acme-web',
      acknowledgeLabel: 'I understand this cannot be undone',
      severity: 'danger',
    });
    await flush();
    const panel = document.querySelector('.oge-modal') as HTMLElement;
    const describedBy = panel.getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ')).toHaveLength(2);
    expect(
      Array.from(document.querySelectorAll('.oge-dialog-details li')).map(
        (li) => li.textContent?.trim(),
      ),
    ).toEqual(['12 files', '3 shared links']);
    const ok = document.querySelector('.oge-dialog-ok') as HTMLButtonElement;
    const field = document.querySelector(
      '.oge-dialog-type-confirm',
    ) as HTMLInputElement;
    expect(document.activeElement).toBe(field);
    expect(
      document.querySelector(`label[for="${field.id}"]`)?.textContent?.trim(),
    ).toBe('Type acme-web to confirm');
    expect(ok.getAttribute('aria-disabled')).toBe('true');
    ok.click();
    field.value = 'acme-web';
    field.dispatchEvent(new Event('input'));
    await flush();
    expect(ok.getAttribute('aria-disabled')).toBe('true');
    const box = document.querySelector(
      '.oge-dialog-checkbox',
    ) as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    await flush();
    expect(ok.getAttribute('aria-disabled')).toBeNull();
    ok.click();
    await expect(result).resolves.toBe(true);
  });

  it('menu rows: hidden items and stranded separators drop, cssClass lands', async () => {
    const fixture = TestBed.createComponent(MenuHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const rows = Array.from(
      el.querySelectorAll('.oge-menu-item, .oge-menu-separator'),
    );
    expect(rows.map((row) => row.textContent?.trim() || '—')).toEqual([
      'Open',
      '—',
      'Delete',
    ]);
    const del = rows[2] as HTMLElement;
    expect(del.classList).toContain('menu-danger-zone');
    expect(del.classList).toContain('oge-menu-item');
    expect(del.classList).toContain('oge-menu-item-danger');
    del.click();
    expect(fixture.componentInstance.clicks[0]).toMatchObject({
      item: { text: 'Delete' },
      index: 2,
    });
  });
});
