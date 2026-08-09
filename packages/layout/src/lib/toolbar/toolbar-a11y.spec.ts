import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeToolbar } from './toolbar';
import { provideOgeToolbarConfig } from './config';
import type { OgeToolbarItemData } from './toolbar-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeToolbar],
  template: `
    <h2 id="bar-label">Document actions</h2>
    <oge-toolbar
      [items]="items()"
      [ariaLabel]="ariaLabel()"
      [ariaLabelledBy]="ariaLabelledBy()"
      [messages]="messages()"
      [disabled]="disabled()"
    />
  `,
})
class A11yHost {
  readonly items = signal<readonly OgeToolbarItemData[]>([
    { key: 'a', text: 'A' },
    { key: 's', type: 'separator' },
    { key: 'b', text: 'B' },
  ]);
  readonly ariaLabel = signal<string | undefined>(undefined);
  readonly ariaLabelledBy = signal<string | undefined>(undefined);
  readonly messages = signal<Record<string, string> | undefined>(undefined);
  readonly disabled = signal(false);
}

async function render(setup?: (host: A11yHost) => void) {
  const fixture = TestBed.createComponent(A11yHost);
  setup?.(fixture.componentInstance);
  await settle(fixture);
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    el,
    bar: el.querySelector('.oge-toolbar') as HTMLElement,
  };
}

describe('OgeToolbar accessibility', () => {
  it('is a labelled role="toolbar"', async () => {
    const { bar } = await render();
    expect(bar.getAttribute('role')).toBe('toolbar');
    // horizontal is the ARIA default and is deliberately not written out
    expect(bar.getAttribute('aria-orientation')).toBeNull();
    expect(bar.getAttribute('aria-label')).toBe('Toolbar');
  });

  it('prefers ariaLabel, and ariaLabelledBy over that', async () => {
    const { fixture, host, bar } = await render((h) =>
      h.ariaLabel.set('Formatting'),
    );
    expect(bar.getAttribute('aria-label')).toBe('Formatting');

    host.ariaLabelledBy.set('bar-label');
    await settle(fixture);
    expect(bar.getAttribute('aria-labelledby')).toBe('bar-label');
    expect(bar.getAttribute('aria-label')).toBeNull();
  });

  it('renders separators with a cross-axis aria-orientation', async () => {
    const { el } = await render();
    const separator = el.querySelector('.oge-toolbar-separator') as HTMLElement;
    expect(separator.getAttribute('role')).toBe('separator');
    // a separator in a horizontal toolbar is drawn vertically
    expect(separator.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('marks the whole toolbar aria-disabled', async () => {
    const { bar } = await render((h) => h.disabled.set(true));
    expect(bar.getAttribute('aria-disabled')).toBe('true');
  });

  it('takes every string from the messages interface', async () => {
    const { bar } = await render((h) =>
      h.messages.set({ toolbar: 'Araç çubuğu' }),
    );
    expect(bar.getAttribute('aria-label')).toBe('Araç çubuğu');
  });

  it('takes strings from provideOgeToolbarConfig', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideOgeToolbarConfig({
          size: 'sm',
          messages: { toolbar: 'Komutlar', overflowMenu: 'Daha fazla' },
        }),
      ],
    });
    const { bar, el } = await render((h) =>
      h.items.set([{ key: 'b', text: 'B', locateInMenu: 'always' }]),
    );
    expect(bar.getAttribute('aria-label')).toBe('Komutlar');
    expect(bar.classList.contains('oge-toolbar-sm')).toBe(true);
    expect(
      el.querySelector('.oge-toolbar-menu-btn')?.getAttribute('aria-label'),
    ).toBe('Daha fazla');
  });
});
