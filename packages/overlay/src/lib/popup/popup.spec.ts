import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeAnchoredPanel } from '../panel/anchored-panel';
import { OgePopup } from './popup';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Reaches the model's private position signal — measurement itself is covered by anchored-panel.spec. */
function setPosition(panel: OgeAnchoredPanel, value: unknown): void {
  (panel as unknown as Record<'_position', { set(v: unknown): void }>)[
    '_position'
  ].set(value);
}

@Component({
  imports: [OgePopup],
  template: `<oge-popup [panel]="panel">content</oge-popup>`,
})
class PopupHost {
  readonly panel = new OgeAnchoredPanel({
    anchor: () => null,
    panel: () => null,
  });
}

describe('OgePopup', () => {
  it('binds the panel id and hides itself until a position exists', async () => {
    const fixture = TestBed.createComponent(PopupHost);
    await settle(fixture);
    const el = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-popup',
    ) as HTMLElement;
    expect(el.id).toBe(fixture.componentInstance.panel.panelId);
    expect(el.style.opacity).toBe('0');
    expect(el.textContent).toContain('content');
  });

  it('applies top/left/width once the panel model has a position', async () => {
    const fixture = TestBed.createComponent(PopupHost);
    setPosition(fixture.componentInstance.panel, {
      top: 42,
      left: 7,
      placement: 'bottom-start',
      width: 260,
    });
    await settle(fixture);
    const el = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-popup',
    ) as HTMLElement;
    expect(el.style.top).toBe('42px');
    expect(el.style.left).toBe('7px');
    expect(el.style.width).toBe('260px');
    expect(el.style.opacity).toBe('');
  });
});
