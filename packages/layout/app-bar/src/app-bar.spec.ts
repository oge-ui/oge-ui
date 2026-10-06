import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  OgeAppBarColor,
  OgeAppBarLandmark,
  OgeAppBarPosition,
  OgeAppBarPositionMode,
} from '@oge-ui/behavior';
import { OgeAppBar } from './app-bar';
import { provideOgeAppBarConfig } from './config';
import { OgeAppBarCenter, OgeAppBarEnd, OgeAppBarStart } from './templates';

@Component({
  imports: [OgeAppBar, OgeAppBarStart, OgeAppBarCenter, OgeAppBarEnd],
  template: `
    <oge-app-bar
      [position]="position()"
      [positionMode]="mode()"
      [color]="color()"
      [landmark]="landmark()"
      [elevated]="elevated()"
      [centerAlign]="centered() ? 'center' : 'start'"
      ariaLabel="Mail"
    >
      <button ogeAppBarEnd type="button" class="end-btn">Out</button>
      <h1>Inbox</h1>
      <button ogeAppBarStart type="button" class="start-btn">Menu</button>
      <span ogeAppBarCenter class="center-marked">Sub</span>
    </oge-app-bar>
  `,
})
class AppBarHost {
  readonly position = signal<OgeAppBarPosition | undefined>(undefined);
  readonly mode = signal<OgeAppBarPositionMode | undefined>(undefined);
  readonly color = signal<OgeAppBarColor | undefined>(undefined);
  readonly landmark = signal<OgeAppBarLandmark>('none');
  readonly elevated = signal(false);
  readonly centered = signal(false);
}

@Component({
  imports: [OgeAppBar],
  providers: [
    provideOgeAppBarConfig({
      color: 'inverse',
      size: 'lg',
      positionMode: 'sticky',
    }),
  ],
  template: `<oge-app-bar class="consumer">Title</oge-app-bar>`,
})
class ConfigHost {}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeAppBar', () => {
  let fixture: ComponentFixture<AppBarHost>;
  let el: HTMLElement;
  const bar = () => el.querySelector('oge-app-bar') as HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(AppBarHost);
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  it('projects marked content into the start / center / end sections', () => {
    expect(bar().querySelector('.oge-app-bar-start .start-btn')).not.toBeNull();
    expect(bar().querySelector('.oge-app-bar-end .end-btn')).not.toBeNull();
    const center = bar().querySelector('.oge-app-bar-center') as HTMLElement;
    expect(center.querySelector('h1')?.textContent).toBe('Inbox');
    // the explicit center marker comes first, unmarked content after it
    expect(center.firstElementChild?.classList).toContain('center-marked');
  });

  it('defaults to a static top bar in the default colour, no landmark', () => {
    expect(bar().className).toContain('oge-app-bar-top');
    expect(bar().className).toContain('oge-app-bar-static');
    expect(bar().className).toContain('oge-app-bar-color-default');
    expect(bar().className).toContain('oge-app-bar-md');
    expect(bar().hasAttribute('role')).toBe(false);
    // aria-label on a role-less element is prohibited ARIA
    expect(bar().hasAttribute('aria-label')).toBe(false);
  });

  it('adds the landmark and its name only on request', async () => {
    fixture.componentInstance.landmark.set('navigation');
    await settle(fixture);
    expect(bar().getAttribute('role')).toBe('navigation');
    expect(bar().getAttribute('aria-label')).toBe('Mail');
    fixture.componentInstance.landmark.set('banner');
    await settle(fixture);
    expect(bar().getAttribute('role')).toBe('banner');
  });

  it('maps position, mode, colour, elevation and center alignment', async () => {
    const host = fixture.componentInstance;
    host.position.set('bottom');
    host.mode.set('fixed');
    host.color.set('primary');
    host.elevated.set(true);
    host.centered.set(true);
    await settle(fixture);
    expect(bar().className).toContain('oge-app-bar-bottom');
    expect(bar().className).toContain('oge-app-bar-fixed');
    expect(bar().className).toContain('oge-app-bar-color-primary');
    expect(bar().className).toContain('oge-app-bar-elevated');
    expect(bar().className).not.toContain('oge-app-bar-top');
    expect(bar().querySelector('.oge-app-bar-center')?.classList).toContain(
      'oge-app-bar-center-centered',
    );
  });
});

describe('OgeAppBar config', () => {
  it('reads defaults from provideOgeAppBarConfig and keeps consumer classes', async () => {
    const fixture = TestBed.createComponent(ConfigHost);
    await settle(fixture);
    const bar = (fixture.nativeElement as HTMLElement).querySelector(
      'oge-app-bar',
    ) as HTMLElement;
    expect(bar.className).toContain('oge-app-bar-color-inverse');
    expect(bar.className).toContain('oge-app-bar-lg');
    expect(bar.className).toContain('oge-app-bar-sticky');
    expect(bar.classList).toContain('oge-app-bar');
    expect(bar.classList).toContain('consumer');
    expect(bar.querySelector('.oge-app-bar-center')?.textContent).toBe('Title');
  });
});
