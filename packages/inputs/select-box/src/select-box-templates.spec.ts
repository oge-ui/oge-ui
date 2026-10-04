import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  OgeDropDownClosingEvent,
  OgeDropDownOpeningEvent,
} from '@oge-ui/behavior';
import { OgeSelectBox } from './select-box';

interface Fruit {
  name: string;
  kind: string;
}

const FRUITS: Fruit[] = [
  { name: 'Apple', kind: 'Pome' },
  { name: 'Cherry', kind: 'Stone' },
  { name: 'Pear', kind: 'Pome' },
];

@Component({
  imports: [OgeSelectBox],
  template: `
    <oge-select-box
      label="Fruit"
      [items]="items"
      displayExpr="name"
      groupBy="kind"
      [groupTemplate]="group"
      [fieldTemplate]="field"
      [headerTemplate]="header"
      [footerTemplate]="footer"
      [(value)]="value"
      (opening)="onOpening($event)"
      (closing)="onClosing($event)"
    />
    <ng-template #group let-label>
      <span class="group-tpl">Kind: {{ label }}</span>
    </ng-template>
    <ng-template #field let-item let-text="text">
      <b class="field-tpl">{{ item?.kind }} · {{ text }}</b>
    </ng-template>
    <ng-template #header let-items>
      <span class="header-tpl">{{ items.length }} fruits</span>
    </ng-template>
    <ng-template #footer>
      <button type="button" class="footer-tpl">Add fruit</button>
    </ng-template>
  `,
})
class Host {
  readonly items = FRUITS;
  readonly value = signal<unknown>(null);
  vetoOpen = false;
  vetoClose = false;
  readonly closings: string[] = [];

  onOpening(event: OgeDropDownOpeningEvent): void {
    event.cancel = this.vetoOpen;
  }

  onClosing(event: OgeDropDownClosingEvent): void {
    this.closings.push(event.reason);
    event.cancel = this.vetoClose;
  }
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function selectBox(fixture: ComponentFixture<Host>): OgeSelectBox<Fruit> {
  return fixture.debugElement.children[0].componentInstance;
}

function key(fixture: ComponentFixture<unknown>, name: string): void {
  const input: HTMLInputElement =
    fixture.nativeElement.querySelector('.oge-input-native');
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true }),
  );
}

describe('OgeSelectBox templates and cancelable events', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('renders group, header and footer templates in the popup', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    const groups = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLElement>('.group-tpl'),
    ).map((el) => el.textContent?.trim());
    expect(groups).toEqual(['Kind: Pome', 'Kind: Stone']);
    expect(
      fixture.nativeElement.querySelector(
        '.oge-select-popup-header .header-tpl',
      )?.textContent,
    ).toContain('3 fruits');
    expect(
      fixture.nativeElement.querySelector(
        '.oge-select-popup-footer .footer-tpl',
      ),
    ).not.toBeNull();
  });

  it('paints the field template over the input, keeping the input text', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(FRUITS[1]);
    await settle(fixture);
    const content = fixture.nativeElement.querySelector(
      '.oge-select-field-content',
    );
    expect(content?.getAttribute('aria-hidden')).toBe('true');
    expect(content?.textContent).toContain('Stone · Cherry');
    expect(fixture.nativeElement.querySelector('.oge-input-native').value).toBe(
      'Cherry',
    );
    expect(
      fixture.nativeElement
        .querySelector('oge-select-box')
        .classList.contains('oge-select-field-templated'),
    ).toBe(true);
  });

  it('a canceled opening keeps the popup closed', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.vetoOpen = true;
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    expect(selectBox(fixture).opened()).toBe(false);
    expect(fixture.nativeElement.querySelector('.oge-select-list')).toBeNull();
  });

  it('a canceled closing keeps the popup open, with the reason reported', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.vetoClose = true;
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    key(fixture, 'Escape');
    await settle(fixture);
    expect(selectBox(fixture).opened()).toBe(true);
    document.body.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true }),
    );
    await settle(fixture);
    expect(selectBox(fixture).opened()).toBe(true);
    expect(fixture.componentInstance.closings).toEqual(['escape', 'outside']);
    fixture.componentInstance.vetoClose = false;
    expect(selectBox(fixture).close()).toBe(true);
    await settle(fixture);
    expect(selectBox(fixture).opened()).toBe(false);
  });

  it('a selection closes with reason "select"', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    fixture.nativeElement.querySelector('.oge-select-option').click();
    await settle(fixture);
    expect(fixture.componentInstance.closings).toEqual(['select']);
  });
});
