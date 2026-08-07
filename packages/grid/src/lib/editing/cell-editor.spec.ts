import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { OgeCellEditor } from './cell-editor';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeCellEditor keyboard / focus outputs', () => {
  async function render(): Promise<{
    fixture: ComponentFixture<OgeCellEditor>;
    el: HTMLElement;
    editor: OgeCellEditor;
    input: HTMLInputElement;
  }> {
    const fixture = TestBed.createComponent(OgeCellEditor);
    fixture.componentRef.setInput(
      'control',
      new FormControl<unknown>('Klavye'),
    );
    fixture.componentRef.setInput('label', 'Name');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      el,
      editor: fixture.componentInstance,
      input: el.querySelector('.oge-input-native, input') as HTMLInputElement,
    };
  }

  it('keeps the load-bearing .oge-editor host class and renders the bound value', async () => {
    const { el, input } = await render();
    expect(el.classList.contains('oge-editor')).toBe(true);
    expect(input.value).toBe('Klavye');
  });

  it('emits enterKey / escapeKey / tabKey for keys bubbling out of the editor', async () => {
    const { editor, input } = await render();
    const log: string[] = [];
    editor.enterKey.subscribe(() => log.push('enter'));
    editor.escapeKey.subscribe(() => log.push('escape'));
    editor.tabKey.subscribe(() => log.push('tab'));
    for (const key of ['Enter', 'Escape', 'Tab', 'a']) {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
    }
    expect(log).toEqual(['enter', 'escape', 'tab']); // "a" never surfaces
  });

  it('does not re-emit keys an open dropdown already consumed (defaultPrevented)', async () => {
    const { editor, input } = await render();
    const log: string[] = [];
    editor.enterKey.subscribe(() => log.push('enter'));
    const consumed = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    consumed.preventDefault();
    input.dispatchEvent(consumed);
    expect(log).toEqual([]);
  });

  it('focusLeft fires only when focus moves outside the editor', async () => {
    const { editor, el, input } = await render();
    const log: Event[] = [];
    editor.focusLeft.subscribe((event) => log.push(event));
    // focus moves within the editor — no emission
    input.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: el }),
    );
    expect(log).toHaveLength(0);
    // focus leaves entirely
    input.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
    expect(log).toHaveLength(1);
    expect(log[0]).toBeInstanceOf(FocusEvent);
  });
});
