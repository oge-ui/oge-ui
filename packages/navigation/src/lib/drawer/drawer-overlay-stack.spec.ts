import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeAnchoredPanel, OgePopup } from '@oge-ui/overlay';
import { OgeDrawer } from './drawer';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function escape(): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
}

/**
 * A drawer opens a popup from inside itself — the case that decides whether
 * the shared Escape stack was worth exporting from `@oge-ui/overlay`. With two
 * competing stacks each surface believes it is topmost, and Escape closes the
 * drawer out from under the popup instead of closing the popup.
 */
@Component({
  imports: [OgeDrawer, OgePopup],
  template: `
    <oge-drawer
      [(opened)]="drawerOpen"
      [scrollLock]="false"
      [inertBackground]="false"
    >
      <div ogeDrawerPanel>
        <button type="button" #anchor (click)="openPopup()">Filters</button>
        @if (popupOpen()) {
          <oge-popup [panel]="panel">
            <button type="button" id="in-popup">Apply</button>
          </oge-popup>
        }
      </div>
      <main>content</main>
    </oge-drawer>
  `,
})
class StackHost {
  readonly drawer = viewChild.required(OgeDrawer);
  readonly anchor = viewChild.required<ElementRef<HTMLElement>>('anchor');
  readonly popupEl = viewChild(OgePopup, { read: ElementRef });

  readonly drawerOpen = signal(false);
  readonly popupOpen = signal(false);

  readonly panel = new OgeAnchoredPanel({
    anchor: () => this.anchor().nativeElement,
    panel: () => this.popupEl()?.nativeElement ?? null,
    onClosed: () => this.popupOpen.set(false),
  });

  openPopup(): void {
    this.popupOpen.set(true);
    this.panel.open();
  }
}

describe('OgeDrawer — shared overlay stack', () => {
  // The anchored panel measures on animation frames; a synchronous stub
  // re-enters Angular's render scheduler mid-tick and produces bogus NG0100.
  let rafSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        setTimeout(() => cb(0), 0);
        return 0;
      });
  });
  afterEach(() => rafSpy.mockRestore());

  it('Escape closes a popup opened inside the drawer before the drawer', async () => {
    const fixture = TestBed.createComponent(StackHost);
    const host = fixture.componentInstance;
    host.drawerOpen.set(true);
    await settle(fixture);
    expect(host.drawerOpen()).toBe(true);

    host.openPopup();
    await settle(fixture);
    expect(host.popupOpen()).toBe(true);

    escape();
    await settle(fixture);

    // the popup is topmost, so it goes first and the drawer stays open
    expect(host.popupOpen()).toBe(false);
    expect(host.drawerOpen()).toBe(true);

    escape();
    await settle(fixture);

    // now the drawer is topmost
    expect(host.drawerOpen()).toBe(false);
  });
});
