import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideOgeUploadConfig } from '../config';
import { OgeFileUploader } from './file-uploader';

const settle = async (fixture: ComponentFixture<unknown>) => {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};

const makeFile = (name: string, size = 10, type = 'text/plain') => {
  const file = new File(['x'.repeat(size)], name, { type });
  // jsdom computes `size` from the parts, but a test that wants a 5 MB file
  // should not have to allocate 5 MB of string.
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

/** jsdom ships no `DataTransfer`; this is the shape the drop path reads. */
const dataTransfer = (files: readonly File[]) =>
  ({
    files,
    items: [],
    types: ['Files'],
    dropEffect: 'none',
  }) as unknown as DataTransfer;

@Component({
  imports: [OgeFileUploader],
  template: `
    <oge-file-uploader
      [multiple]="multiple()"
      [maxFileSize]="maxFileSize()"
      [allowedFileExtensions]="extensions()"
      [maxFileCount]="maxFileCount()"
      [pastable]="true"
      [transformFile]="transform()"
      [openFileDialogOnClick]="dialogOnClick()"
      [capture]="capture()"
      (filesSelecting)="onSelecting($event)"
      (filesSelected)="selected = selected + 1"
      (fileRejected)="rejected = rejected + 1"
      (fileRemoving)="onRemoving($event)"
      (clearing)="onClearing($event)"
    />
  `,
})
class Host {
  readonly multiple = signal(true);
  readonly maxFileSize = signal<number | undefined>(undefined);
  readonly maxFileCount = signal<number | undefined>(undefined);
  readonly extensions = signal<readonly string[]>([]);
  readonly dialogOnClick = signal(true);
  readonly capture = signal<boolean | 'user' | 'environment' | undefined>(
    undefined,
  );
  readonly transform = signal<((file: File) => File) | undefined>(undefined);

  selected = 0;
  rejected = 0;
  vetoSelecting = false;
  vetoRemoving = false;
  vetoClearing = false;

  onSelecting(event: { cancel: boolean }) {
    event.cancel = this.vetoSelecting;
  }
  onRemoving(event: { cancel: boolean }) {
    event.cancel = this.vetoRemoving;
  }
  onClearing(event: { cancel: boolean }) {
    event.cancel = this.vetoClearing;
  }
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const uploader = fixture.debugElement.children[0]
    .componentInstance as OgeFileUploader;
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, uploader, element, host: fixture.componentInstance };
}

/** Drives the hidden input the way the browser does after a dialog pick. */
async function pick(
  fixture: ComponentFixture<Host>,
  element: HTMLElement,
  files: readonly File[],
) {
  const input = element.querySelector<HTMLInputElement>('.oge-upload-input');
  if (!input) throw new Error('no file input');
  Object.defineProperty(input, 'files', {
    value: files as unknown as FileList,
    configurable: true,
  });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await settle(fixture);
}

describe('OgeFileUploader — selection', () => {
  it('renders a real file input that stays in the accessibility tree', () => {
    const { element } = setup();
    const input = element.querySelector<HTMLInputElement>('.oge-upload-input');
    expect(input).not.toBeNull();
    expect(input?.type).toBe('file');
    // Clipped, not hidden: `display:none` or `aria-hidden` would take it out
    // of the accessibility tree and strand browse-mode users.
    expect(input?.getAttribute('aria-hidden')).toBeNull();
    expect(input?.hasAttribute('hidden')).toBe(false);
  });

  it('adds files chosen from the dialog', async () => {
    const { fixture, uploader, element, host } = setup();
    await pick(fixture, element, [makeFile('a.txt'), makeFile('b.txt')]);

    expect(uploader.files().map((f) => f.name)).toEqual(['a.txt', 'b.txt']);
    expect(uploader.value()).toHaveLength(2);
    expect(host.selected).toBe(1);
  });

  it('clears the native input so the same file can be picked twice', async () => {
    const { fixture, element, uploader } = setup();
    await pick(fixture, element, [makeFile('a.txt')]);
    const input = element.querySelector<HTMLInputElement>('.oge-upload-input');
    expect(input?.value).toBe('');

    await pick(fixture, element, [makeFile('a.txt')]);
    expect(uploader.files()).toHaveLength(2);
  });

  it('replaces instead of appending when multiple is off', async () => {
    const { fixture, uploader, element, host } = setup();
    host.multiple.set(false);
    await settle(fixture);

    await pick(fixture, element, [makeFile('a.txt')]);
    await pick(fixture, element, [makeFile('b.txt')]);

    expect(uploader.files().map((f) => f.name)).toEqual(['b.txt']);
  });

  it('takes only the first file when multiple is off and several arrive', async () => {
    const { fixture, uploader, element, host } = setup();
    host.multiple.set(false);
    await settle(fixture);

    await pick(fixture, element, [makeFile('a.txt'), makeFile('b.txt')]);
    expect(uploader.files().map((f) => f.name)).toEqual(['a.txt']);
  });

  it('lets filesSelecting veto the whole batch', async () => {
    const { fixture, uploader, element, host } = setup();
    host.vetoSelecting = true;
    await pick(fixture, element, [makeFile('a.txt')]);

    expect(uploader.files()).toHaveLength(0);
    expect(host.selected).toBe(0);
  });

  it('adds dropped files and reports the drop', async () => {
    const { fixture, uploader, element } = setup();
    const zone = element.querySelector<HTMLElement>('.oge-upload-dropzone');
    const event = new Event('drop', { bubbles: true }) as DragEvent;
    Object.defineProperty(event, 'dataTransfer', {
      value: dataTransfer([makeFile('dropped.txt')]),
    });

    zone?.dispatchEvent(event);
    await settle(fixture);

    expect(uploader.files().map((f) => f.name)).toEqual(['dropped.txt']);
  });

  it('highlights the zone only while the pointer is really inside it', async () => {
    const { fixture, element } = setup();
    const zone = element.querySelector<HTMLElement>('.oge-upload-dropzone');
    const drag = (type: string) => {
      const event = new Event(type, { bubbles: true }) as DragEvent;
      Object.defineProperty(event, 'dataTransfer', {
        value: dataTransfer([makeFile('a.txt')]),
      });
      zone?.dispatchEvent(event);
    };

    drag('dragenter'); // the zone
    drag('dragenter'); // a child element
    await settle(fixture);
    expect(zone?.classList.contains('oge-upload-dropzone-over')).toBe(true);

    drag('dragleave'); // leaving the child must not clear the highlight
    await settle(fixture);
    expect(zone?.classList.contains('oge-upload-dropzone-over')).toBe(true);

    drag('dragleave');
    await settle(fixture);
    expect(zone?.classList.contains('oge-upload-dropzone-over')).toBe(false);
  });

  it('adds pasted files when pastable is on', async () => {
    const { fixture, uploader, element } = setup();
    const event = new Event('paste', { bubbles: true }) as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', {
      value: dataTransfer([makeFile('shot.png', 10, 'image/png')]),
    });

    // On the uploader's own element: the host listener catches what bubbles
    // up from inside it, not what is dispatched on an ancestor.
    element.querySelector('oge-file-uploader')?.dispatchEvent(event);
    await settle(fixture);

    expect(uploader.files().map((f) => f.name)).toEqual(['shot.png']);
  });

  it('removes one file and keeps the rest', async () => {
    const { fixture, uploader, element } = setup();
    await pick(fixture, element, [makeFile('a.txt'), makeFile('b.txt')]);

    uploader.removeFile(uploader.files()[0].uid);
    await settle(fixture);

    expect(uploader.files().map((f) => f.name)).toEqual(['b.txt']);
    expect(uploader.value()).toHaveLength(1);
  });

  it('lets fileRemoving veto the removal', async () => {
    const { fixture, uploader, element, host } = setup();
    await pick(fixture, element, [makeFile('a.txt')]);
    host.vetoRemoving = true;

    uploader.removeFile(uploader.files()[0].uid);
    await settle(fixture);

    expect(uploader.files()).toHaveLength(1);
  });

  it('clears the list, and lets clearing veto that too', async () => {
    const { fixture, uploader, element, host } = setup();
    await pick(fixture, element, [makeFile('a.txt'), makeFile('b.txt')]);

    host.vetoClearing = true;
    uploader.clear();
    await settle(fixture);
    expect(uploader.files()).toHaveLength(2);

    host.vetoClearing = false;
    uploader.clear();
    await settle(fixture);
    expect(uploader.files()).toHaveLength(0);
    expect(uploader.value()).toHaveLength(0);
  });

  it('ignores selection while disabled', async () => {
    const { fixture, uploader, element } = setup();
    // The forms path, which is how a disabled reactive control reaches here.
    uploader.setDisabledState(true);
    await settle(fixture);

    await pick(fixture, element, [makeFile('a.txt')]);
    expect(uploader.files()).toHaveLength(0);
    expect(uploader.effectiveDisabled()).toBe(true);
  });

  it('sorts by name on request', async () => {
    const { fixture, uploader, element } = setup();
    await pick(fixture, element, [makeFile('b.txt'), makeFile('a.txt')]);

    uploader.sortFiles();
    await settle(fixture);

    expect(uploader.files().map((f) => f.name)).toEqual(['a.txt', 'b.txt']);
  });
});

describe('OgeFileUploader — restrictions', () => {
  it('keeps an oversized file on the list, marked invalid, with a reason', async () => {
    const { fixture, uploader, element, host } = setup();
    host.maxFileSize.set(100);
    await settle(fixture);

    await pick(fixture, element, [makeFile('big.txt', 500)]);

    const [row] = uploader.files();
    expect(row.status).toBe('invalid');
    expect(row.errors[0].kind).toBe('maxFileSize');
    // Rejection is explained on screen, not just swallowed.
    expect(
      element.querySelector('.oge-upload-file-error')?.textContent,
    ).toContain('too large');
    expect(host.rejected).toBe(1);
  });

  it('reports an invalid row through aria, not colour alone', async () => {
    const { fixture, element, host } = setup();
    host.extensions.set(['.png']);
    await settle(fixture);

    await pick(fixture, element, [makeFile('a.txt')]);

    const row = element.querySelector('.oge-upload-file');
    expect(row?.getAttribute('aria-invalid')).toBe('true');
    expect(row?.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('keeps invalid files in value, and reports the control invalid', async () => {
    const { fixture, uploader, element, host } = setup();
    host.maxFileSize.set(100);
    await settle(fixture);

    await pick(fixture, element, [makeFile('big.txt', 500)]);

    // dx's behaviour: `value` is populated and `isValid` is false. Hiding the
    // file would let `required` pass while the user can see a file on screen.
    expect(uploader.value()).toHaveLength(1);
    expect(uploader.valid()).toBe(false);
  });

  it('rejects only the files past the count limit', async () => {
    const { fixture, uploader, element, host } = setup();
    host.maxFileCount.set(1);
    await settle(fixture);

    await pick(fixture, element, [makeFile('a.txt'), makeFile('b.txt')]);

    expect(uploader.files()[0].errors).toEqual([]);
    expect(uploader.files()[1].errors[0].kind).toBe('maxFileCount');
    expect(uploader.limitExceeded()).toBe(true);
  });

  it('shows the restriction summary under the drop zone', async () => {
    const { fixture, element, host } = setup();
    host.maxFileSize.set(1_000_000);
    host.extensions.set(['.png', '.jpg']);
    await settle(fixture);

    const hint = element.querySelector('.oge-upload-dropzone-hint');
    expect(hint?.textContent).toContain('.png, .jpg');
    // Deliberately not asserting `1.0 MB`: sizes are formatted in the host's
    // locale, so a machine set to tr-TR renders `1,0 MB` and an assertion on
    // the separator would fail there and nowhere else.
    expect(hint?.textContent).toMatch(/1[.,]0 MB/);
  });

  it('formats sizes in the locale the config pins', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideOgeUploadConfig({ locale: 'en-US' })],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.maxFileSize.set(1_000_000);
    await settle(fixture);

    const hint = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-upload-dropzone-hint',
    );
    expect(hint?.textContent).toContain('1.0 MB');
  });
});

describe('OgeFileUploader — second parity sweep', () => {
  it('rewrites files through transformFile before validating them', async () => {
    const { fixture, uploader, element, host } = setup();
    host.maxFileSize.set(50);
    host.transform.set(() => makeFile('small.txt', 10));
    await settle(fixture);

    await pick(fixture, element, [makeFile('huge.txt', 5000)]);
    // The transform is async by contract, so the rows land one microtask later.
    await settle(fixture);

    // The rules judge the bytes that will actually be sent, not the ones
    // originally picked — a 5 KB file compressed to 10 bytes must pass.
    expect(uploader.files()[0].name).toBe('small.txt');
    expect(uploader.files()[0].errors).toEqual([]);
  });

  it('keeps the original files when a transform rejects', async () => {
    const { fixture, uploader, element, host } = setup();
    host.transform.set(() => {
      throw new Error('nope');
    });
    await settle(fixture);

    await pick(fixture, element, [makeFile('a.txt')]);
    await settle(fixture);

    expect(uploader.files().map((f) => f.name)).toEqual(['a.txt']);
  });

  it('drops the button role from the zone when it does not open the dialog', async () => {
    const { fixture, element, host } = setup();
    host.dialogOnClick.set(false);
    await settle(fixture);

    const zone = element.querySelector('.oge-upload-dropzone');
    // A button that does nothing on Enter is worse than no button; the
    // separate browse button carries the keyboard path instead.
    expect(zone?.tagName).toBe('DIV');
    expect(element.querySelector('.oge-upload-select')).not.toBeNull();
  });

  it('passes capture through to the native input', async () => {
    const { fixture, element, host } = setup();
    host.capture.set('environment');
    await settle(fixture);

    expect(
      element.querySelector('.oge-upload-input')?.getAttribute('capture'),
    ).toBe('environment');
  });

  it('resets to a pristine state without firing the clear pipeline', async () => {
    const { fixture, uploader, element } = setup();
    await pick(fixture, element, [makeFile('a.txt')]);
    let cleared = 0;
    uploader.cleared.subscribe(() => (cleared += 1));

    uploader.reset();
    await settle(fixture);

    expect(uploader.files()).toEqual([]);
    expect(uploader.effectiveDirty()).toBe(false);
    expect(cleared).toBe(0);
  });

  it('returns one row from getFiles(index)', async () => {
    const { fixture, uploader, element } = setup();
    await pick(fixture, element, [makeFile('a.txt'), makeFile('b.txt')]);

    expect(uploader.getFiles(1).map((f) => f.name)).toEqual(['b.txt']);
    expect(uploader.getFiles(9)).toEqual([]);
    expect(uploader.getFiles()).toHaveLength(2);
  });
});
