import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeToolbar } from './toolbar';
import type {
  OgeToolbarDisplayMode,
  OgeToolbarItemData,
  OgeToolbarItemLocation,
  OgeToolbarItemSeverity,
  OgeToolbarItemType,
  OgeToolbarOrientation,
  OgeToolbarOverflow,
  OgeToolbarSize,
  OgeToolbarStylingMode,
} from './toolbar-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeToolbar],
  template: `
    <oge-toolbar
      [items]="items()"
      [size]="size()"
      [stylingMode]="stylingMode()"
      [orientation]="orientation()"
      [overflow]="overflow()"
      [showText]="showText()"
      [showIcon]="showIcon()"
    />
  `,
})
class ParityHost {
  readonly items = signal<readonly OgeToolbarItemData[]>([
    { key: 'a', text: 'A', icon: 'M2 2h12' },
  ]);
  readonly size = signal<OgeToolbarSize>('md');
  readonly stylingMode = signal<OgeToolbarStylingMode>('outlined');
  readonly orientation = signal<OgeToolbarOrientation>('horizontal');
  readonly overflow = signal<OgeToolbarOverflow>('menu');
  readonly showText = signal<OgeToolbarDisplayMode>('always');
  readonly showIcon = signal<OgeToolbarDisplayMode>('always');
}

/**
 * Every value of every declared string union has to actually render
 * something — a union member nobody exercises is a documentation lie.
 */
describe('OgeToolbar string-union parity', () => {
  async function render(setup?: (host: ParityHost) => void) {
    const fixture = TestBed.createComponent(ParityHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    return {
      fixture,
      host: fixture.componentInstance,
      bar: (fixture.nativeElement as HTMLElement).querySelector(
        '.oge-toolbar',
      ) as HTMLElement,
      el: fixture.nativeElement as HTMLElement,
    };
  }

  it('size: sm | md | lg', async () => {
    const expected: Record<OgeToolbarSize, string | null> = {
      sm: 'oge-toolbar-sm',
      md: null,
      lg: 'oge-toolbar-lg',
    };
    const { fixture, host, bar } = await render();
    for (const [value, cls] of Object.entries(expected)) {
      host.size.set(value as OgeToolbarSize);
      await settle(fixture);
      expect(bar.classList.contains('oge-toolbar-sm')).toBe(
        cls === 'oge-toolbar-sm',
      );
      expect(bar.classList.contains('oge-toolbar-lg')).toBe(
        cls === 'oge-toolbar-lg',
      );
    }
  });

  it('stylingMode: outlined | filled | flat', async () => {
    const { fixture, host, bar } = await render();
    const modes: OgeToolbarStylingMode[] = ['outlined', 'filled', 'flat'];
    for (const mode of modes) {
      host.stylingMode.set(mode);
      await settle(fixture);
      expect(bar.classList.contains('oge-toolbar-filled')).toBe(
        mode === 'filled',
      );
      expect(bar.classList.contains('oge-toolbar-flat')).toBe(mode === 'flat');
    }
  });

  it('orientation: horizontal | vertical', async () => {
    const { fixture, host, bar } = await render();
    expect(bar.classList.contains('oge-toolbar-vertical')).toBe(false);
    expect(bar.getAttribute('aria-orientation')).toBeNull();

    host.orientation.set('vertical');
    await settle(fixture);
    expect(bar.classList.contains('oge-toolbar-vertical')).toBe(true);
    expect(bar.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('overflow: menu | wrap | none', async () => {
    const { fixture, host, bar, el } = await render((h) =>
      h.items.set([{ key: 'a', text: 'A', locateInMenu: 'always' }]),
    );
    expect(el.querySelector('.oge-toolbar-menu-btn')).not.toBeNull();

    host.overflow.set('wrap');
    await settle(fixture);
    expect(bar.classList.contains('oge-toolbar-wrap')).toBe(true);
    expect(el.querySelector('.oge-toolbar-menu-btn')).toBeNull();

    host.overflow.set('none');
    await settle(fixture);
    expect(bar.classList.contains('oge-toolbar-wrap')).toBe(false);
    expect(el.querySelector('.oge-toolbar-menu-btn')).toBeNull();
  });

  it('showText / showIcon: always | inMenu | never', async () => {
    const { fixture, host, el } = await render();
    const modes: OgeToolbarDisplayMode[] = ['always', 'inMenu', 'never'];
    for (const mode of modes) {
      host.showText.set(mode);
      host.showIcon.set(mode);
      await settle(fixture);
      const visible = mode === 'always';
      expect(el.querySelector('.oge-toolbar-btn-text') !== null).toBe(visible);
      expect(el.querySelector('svg path') !== null).toBe(visible);
      // an icon-only button never loses its accessible name
      expect(
        el.querySelector('.oge-toolbar-btn')?.getAttribute('aria-label'),
      ).toBe(visible ? null : 'A');
    }
  });

  it('item type: button | separator | spacer | label', async () => {
    const expected: Record<OgeToolbarItemType, string> = {
      button: '.oge-toolbar-btn',
      separator: '.oge-toolbar-separator',
      spacer: '.oge-toolbar-gap',
      label: '.oge-toolbar-label',
    };
    const { fixture, host, el } = await render();
    for (const [type, selector] of Object.entries(expected)) {
      host.items.set([
        { key: 'x', type: type as OgeToolbarItemType, text: 'A' },
      ]);
      await settle(fixture);
      expect(el.querySelector(selector), type).not.toBeNull();
    }
  });

  it('item location: before | center | after', async () => {
    const locations: OgeToolbarItemLocation[] = ['before', 'center', 'after'];
    const { fixture, host, el } = await render();
    for (const location of locations) {
      host.items.set([{ key: 'x', text: 'A', location }]);
      await settle(fixture);
      expect(
        el.querySelector(`.oge-toolbar-section-${location} .oge-toolbar-btn`),
        location,
      ).not.toBeNull();
    }
  });

  it('item severity: default | accent | danger', async () => {
    const expected: Record<OgeToolbarItemSeverity, string | null> = {
      default: null,
      accent: 'oge-toolbar-btn-accent',
      danger: 'oge-toolbar-btn-danger',
    };
    const { fixture, host, el } = await render();
    for (const [severity, cls] of Object.entries(expected)) {
      host.items.set([
        { key: 'x', text: 'A', severity: severity as OgeToolbarItemSeverity },
      ]);
      await settle(fixture);
      const btn = el.querySelector('.oge-toolbar-btn') as HTMLElement;
      expect(btn.classList.contains('oge-toolbar-btn-accent')).toBe(
        cls === 'oge-toolbar-btn-accent',
      );
      expect(btn.classList.contains('oge-toolbar-btn-danger')).toBe(
        cls === 'oge-toolbar-btn-danger',
      );
    }
  });
});
