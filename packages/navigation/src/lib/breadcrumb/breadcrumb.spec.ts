import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeBreadcrumb } from './breadcrumb';
import { OgeBreadcrumbItem } from './breadcrumb-item';
import { provideOgeBreadcrumbConfig } from './config';
import type {
  OgeBreadcrumbItemClickEvent,
  OgeBreadcrumbItemData,
} from './breadcrumb-types';

const TRAIL: readonly OgeBreadcrumbItemData[] = [
  { text: 'Home', key: 'home', url: '/' },
  { text: 'Products', key: 'products', url: '/products' },
  { text: 'Archived', key: 'archived', disabled: true },
  { text: 'Keyboards', key: 'keyboards' },
];

@Component({
  imports: [OgeBreadcrumb],
  template: `<oge-breadcrumb [items]="items()" (itemClick)="clicks.push($event)" />`,
})
class BreadcrumbHost {
  readonly items = signal<readonly OgeBreadcrumbItemData[]>(TRAIL);
  readonly crumb = viewChild.required(OgeBreadcrumb);
  readonly clicks: OgeBreadcrumbItemClickEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeBreadcrumb', () => {
  async function render() {
    const fixture = TestBed.createComponent(BreadcrumbHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      crumbs: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-breadcrumb-item')),
    };
  }

  it('renders the trail in order with the last crumb non-interactive', async () => {
    const { crumbs } = await render();
    const all = crumbs();
    expect(all.map((c) => c.textContent?.trim())).toEqual([
      'Home',
      'Products',
      'Archived',
      'Keyboards',
    ]);
    expect(all[0].tagName).toBe('A');
    expect(all[0].getAttribute('href')).toBe('/');
    expect(all[3].tagName).toBe('SPAN'); // the current page is never a link
  });

  it('emits itemClick with item, key and index — never for last or disabled', async () => {
    const { host, crumbs } = await render();
    const all = crumbs();
    all[0].addEventListener('click', (e) => e.preventDefault()); // no jsdom nav
    all[0].dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }),
    );
    expect(host.clicks).toHaveLength(1);
    expect(host.clicks[0].key).toBe('home');
    expect(host.clicks[0].index).toBe(0);

    all[2].dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    all[3].dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(host.clicks).toHaveLength(1); // disabled and last stayed silent
  });

  it('a url-less middle crumb renders as a button and still clicks', async () => {
    const { fixture, host, crumbs } = await render();
    host.items.set([
      { text: 'Root', url: '/' },
      { text: 'Command', key: 'cmd' },
      { text: 'Here' },
    ]);
    await settle(fixture);
    const middle = crumbs()[1];
    expect(middle.tagName).toBe('BUTTON');
    middle.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(host.clicks.map((c) => c.key)).toEqual(['cmd']);
  });

  it('items with visible: false disappear', async () => {
    const { fixture, host, crumbs } = await render();
    host.items.set([
      { text: 'A', url: '/' },
      { text: 'Hidden', visible: false },
      { text: 'B' },
    ]);
    await settle(fixture);
    expect(crumbs().map((c) => c.textContent?.trim())).toEqual(['A', 'B']);
  });
});

@Component({
  imports: [OgeBreadcrumb, OgeBreadcrumbItem],
  template: `
    <oge-breadcrumb [items]="items">
      <oge-breadcrumb-item text="Home" key="home" url="/" />
      <oge-breadcrumb-item text="Hidden" [visible]="false" />
    </oge-breadcrumb>
  `,
})
class DeclarativeHost {
  readonly items: readonly OgeBreadcrumbItemData[] = [
    { text: 'Data', key: 'd' },
  ];
}

describe('OgeBreadcrumb — declarative children', () => {
  it('merges declarative children first, then the items input', async () => {
    const fixture = TestBed.createComponent(DeclarativeHost);
    await settle(fixture);
    const texts = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.oge-breadcrumb-item-text',
      ),
    ).map((el) => el.textContent?.trim());
    expect(texts).toEqual(['Home', 'Data']);
    fixture.destroy();
  });
});

describe('OgeBreadcrumb — config', () => {
  it('provideOgeBreadcrumbConfig overrides messages', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeBreadcrumbConfig({
          messages: { breadcrumb: 'İçerik haritası' },
        }),
      ],
    });
    const fixture = TestBed.createComponent(BreadcrumbHost);
    await settle(fixture);
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav');
    expect(nav?.getAttribute('aria-label')).toBe('İçerik haritası');
    fixture.destroy();
  });
});
