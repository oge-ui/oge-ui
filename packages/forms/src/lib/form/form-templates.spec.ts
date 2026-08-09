import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeForm } from './form';
import { OgeFormGroup } from './form-group';
import { OgeFormItem } from './form-item';
import {
  OgeFormEditorTemplate,
  OgeFormGroupCaptionTemplate,
  OgeFormItemTemplate,
  OgeFormLabelTemplate,
} from './templates/form-templates';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

interface Ticket extends Record<string, unknown> {
  title: string;
  color: string;
}

@Component({
  selector: 'oge-item-template-host',
  imports: [OgeForm, OgeFormItem, OgeFormItemTemplate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [(formData)]="data">
      <oge-form-item field="title" label="Title" />
      <oge-form-item field="color" label="Color">
        <ng-template ogeFormItemTemplate let-item let-editorId="editorId">
          <span class="custom-item">{{ item.label }} / {{ editorId }}</span>
        </ng-template>
      </oge-form-item>
    </oge-form>
  `,
})
class ItemTemplateHost {
  readonly data = signal<Ticket>({ title: 'Bug', color: 'red' });
}

@Component({
  selector: 'oge-form-level-host',
  imports: [OgeForm, OgeFormItem, OgeFormItemTemplate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [(formData)]="data">
      <ng-template ogeFormItemTemplate let-item>
        <span class="form-level">{{ item.field }}</span>
      </ng-template>
      <oge-form-item field="title" label="Title" />
      <oge-form-item field="color" label="Color">
        <ng-template ogeFormItemTemplate>
          <span class="item-level">wins</span>
        </ng-template>
      </oge-form-item>
    </oge-form>
  `,
})
class FormLevelHost {
  readonly data = signal<Ticket>({ title: 'Bug', color: 'red' });
}

@Component({
  selector: 'oge-editor-template-host',
  imports: [OgeForm, OgeFormItem, OgeFormEditorTemplate, OgeFormLabelTemplate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [(formData)]="data" labelLocation="start">
      <oge-form-item field="color" label="Color" [isRequired]="true">
        <ng-template ogeFormLabelTemplate let-text let-required="required">
          <em class="custom-label">{{ text }}{{ required ? '!' : '' }}</em>
        </ng-template>
        <ng-template ogeFormEditorTemplate let-editorId="editorId">
          <input class="custom-editor" [id]="editorId" />
        </ng-template>
      </oge-form-item>
    </oge-form>
  `,
})
class EditorTemplateHost {
  readonly data = signal<Ticket>({ title: 'Bug', color: 'red' });
}

@Component({
  selector: 'oge-caption-template-host',
  imports: [OgeForm, OgeFormItem, OgeFormGroup, OgeFormGroupCaptionTemplate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [(formData)]="data">
      <oge-form-group caption="Details">
        <ng-template ogeFormGroupCaptionTemplate let-caption>
          <b class="custom-caption">{{ caption }} ▸</b>
        </ng-template>
        <oge-form-item field="title" label="Title" />
      </oge-form-group>
    </oge-form>
  `,
})
class CaptionTemplateHost {
  readonly data = signal<Ticket>({ title: 'Bug', color: 'red' });
}

describe('OgeForm — template slots', () => {
  it('replaces a single field with ogeFormItemTemplate', async () => {
    const fixture = TestBed.createComponent(ItemTemplateHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('.custom-item').length).toBe(1);
    expect(el.querySelector('.custom-item')?.textContent).toContain('Color');
    // the untemplated item still renders its editor
    expect(el.querySelectorAll('oge-text-box').length).toBe(1);
  });

  it('passes the editor id so a custom control keeps the label association', async () => {
    const fixture = TestBed.createComponent(ItemTemplateHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.custom-item')?.textContent).toMatch(/-editor$/);
  });

  it('applies a form-level template to every item', async () => {
    const fixture = TestBed.createComponent(FormLevelHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.form-level').length).toBe(1);
    expect(el.querySelector('.form-level')?.textContent).toBe('title');
  });

  it('lets a per-item template win over the form-level one', async () => {
    const fixture = TestBed.createComponent(FormLevelHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.item-level')?.textContent).toBe('wins');
  });

  it('replaces only the editor, keeping label and required mark', async () => {
    const fixture = TestBed.createComponent(EditorTemplateHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.custom-editor')).toBeTruthy();
    expect(el.querySelector('oge-text-box')).toBeNull();
    const label = el.querySelector<HTMLLabelElement>('.oge-form-label');
    expect(label).toBeTruthy();
    expect(label?.querySelector('.oge-form-required-mark')).toBeTruthy();
  });

  it('keeps the label/control association through a custom editor', async () => {
    const fixture = TestBed.createComponent(EditorTemplateHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const label = el.querySelector<HTMLLabelElement>('.oge-form-label');
    expect(el.querySelector(`#${label?.htmlFor}`)?.className).toBe(
      'custom-editor',
    );
  });

  it('replaces the label content but keeps the label element', async () => {
    const fixture = TestBed.createComponent(EditorTemplateHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const custom = el.querySelector('.oge-form-label .custom-label');
    expect(custom?.textContent).toBe('Color!');
  });

  it('replaces the legend content but keeps the fieldset/legend pair', async () => {
    const fixture = TestBed.createComponent(CaptionTemplateHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const legend = el.querySelector('fieldset.oge-form-group > legend');
    expect(legend).toBeTruthy();
    expect(legend?.querySelector('.custom-caption')?.textContent).toBe(
      'Details ▸',
    );
  });
});
