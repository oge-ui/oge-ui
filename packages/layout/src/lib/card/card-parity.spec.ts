import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeCard } from './card';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

// There is no WAI-ARIA card pattern: the card must stay a plain container —
// no role of its own, no interactive wrapper — while letting the consumer
// promote it to `article`/`region` where the context calls for it.
describe('OgeCard a11y contract', () => {
  it('renders no role and no tabindex of its own', async () => {
    @Component({
      selector: 'oge-test-host',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [OgeCard],
      template: `<oge-card header="T">Body</oge-card>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const card = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-card',
    ) as HTMLElement;
    expect(card.hasAttribute('role')).toBe(false);
    expect(card.hasAttribute('tabindex')).toBe(false);
    // The title is styled text, not a heading — the consumer owns the
    // document outline and can project a real <hN> into the content.
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.oge-card-title')
        ?.tagName,
    ).toBe('DIV');
  });

  it('keeps a consumer-set role and aria-label on the host', async () => {
    @Component({
      selector: 'oge-test-labelled-host',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [OgeCard],
      template: `<oge-card role="region" aria-label="Weather">Body</oge-card>`,
    })
    class LabelledHost {}

    const fixture = TestBed.createComponent(LabelledHost);
    await settle(fixture);
    const card = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-card',
    ) as HTMLElement;
    expect(card.getAttribute('role')).toBe('region');
    expect(card.getAttribute('aria-label')).toBe('Weather');
  });
});
