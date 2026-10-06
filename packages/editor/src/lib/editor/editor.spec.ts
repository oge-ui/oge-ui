import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, form, required } from '@angular/forms/signals';
import {
  ogeEditorWriteSelection,
  type OgeEditorToolbarEntry,
} from '@oge-ui/behavior';
import { provideOgeEditorConfig } from '../config';
import { ogeEditorMaxLength } from '../editor-validators';
import { OgeEditor } from './editor';

async function settle<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function content(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement.querySelector(
    '.oge-editor-content',
  ) as HTMLElement;
}

function placeCaret(
  fixture: ComponentFixture<unknown>,
  block: number,
  offset: number,
  endOffset = offset,
): void {
  const root = content(fixture);
  root.focus();
  ogeEditorWriteSelection(
    root,
    { anchor: { block, offset }, focus: { block, offset: endOffset } },
    document.getSelection(),
  );
  document.dispatchEvent(new Event('selectionchange'));
}

function type(fixture: ComponentFixture<unknown>, text: string): void {
  for (const ch of text) {
    content(fixture).dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: ch,
        bubbles: true,
        cancelable: true,
      }),
    );
  }
}

function tool(
  fixture: ComponentFixture<unknown>,
  key: string,
): HTMLButtonElement {
  return fixture.nativeElement.querySelector(
    `[data-oge-editor-tool="${key}"]`,
  ) as HTMLButtonElement;
}

@Component({
  imports: [OgeEditor],
  template: `<oge-editor
    label="Body"
    placeholder="Write something"
    hint="Markdown shortcuts work"
    [toolbar]="toolbar()"
    [counter]="'characters'"
    [maxLength]="maxLength()"
    [readonly]="readonly()"
    [(value)]="value"
    (valueCommitted)="commits.push($event.value)"
  />`,
})
class Host {
  readonly value = signal('<p>hello</p>');
  readonly toolbar = signal<
    readonly OgeEditorToolbarEntry[] | false | undefined
  >(undefined);
  readonly maxLength = signal<number | undefined>(undefined);
  readonly readonly = signal(false);
  readonly commits: string[] = [];
}

describe('OgeEditor', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
  });

  afterEach(() => fixture.destroy());

  it('renders the value into an accessible textbox', () => {
    const root = content(fixture);
    expect(root.getAttribute('role')).toBe('textbox');
    expect(root.getAttribute('aria-multiline')).toBe('true');
    expect(root.getAttribute('contenteditable')).toBe('true');
    expect(root.getAttribute('aria-labelledby')).toContain('-label');
    expect(root.getAttribute('aria-describedby')).toContain('-hint');
    expect(root.querySelector('p')?.textContent).toBe('hello');
  });

  it('typing updates the two-way value through the model', async () => {
    placeCaret(fixture, 0, 5);
    type(fixture, '!');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('<p>hello!</p>');
    expect(fixture.componentInstance.commits).toEqual(['<p>hello!</p>']);
  });

  it('an external value replaces the document', async () => {
    fixture.componentInstance.value.set(
      '<h2>New</h2><script>alert(1)</script>',
    );
    await settle(fixture);
    expect(content(fixture).querySelector('h2')?.textContent).toBe('New');
    expect(content(fixture).querySelector('script')).toBeNull();
  });

  it('the toolbar is a labelled APG toolbar of tools with shortcut tooltips', () => {
    const toolbar = fixture.nativeElement.querySelector(
      '[role="toolbar"]',
    ) as HTMLElement;
    expect(toolbar.getAttribute('aria-label')).toBe('Text formatting');
    const bold = tool(fixture, 'bold');
    expect(bold.getAttribute('aria-pressed')).toBe('false');
    expect(bold.getAttribute('title')).toBe('Bold (Ctrl+B)');
    expect(bold.getAttribute('aria-keyshortcuts')).toBe('Control+B');
    expect(tool(fixture, 'link').getAttribute('aria-haspopup')).toBe('dialog');
    expect(tool(fixture, 'blockFormat').getAttribute('aria-haspopup')).toBe(
      'menu',
    );
  });

  it('a toolbar toggle formats the selection and reports aria-pressed', async () => {
    placeCaret(fixture, 0, 0, 5);
    await settle(fixture);
    tool(fixture, 'bold').click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(
      '<p><strong>hello</strong></p>',
    );
    expect(tool(fixture, 'bold').getAttribute('aria-pressed')).toBe('true');
  });

  it('a mousedown on a tool keeps the focus and the selection in the text', () => {
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    tool(fixture, 'italic').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('undo is disabled until there is history', async () => {
    expect(tool(fixture, 'undo').disabled).toBe(true);
    placeCaret(fixture, 0, 5);
    type(fixture, 'x');
    await settle(fixture);
    expect(tool(fixture, 'undo').disabled).toBe(false);
    tool(fixture, 'undo').click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('<p>hello</p>');
  });

  it('a custom toolbar; false hides it', async () => {
    fixture.componentInstance.toolbar.set(['bold', 'separator', 'italic']);
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelectorAll('.oge-editor-tool'),
    ).toHaveLength(2);
    fixture.componentInstance.toolbar.set(false);
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('[role="toolbar"]')).toBeNull();
  });

  it('shows the placeholder only while empty', async () => {
    expect(
      fixture.nativeElement.querySelector('.oge-editor-placeholder'),
    ).toBeNull();
    fixture.componentInstance.value.set('');
    await settle(fixture);
    expect(
      fixture.nativeElement
        .querySelector('.oge-editor-placeholder')
        ?.textContent?.trim(),
    ).toBe('Write something');
    expect(content(fixture).getAttribute('aria-placeholder')).toBe(
      'Write something',
    );
  });

  it('counts characters and enforces maxLength', async () => {
    fixture.componentInstance.maxLength.set(6);
    await settle(fixture);
    expect(
      fixture.nativeElement
        .querySelector('.oge-editor-counter')
        ?.textContent?.trim(),
    ).toBe('5 / 6');
    placeCaret(fixture, 0, 5);
    type(fixture, 'abc');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('<p>helloa</p>');
  });

  it('read-only: not editable, tools disabled, value kept', async () => {
    fixture.componentInstance.readonly.set(true);
    await settle(fixture);
    expect(content(fixture).getAttribute('contenteditable')).toBe('false');
    expect(content(fixture).getAttribute('aria-readonly')).toBe('true');
    expect(tool(fixture, 'bold').disabled).toBe(true);
    placeCaret(fixture, 0, 5);
    type(fixture, 'x');
    expect(fixture.componentInstance.value()).toBe('<p>hello</p>');
  });

  it('the block-format menu opens from its tool', async () => {
    tool(fixture, 'blockFormat').click();
    await settle(fixture);
    const items = Array.from(
      document.querySelectorAll('[role="menuitemradio"]'),
    ).map((el) => el.textContent?.trim());
    expect(items).toContain('Heading 2');
    expect(tool(fixture, 'blockFormat').getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('exec() runs named commands and reports change', async () => {
    const editor = fixture.debugElement.children[0]
      .componentInstance as OgeEditor;
    placeCaret(fixture, 0, 0, 5);
    expect(editor.exec('heading2')).toBe(true);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('<h2>hello</h2>');
    expect(editor.insertLink('javascript:alert(1)')).toBe(false);
    expect(editor.getText()).toBe('hello');
  });
});

@Component({
  imports: [OgeEditor, ReactiveFormsModule],
  template: `<oge-editor [formControl]="control" />`,
})
class FormsHost {
  readonly control = new FormControl('<p>abc</p>', {
    nonNullable: true,
    validators: [Validators.required, ogeEditorMaxLength(4)],
  });
}

describe('OgeEditor — reactive forms', () => {
  it('writes, reads and validates through the ControlValueAccessor', async () => {
    const fixture = TestBed.createComponent(FormsHost);
    await settle(fixture);
    expect(content(fixture).textContent).toBe('abc');
    placeCaret(fixture, 0, 3);
    type(fixture, 'de');
    await settle(fixture);
    expect(fixture.componentInstance.control.value).toBe('<p>abcde</p>');
    expect(fixture.componentInstance.control.errors).toEqual({
      ogeEditorMaxLength: { max: 4, actual: 5 },
    });
    fixture.componentInstance.control.markAsTouched();
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-editor-error')?.textContent,
    ).toContain('at most 4');
    expect(content(fixture).getAttribute('aria-invalid')).toBe('true');
    fixture.componentInstance.control.setValue('');
    await settle(fixture);
    expect(fixture.componentInstance.control.hasError('required')).toBe(true);
    fixture.componentInstance.control.disable();
    await settle(fixture);
    expect(content(fixture).getAttribute('contenteditable')).toBe('false');
    expect(content(fixture).getAttribute('aria-disabled')).toBe('true');
    fixture.destroy();
  });
});

@Component({
  imports: [OgeEditor, FormField],
  template: `<oge-editor [formField]="postForm.body" />`,
})
class SignalFormsHost {
  readonly model = signal({ body: '<p>x</p>' });
  readonly postForm = form(this.model, (path) => {
    required(path.body);
  });
}

describe('OgeEditor — Signal Forms', () => {
  it('binds through [formField]: value, required and touched', async () => {
    const fixture = TestBed.createComponent(SignalFormsHost);
    await settle(fixture);
    expect(content(fixture).textContent).toBe('x');
    expect(content(fixture).getAttribute('aria-required')).toBe('true');
    placeCaret(fixture, 0, 1);
    type(fixture, 'y');
    await settle(fixture);
    expect(fixture.componentInstance.model().body).toBe('<p>xy</p>');
    fixture.componentInstance.model.set({ body: '' });
    await settle(fixture);
    expect(fixture.componentInstance.postForm.body().invalid()).toBe(true);
    content(fixture).dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.postForm.body().touched()).toBe(true);
    expect(
      fixture.nativeElement.querySelector('.oge-editor-error')?.textContent,
    ).toBeTruthy();
    fixture.destroy();
  });
});

@Component({
  imports: [OgeEditor],
  providers: [
    provideOgeEditorConfig({
      messages: { tools: { bold: 'Kalın' }, toolbarLabel: 'Biçim' },
    }),
  ],
  template: `<oge-editor [messages]="{ tools: { italic: 'Eğik' } }" />`,
})
class ConfigHost {}

describe('OgeEditor — config', () => {
  it('merges provider and instance messages', async () => {
    const fixture = TestBed.createComponent(ConfigHost);
    await settle(fixture);
    expect(tool(fixture, 'bold').getAttribute('aria-label')).toBe('Kalın');
    expect(tool(fixture, 'italic').getAttribute('aria-label')).toBe('Eğik');
    expect(
      fixture.nativeElement
        .querySelector('[role="toolbar"]')
        .getAttribute('aria-label'),
    ).toBe('Biçim');
    fixture.destroy();
  });
});
