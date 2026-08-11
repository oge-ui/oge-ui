import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgePagination } from './pagination';

@Component({
  imports: [OgePagination],
  template: `
    <oge-pagination
      [(pageIndex)]="pageIndex"
      [itemCount]="400"
      [pageSize]="20"
      [pageSizes]="[10, 20, 'all']"
      [showInfo]="true"
      [showFirstLastButtons]="true"
      [showJumpToPageInput]="true"
    />
  `,
})
class Host {
  readonly pageIndex = signal(10);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgePagination a11y composition', () => {
  it('renders a labeled nav landmark', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const nav = fixture.nativeElement.querySelector('nav.oge-pagination-nav');
    expect(nav).toBeTruthy();
    expect(nav.getAttribute('aria-label')).toBe('Pagination');
  });

  it('exactly one aria-current="page" that follows clicks', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const current = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('[aria-current="page"]'),
      ) as HTMLElement[];
    expect(current().length).toBe(1);
    expect(current()[0].textContent?.trim()).toBe('11');
    const target = Array.from(
      fixture.nativeElement.querySelectorAll('.oge-pagination-page'),
    ).find((b) => (b as HTMLElement).textContent?.trim() === '12') as
      HTMLButtonElement | undefined;
    target?.click();
    await settle(fixture);
    expect(current().length).toBe(1);
    expect(current()[0].textContent?.trim()).toBe('12');
  });

  it('every icon button and numeric button carries an accessible name', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.oge-pagination-btn'),
    ) as HTMLButtonElement[];
    for (const button of buttons) {
      const name =
        button.getAttribute('aria-label') || button.textContent?.trim();
      expect(name, button.outerHTML).toBeTruthy();
    }
    // icon buttons additionally mirror the label as a hover tooltip (dx hint)
    const iconButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.oge-pagination-nav-btn'),
    ) as HTMLButtonElement[];
    for (const button of iconButtons) {
      expect(button.getAttribute('title')).toBe(
        button.getAttribute('aria-label'),
      );
    }
    // numeric buttons announce "Page N"
    const page = fixture.nativeElement.querySelector(
      '.oge-pagination-current',
    ) as HTMLElement;
    expect(page.getAttribute('aria-label')).toBe('Page 11');
  });

  it('the ellipsis is a non-interactive aria-hidden span', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const ellipses = Array.from(
      fixture.nativeElement.querySelectorAll('.oge-pagination-ellipsis'),
    ) as HTMLElement[];
    expect(ellipses.length).toBe(2);
    for (const ellipsis of ellipses) {
      expect(ellipsis.tagName).toBe('SPAN');
      expect(ellipsis.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('the info range lives in an aria-live region', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const info = fixture.nativeElement.querySelector(
      '.oge-pagination-info',
    ) as HTMLElement;
    expect(info.getAttribute('aria-live')).toBe('polite');
  });

  it('select and jump input have visible label association', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const sizes = fixture.nativeElement.querySelector(
      'label.oge-pagination-sizes',
    ) as HTMLLabelElement;
    expect(sizes.querySelector('select')).toBeTruthy();
    expect(sizes.textContent).toContain('Items per page');
    const jump = fixture.nativeElement.querySelector(
      'label.oge-pagination-jump',
    ) as HTMLLabelElement;
    expect(jump.querySelector('input')).toBeTruthy();
    expect(jump.textContent).toContain('Go to page');
  });
});
