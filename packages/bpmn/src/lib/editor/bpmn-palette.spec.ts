import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { BpmnNodeType } from '../engine/bpmn-model';
import { OGE_DEFAULT_BPMN_MESSAGES } from '../config';
import { OgeBpmnPalette } from './bpmn-palette';

@Component({
  imports: [OgeBpmnPalette],
  template: `
    <oge-bpmn-palette
      [items]="items()"
      [labels]="labels"
      [activeType]="activeType()"
      [disabled]="disabled()"
      label="Elements palette"
      (toolPicked)="picked.push($event)"
    />
  `,
})
class Host {
  readonly items = signal<readonly BpmnNodeType[]>([
    'startEvent',
    'endEvent',
    'task',
    'exclusiveGateway',
  ]);
  readonly labels = OGE_DEFAULT_BPMN_MESSAGES.paletteLabels;
  readonly activeType = signal<BpmnNodeType | null>(null);
  readonly disabled = signal(false);
  readonly picked: BpmnNodeType[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function buttons(fixture: ComponentFixture<Host>): HTMLButtonElement[] {
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.oge-bpmn-palette-btn',
    ),
  );
}

describe('OgeBpmnPalette', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    return fixture;
  }

  it('renders a vertical toolbar of labeled buttons with svg glyphs', async () => {
    const fixture = await render();
    const toolbar = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-bpmn-palette',
    ) as HTMLElement;
    expect(toolbar.getAttribute('role')).toBe('toolbar');
    expect(toolbar.getAttribute('aria-orientation')).toBe('vertical');
    expect(toolbar.getAttribute('aria-label')).toBe('Elements palette');
    const btns = buttons(fixture);
    expect(btns.length).toBe(4);
    expect(btns[0].getAttribute('aria-label')).toBe('Start event');
    expect(btns[0].getAttribute('title')).toBe('Start event');
    expect(btns[2].querySelector('svg[aria-hidden="true"]')).toBeTruthy();
  });

  it('uses a roving tabindex moved by ArrowUp/ArrowDown/Home/End', async () => {
    const fixture = await render();
    const btns = buttons(fixture);
    expect(btns.map((b) => b.tabIndex)).toEqual([0, -1, -1, -1]);

    btns[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await settle(fixture);
    expect(buttons(fixture).map((b) => b.tabIndex)).toEqual([-1, 0, -1, -1]);
    expect(document.activeElement).toBe(buttons(fixture)[1]);

    buttons(fixture)[1].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
    );
    await settle(fixture);
    expect(buttons(fixture).map((b) => b.tabIndex)).toEqual([-1, -1, -1, 0]);

    buttons(fixture)[3].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await settle(fixture);
    expect(buttons(fixture).map((b) => b.tabIndex)).toEqual([0, -1, -1, -1]);

    buttons(fixture)[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    );
    await settle(fixture);
    expect(buttons(fixture).map((b) => b.tabIndex)).toEqual([-1, -1, -1, 0]);

    buttons(fixture)[3].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    await settle(fixture);
    expect(buttons(fixture).map((b) => b.tabIndex)).toEqual([0, -1, -1, -1]);
  });

  it('emits toolPicked on click and reflects the armed tool via aria-pressed', async () => {
    const fixture = await render();
    buttons(fixture)[2].click();
    await settle(fixture);
    expect(fixture.componentInstance.picked).toEqual(['task']);

    fixture.componentInstance.activeType.set('task');
    await settle(fixture);
    const btns = buttons(fixture);
    expect(btns[2].getAttribute('aria-pressed')).toBe('true');
    expect(btns[2].classList.contains('oge-bpmn-palette-active')).toBe(true);
    expect(btns[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('disables every button when disabled', async () => {
    const fixture = await render();
    fixture.componentInstance.disabled.set(true);
    await settle(fixture);
    expect(buttons(fixture).every((b) => b.disabled)).toBe(true);
  });
});
