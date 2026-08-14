import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { OgeFileUploader } from './file-uploader';

const settle = async (fixture: ComponentFixture<unknown>) => {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};

const makeFile = (name: string, size = 10) => {
  const file = new File(['x'], name, { type: 'text/plain' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const uploaderOf = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement.children[0].componentInstance as OgeFileUploader;

// --- standalone two-way binding ---------------------------------------------

@Component({
  imports: [OgeFileUploader],
  template: `<oge-file-uploader [(value)]="files" />`,
})
class ModelHost {
  readonly files = signal<readonly File[]>([]);
}

describe('OgeFileUploader — standalone binding', () => {
  it('writes the chosen files back through [(value)]', async () => {
    const fixture = TestBed.createComponent(ModelHost);
    await settle(fixture);

    uploaderOf(fixture).addFiles([makeFile('a.txt')]);
    await settle(fixture);

    expect(fixture.componentInstance.files().map((f) => f.name)).toEqual([
      'a.txt',
    ]);
  });

  it('drops the file from value when the row is removed', async () => {
    const fixture = TestBed.createComponent(ModelHost);
    await settle(fixture);
    const uploader = uploaderOf(fixture);

    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);
    uploader.removeFile(uploader.files()[0].uid);
    await settle(fixture);

    expect(fixture.componentInstance.files()).toEqual([]);
  });
});

// --- reactive forms ----------------------------------------------------------

@Component({
  imports: [OgeFileUploader, ReactiveFormsModule],
  template: `<oge-file-uploader [formControl]="control" />`,
})
class CvaHost {
  readonly control = new FormControl<readonly File[]>([], {
    nonNullable: true,
  });
}

describe('OgeFileUploader — reactive forms', () => {
  it('pushes the selection into the control', async () => {
    const fixture = TestBed.createComponent(CvaHost);
    await settle(fixture);

    uploaderOf(fixture).addFiles([makeFile('a.txt')]);
    await settle(fixture);

    expect(fixture.componentInstance.control.value.map((f) => f.name)).toEqual([
      'a.txt',
    ]);
  });

  it('renders rows for files written into the control', async () => {
    const fixture = TestBed.createComponent(CvaHost);
    await settle(fixture);

    fixture.componentInstance.control.setValue([makeFile('seed.txt')]);
    await settle(fixture);

    expect(
      uploaderOf(fixture)
        .files()
        .map((f) => f.name),
    ).toEqual(['seed.txt']);
  });

  it('marks the control touched and dirty on the first selection', async () => {
    const fixture = TestBed.createComponent(CvaHost);
    await settle(fixture);
    const control = fixture.componentInstance.control;
    expect(control.touched).toBe(false);

    uploaderOf(fixture).addFiles([makeFile('a.txt')]);
    await settle(fixture);

    expect(control.touched).toBe(true);
    expect(control.dirty).toBe(true);
  });

  it('follows the control when it is disabled', async () => {
    const fixture = TestBed.createComponent(CvaHost);
    await settle(fixture);

    fixture.componentInstance.control.disable();
    await settle(fixture);

    expect(uploaderOf(fixture).effectiveDisabled()).toBe(true);
    const zone = (fixture.nativeElement as HTMLElement).querySelector(
      'button.oge-upload-dropzone',
    ) as HTMLButtonElement | null;
    expect(zone?.disabled).toBe(true);
  });

  it('empties the list on a form reset', async () => {
    const fixture = TestBed.createComponent(CvaHost);
    await settle(fixture);
    const uploader = uploaderOf(fixture);

    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);
    fixture.componentInstance.control.reset();
    await settle(fixture);

    expect(uploader.files()).toEqual([]);
  });
});

// --- the validator -----------------------------------------------------------

@Component({
  imports: [OgeFileUploader, ReactiveFormsModule],
  template: `
    <oge-file-uploader
      [formControl]="control"
      [maxFileSize]="maxFileSize()"
      [required]="required()"
    />
  `,
})
class ValidatorHost {
  readonly control = new FormControl<readonly File[]>([], {
    nonNullable: true,
  });
  readonly maxFileSize = signal<number | undefined>(undefined);
  readonly required = signal(false);
}

describe('OgeFileUploader — validation reaches the form', () => {
  it('invalidates the control when a file breaks a restriction', async () => {
    const fixture = TestBed.createComponent(ValidatorHost);
    fixture.componentInstance.maxFileSize.set(100);
    await settle(fixture);

    uploaderOf(fixture).addFiles([makeFile('big.txt', 500)]);
    await settle(fixture);

    // Without NG_VALIDATORS the app would have to restate `maxFileSize` as a
    // ValidatorFn and keep the two definitions in step.
    const control = fixture.componentInstance.control;
    expect(control.valid).toBe(false);
    expect(control.errors?.['ogeUpload']).toBeTruthy();
  });

  it('goes valid again once the offending file is removed', async () => {
    const fixture = TestBed.createComponent(ValidatorHost);
    fixture.componentInstance.maxFileSize.set(100);
    await settle(fixture);
    const uploader = uploaderOf(fixture);

    uploader.addFiles([makeFile('big.txt', 500)]);
    await settle(fixture);
    uploader.removeFile(uploader.files()[0].uid);
    await settle(fixture);

    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('reports required while nothing is selected', async () => {
    const fixture = TestBed.createComponent(ValidatorHost);
    fixture.componentInstance.required.set(true);
    await settle(fixture);

    expect(fixture.componentInstance.control.errors?.['required']).toBe(true);

    uploaderOf(fixture).addFiles([makeFile('a.txt')]);
    await settle(fixture);

    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('keeps an invalid file in value rather than hiding it', async () => {
    const fixture = TestBed.createComponent(ValidatorHost);
    fixture.componentInstance.maxFileSize.set(100);
    await settle(fixture);

    uploaderOf(fixture).addFiles([makeFile('big.txt', 500)]);
    await settle(fixture);

    // Hiding it would let `required` pass while a file is visibly on screen.
    expect(fixture.componentInstance.control.value).toHaveLength(1);
  });
});
