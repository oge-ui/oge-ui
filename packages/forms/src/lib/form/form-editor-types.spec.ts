import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeForm } from './form';
import type { OgeFormItemData } from './form-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  // `@defer (on immediate)` blocks resolve their chunk over a few microtask
  // turns, so settle twice
  for (let i = 0; i < 2; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
  }
  fixture.detectChanges();
}

const CITIES = ['Ankara', 'Berlin', 'Lisbon'];

const ITEMS: OgeFormItemData[] = [
  { field: 'stars', editorType: 'rating', editorOptions: { max: 4 } },
  { field: 'code', editorType: 'otpInput', editorOptions: { length: 4 } },
  { field: 'signature', editorType: 'signaturePad' },
  {
    field: 'city',
    editorType: 'listBox',
    editorOptions: { items: CITIES },
  },
  {
    field: 'team',
    editorType: 'transferList',
    editorOptions: { items: CITIES, sourceTitle: 'Available' },
  },
  {
    field: 'note',
    editorType: 'mention',
    editorOptions: { items: ['ada', 'grace'] },
  },
  { field: 'body', editorType: 'richText' },
];

interface Model extends Record<string, unknown> {
  stars: number | null;
  code: string;
  signature: string | null;
  city: string | null;
  team: string[];
  note: string;
  body: string;
}

const EMPTY: Model = {
  stars: null,
  code: '',
  signature: null,
  city: null,
  team: [],
  note: '',
  body: '',
};

@Component({
  selector: 'oge-editor-types-host',
  imports: [OgeForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<oge-form [(formData)]="data" [items]="items" />`,
})
class DataHost {
  readonly items = ITEMS;
  readonly data = signal<Model>({ ...EMPTY, body: '<p>Hello</p>' });
}

@Component({
  selector: 'oge-editor-types-group-host',
  imports: [OgeForm, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<oge-form [formGroup]="fg" [items]="items" />`,
})
class GroupHost {
  readonly items = ITEMS;
  readonly fg = new FormGroup({
    stars: new FormControl<number | null>(3),
    code: new FormControl('12'),
    signature: new FormControl<string | null>(null),
    city: new FormControl<string | null>('Berlin'),
    team: new FormControl<string[]>(['Lisbon']),
    note: new FormControl(''),
    body: new FormControl('<p>Hi</p>'),
  });
}

const SELECTORS = {
  stars: 'oge-rating',
  code: 'oge-otp-input',
  signature: 'oge-signature-pad',
  city: 'oge-list-box',
  team: 'oge-transfer-list',
  note: 'oge-mention',
  body: 'oge-editor',
} as const;

function fieldOf(root: HTMLElement, selector: string): HTMLElement {
  const editor = root.querySelector(selector);
  expect(editor, selector).not.toBeNull();
  return editor!.closest('oge-form-field') as HTMLElement;
}

describe('OgeForm — W8b / W8e editor types', () => {
  // jsdom has no 2D canvas; the signature pad falls back to SVG without one
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders every new editor type in formData mode', async () => {
    const fixture = TestBed.createComponent(DataHost);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    for (const selector of Object.values(SELECTORS)) {
      expect(root.querySelector(selector), selector).not.toBeNull();
    }
    expect(
      root.querySelectorAll('.oge-form-editor-pending').length,
      'every deferred editor resolved',
    ).toBe(0);
  });

  it('lets the form draw the label only around the bare rating and signature pad', async () => {
    const fixture = TestBed.createComponent(DataHost);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    for (const selector of ['oge-rating', 'oge-signature-pad']) {
      const field = fieldOf(root, selector);
      expect(field.classList).toContain('oge-form-field-bare');
      expect(field.querySelector('.oge-form-label')).not.toBeNull();
    }
    for (const selector of ['oge-otp-input', 'oge-list-box', 'oge-editor']) {
      const field = fieldOf(root, selector);
      expect(field.classList).not.toContain('oge-form-field-bare');
      expect(field.querySelector('.oge-form-label')).toBeNull();
    }
  });

  it('forwards the curated editor options', async () => {
    const fixture = TestBed.createComponent(DataHost);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('oge-otp-input input').length).toBe(4);
    expect(root.querySelector('.oge-transfer-list-title')?.textContent).toBe(
      'Available',
    );
    expect(root.querySelector('oge-editor')?.textContent).toContain('Hello');
  });

  it('writes a list box pick back to the plain model', async () => {
    const fixture = TestBed.createComponent(DataHost);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const option = Array.from(
      root.querySelectorAll<HTMLElement>('oge-list-box [role="option"]'),
    ).find((o) => o.textContent?.trim() === 'Lisbon');
    option!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    expect(fixture.componentInstance.data().city).toBe('Lisbon');
  });

  it('binds the same editors to a reactive FormGroup', async () => {
    const fixture = TestBed.createComponent(GroupHost);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const cells = Array.from(
      root.querySelectorAll<HTMLInputElement>('oge-otp-input input'),
    );
    expect(cells.map((c) => c.value).slice(0, 2)).toEqual(['1', '2']);
    const selected = root.querySelector(
      'oge-list-box [role="option"][aria-selected="true"]',
    );
    expect(selected?.textContent?.trim()).toBe('Berlin');
    expect(root.querySelector('oge-editor')?.textContent).toContain('Hi');

    fixture.componentInstance.fg.controls.city.disable();
    await settle(fixture);
    expect(
      root
        .querySelector('oge-list-box [role="listbox"]')
        ?.getAttribute('aria-disabled'),
    ).toBe('true');
  });
});
