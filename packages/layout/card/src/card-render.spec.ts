import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeCard } from './card';
import {
  OgeCardActions,
  OgeCardAvatar,
  OgeCardFooter,
  OgeCardHeaderActions,
  OgeCardMedia,
  OgeCardSeparator,
} from './templates';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  selector: 'oge-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OgeCard,
    OgeCardActions,
    OgeCardAvatar,
    OgeCardFooter,
    OgeCardHeaderActions,
    OgeCardMedia,
    OgeCardSeparator,
  ],
  template: `
    <oge-card [header]="header()" [subheader]="subheader()">
      @if (withAvatar()) {
        <span ogeCardAvatar>A</span>
      }
      @if (withHeaderActions()) {
        <span ogeCardHeaderActions><button type="button">⋮</button></span>
      }
      @if (withMedia()) {
        <div ogeCardMedia>media</div>
      }
      <p>Body</p>
      <hr ogeCardSeparator />
      @if (withActions()) {
        <div ogeCardActions><button type="button">Go</button></div>
      }
      @if (withFooter()) {
        <div ogeCardFooter>meta</div>
      }
    </oge-card>
  `,
})
class Host {
  readonly header = signal<string | undefined>(undefined);
  readonly subheader = signal<string | undefined>(undefined);
  readonly withAvatar = signal(false);
  readonly withHeaderActions = signal(false);
  readonly withMedia = signal(false);
  readonly withActions = signal(false);
  readonly withFooter = signal(false);
}

function el(
  fixture: ComponentFixture<unknown>,
  selector: string,
): HTMLElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector(selector);
}

describe('OgeCard render', () => {
  async function create(): Promise<ComponentFixture<Host>> {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    return fixture;
  }

  it('renders no header row when there is nothing to put in it', async () => {
    const fixture = await create();
    expect(el(fixture, '.oge-card-header')).toBeNull();
    expect(el(fixture, '.oge-card-content')?.textContent).toContain('Body');
  });

  it('renders title and subtitle from the header/subheader inputs', async () => {
    const fixture = await create();
    fixture.componentInstance.header.set('Mountains');
    fixture.componentInstance.subheader.set('Alps, 2026');
    await settle(fixture);
    expect(el(fixture, '.oge-card-title')?.textContent).toBe('Mountains');
    expect(el(fixture, '.oge-card-subtitle')?.textContent).toBe('Alps, 2026');
  });

  it('renders the header row for a projected avatar or header actions alone', async () => {
    const fixture = await create();
    fixture.componentInstance.withAvatar.set(true);
    await settle(fixture);
    expect(el(fixture, '.oge-card-header .oge-card-avatar')).not.toBeNull();
    expect(el(fixture, '.oge-card-titles')).toBeNull();

    fixture.componentInstance.withAvatar.set(false);
    fixture.componentInstance.withHeaderActions.set(true);
    await settle(fixture);
    expect(
      el(fixture, '.oge-card-header .oge-card-header-actions'),
    ).not.toBeNull();
  });

  it('projects media, actions and footer with their slot classes in section order', async () => {
    const fixture = await create();
    const host = fixture.componentInstance;
    host.header.set('T');
    host.withMedia.set(true);
    host.withActions.set(true);
    host.withFooter.set(true);
    await settle(fixture);

    const card = el(fixture, '.oge-card') as HTMLElement;
    const classes = Array.from(card.children).map((c) => c.className);
    expect(classes).toEqual([
      'oge-card-header',
      'oge-card-media',
      'oge-card-content',
      'oge-card-actions',
      'oge-card-footer',
    ]);
  });

  it('applies the separator class to a marked <hr> inside the content', async () => {
    const fixture = await create();
    expect(
      el(fixture, '.oge-card-content hr.oge-card-separator'),
    ).not.toBeNull();
  });
});

@Component({
  selector: 'oge-test-nested-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeCard, OgeCardAvatar],
  template: `
    <oge-card class="outer">
      <oge-card class="inner" header="Inner">
        <span ogeCardAvatar>A</span>
      </oge-card>
    </oge-card>
  `,
})
class NestedHost {}

describe('OgeCard nesting', () => {
  it("does not surface a nested card's slots in the outer header", async () => {
    const fixture = TestBed.createComponent(NestedHost);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.outer > .oge-card-header')).toBeNull();
    expect(
      root.querySelector('.inner .oge-card-header .oge-card-avatar'),
    ).not.toBeNull();
  });
});
