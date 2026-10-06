import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { OgeBpmnEditor } from '@oge-ui/bpmn';
import { OgeEditor } from '@oge-ui/editor';
import { OgeForm, OgeFormItem } from '@oge-ui/forms';
import { OgeFileUploader } from '@oge-ui/upload';
import type { SsrFamily } from '../render';

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeBpmnEditor],
  template: `<oge-bpmn-editor [lint]="true" style="height: 480px" />`,
})
class BpmnHost {}

export const BPMN: SsrFamily = {
  name: 'bpmn',
  host: BpmnHost,
  expect: ['oge-bpmn'],
};

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeForm, OgeFormItem],
  template: `
    <oge-form [(formData)]="employee" [colCount]="2">
      <oge-form-item field="firstName" label="First name" [isRequired]="true" />
      <oge-form-item field="hired" label="Hired" />
      <oge-form-item field="salary" label="Salary" />
      <oge-form-item field="active" label="Active" />
      <oge-form-item field="notes" editorType="textArea" [colSpan]="2" />
    </oge-form>
  `,
})
class FormsHost {
  protected readonly employee = signal({
    firstName: 'Ada',
    hired: new Date(2026, 0, 15),
    salary: 4200,
    active: true,
    notes: '',
  });
}

export const FORMS: SsrFamily = {
  name: 'forms',
  host: FormsHost,
  expect: ['oge-form', 'First name'],
};

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeFileUploader],
  template: `
    <oge-file-uploader
      [(value)]="files"
      accept="image/*,.pdf"
      [maxFileSize]="5 * 1024 * 1024"
      [maxFileCount]="5"
    />
  `,
})
class UploadHost {
  protected readonly files = signal<readonly File[]>([]);
}

export const UPLOAD: SsrFamily = {
  name: 'upload',
  host: UploadHost,
  expect: ['oge-file-uploader', 'oge-upload'],
};

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeEditor],
  template: `<oge-editor
    label="Notes"
    [(value)]="html"
    [maxLength]="500"
    counter="characters"
  />`,
})
class EditorHost {
  protected readonly html = signal(
    '<h2>Release notes</h2><p>Hello <strong>world</strong></p>',
  );
}

export const EDITOR: SsrFamily = {
  name: 'editor',
  host: EditorHost,
  expect: ['oge-editor', 'Notes'],
};
