import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeSkeleton } from './skeleton';
import type { OgeSkeletonAnimation, OgeSkeletonShape } from './skeleton-types';

@Component({
  imports: [OgeSkeleton],
  template: `
    <oge-skeleton
      [shape]="shape()"
      [animation]="animation()"
      [width]="width()"
      [height]="height()"
    />
  `,
})
class SkeletonHost {
  readonly shape = signal<OgeSkeletonShape | undefined>(undefined);
  readonly animation = signal<OgeSkeletonAnimation | undefined>(undefined);
  readonly width = signal<string | number | undefined>(undefined);
  readonly height = signal<string | number | undefined>(undefined);
}

@Component({
  imports: [OgeSkeleton],
  template: `<oge-skeleton [shape]="shape()" [lines]="3" />`,
})
class LinesHost {
  readonly shape = signal<OgeSkeletonShape>('text');
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeSkeleton', () => {
  let fixture: ComponentFixture<SkeletonHost>;
  let host: SkeletonHost;
  let el: HTMLElement;

  const skeleton = (): HTMLElement =>
    el.querySelector('oge-skeleton') as HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(SkeletonHost);
    host = fixture.componentInstance;
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  it('is always aria-hidden decoration — the region owns the announcement', () => {
    expect(skeleton().getAttribute('aria-hidden')).toBe('true');
    expect(skeleton().getAttribute('role')).toBeNull();
  });

  it('shapes and animations map to host classes; shimmer is the default', async () => {
    expect(skeleton().classList.contains('oge-skeleton-pulse')).toBe(false);
    expect(skeleton().classList.contains('oge-skeleton-static')).toBe(false);
    host.shape.set('circle');
    host.animation.set('pulse');
    await settle(fixture);
    expect(skeleton().classList.contains('oge-skeleton-circle')).toBe(true);
    expect(skeleton().classList.contains('oge-skeleton-pulse')).toBe(true);
    host.animation.set('none');
    await settle(fixture);
    expect(skeleton().classList.contains('oge-skeleton-static')).toBe(true);
  });

  it('lines renders a tapered multi-line stack for text shapes only', async () => {
    const local = TestBed.createComponent(LinesHost);
    await settle(local);
    const root = local.nativeElement as HTMLElement;
    const skeleton = root.querySelector('oge-skeleton') as HTMLElement;
    expect(skeleton.classList.contains('oge-skeleton-multi')).toBe(true);
    expect(root.querySelectorAll('.oge-skeleton-line')).toHaveLength(3);

    // A non-text shape ignores lines and stays a single block.
    local.componentInstance.shape.set('rectangle');
    await settle(local);
    expect(root.querySelectorAll('.oge-skeleton-line')).toHaveLength(0);
    expect(skeleton.classList.contains('oge-skeleton-multi')).toBe(false);
    local.destroy();
  });

  it('numeric sizes become pixels; strings pass through', async () => {
    host.width.set(120);
    host.height.set('3rem');
    await settle(fixture);
    expect(skeleton().style.width).toBe('120px');
    expect(skeleton().style.height).toBe('3rem');
  });
});
