import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { resetScrollLockForTests } from '@oge-ui/behavior';
import { OgeMenuList } from './menu/menu-list';
import type { OgeMenuItem } from './menu/menu-types';
import { OgeModal } from './modal/modal';
import { OgeModalService } from './modal/modal-service';

const PAYLOAD = '<img src=x onerror="alert(1)">';

@Component({
  imports: [OgeMenuList, OgeModal],
  template: `
    <oge-menu-list [items]="items()" ariaLabel="Actions" />
    <oge-modal [opened]="true" [title]="title" />
  `,
})
class Host {
  readonly title = PAYLOAD;
  readonly items = signal<readonly OgeMenuItem[]>([
    { text: PAYLOAD },
    { text: 'Script link', url: 'javascript:alert(1)' },
    { text: 'Safe link', url: 'https://example.com/a' },
  ]);
}

describe('untrusted strings stay plain text', () => {
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

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders a menu item text as text, never markup', async () => {
    const el = await render();
    const menu = el.querySelector('.oge-menu-list') as HTMLElement;
    expect(menu.querySelector('img')).toBeNull();
    expect(menu.textContent).toContain(PAYLOAD);
  });

  it('neutralizes a javascript: menu url and keeps a safe one', async () => {
    const el = await render();
    const links = Array.from(
      el.querySelectorAll<HTMLAnchorElement>('a.oge-menu-item'),
    ).map((link) => link.getAttribute('href') ?? '');
    expect(links[0]).not.toMatch(/^\s*javascript:/i);
    expect(links[1]).toBe('https://example.com/a');
  });

  it('renders a modal title as text, never markup', async () => {
    const el = await render();
    const title = el.querySelector('.oge-modal-title') as HTMLElement;
    expect(title.querySelector('img')).toBeNull();
    expect(title.textContent).toContain(PAYLOAD);
  });

  it('renders a confirm message as text, never markup', async () => {
    void TestBed.inject(OgeModalService).confirm({ message: PAYLOAD });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const modal = document.querySelector('.oge-modal') as HTMLElement;
    expect(modal.querySelector('img')).toBeNull();
    expect(modal.textContent).toContain(PAYLOAD);
  });
});
