import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeFileUploader } from '../file-uploader/file-uploader';
import { OgeUploadDropZone } from './upload-drop-zone';
import { OgeUploadTrigger } from './upload-trigger';

const settle = async (fixture: ComponentFixture<unknown>) => {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};

const makeFile = (name: string) =>
  new File(['x'], name, { type: 'text/plain' });

const dataTransfer = (files: readonly File[]) =>
  ({
    files,
    items: [],
    types: ['Files'],
    dropEffect: 'none',
  }) as unknown as DataTransfer;

function dragEvent(type: string, files: readonly File[]): DragEvent {
  const event = new Event(type, { bubbles: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer(files) });
  return event;
}

@Component({
  imports: [OgeFileUploader, OgeUploadDropZone, OgeUploadTrigger],
  template: `
    <div id="zone" [ogeUploadDropZone]="'attachments'">Drop here</div>
    <button id="trigger" type="button" [ogeUploadTrigger]="'attachments'">
      Attach
    </button>
    @if (present()) {
      <oge-file-uploader dropZone="attachments" />
    }
  `,
})
class Host {
  readonly present = signal(true);
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const uploader = () =>
    fixture.debugElement.query((node) => node.name === 'oge-file-uploader')
      ?.componentInstance as OgeFileUploader | undefined;
  return { fixture, element, uploader };
}

describe('OgeUploadDropZone', () => {
  it('feeds files to the uploader registered under its name', async () => {
    const { fixture, element, uploader } = setup();
    await settle(fixture);

    element
      .querySelector('#zone')
      ?.dispatchEvent(dragEvent('drop', [makeFile('a.txt')]));
    await settle(fixture);

    expect(
      uploader()
        ?.files()
        .map((f) => f.name),
    ).toEqual(['a.txt']);
  });

  it('marks itself while files hover, and clears on drop', async () => {
    const { fixture, element } = setup();
    await settle(fixture);
    const zone = element.querySelector('#zone');

    zone?.dispatchEvent(dragEvent('dragenter', [makeFile('a.txt')]));
    await settle(fixture);
    expect(zone?.classList.contains('oge-upload-external-zone-over')).toBe(
      true,
    );

    zone?.dispatchEvent(dragEvent('drop', [makeFile('a.txt')]));
    await settle(fixture);
    expect(zone?.classList.contains('oge-upload-external-zone-over')).toBe(
      false,
    );
  });

  it('ignores a drag that carries no files', async () => {
    const { fixture, element } = setup();
    await settle(fixture);
    const zone = element.querySelector('#zone');

    const event = new Event('dragenter', { bubbles: true }) as DragEvent;
    Object.defineProperty(event, 'dataTransfer', {
      value: { files: [], items: [], types: ['text/plain'] },
    });
    zone?.dispatchEvent(event);
    await settle(fixture);

    expect(zone?.classList.contains('oge-upload-external-zone-over')).toBe(
      false,
    );
  });

  it('does nothing once its uploader is gone', async () => {
    const { fixture, element } = setup();
    await settle(fixture);
    fixture.componentInstance.present.set(false);
    await settle(fixture);

    // No uploader is registered any more; the drop must be a no-op rather
    // than an error.
    expect(() =>
      element
        .querySelector('#zone')
        ?.dispatchEvent(dragEvent('drop', [makeFile('a.txt')])),
    ).not.toThrow();
  });
});

describe('OgeUploadTrigger', () => {
  it('opens the uploader dialog from an unrelated button', async () => {
    const { fixture, element } = setup();
    await settle(fixture);

    const input = element.querySelector<HTMLInputElement>('.oge-upload-input');
    let clicked = 0;
    if (input) input.click = () => (clicked += 1);

    element.querySelector<HTMLButtonElement>('#trigger')?.click();
    expect(clicked).toBe(1);
  });

  it('disables itself when no uploader answers to that name', async () => {
    const { fixture, element } = setup();
    fixture.componentInstance.present.set(false);
    await settle(fixture);

    expect(element.querySelector('#trigger')?.hasAttribute('disabled')).toBe(
      true,
    );
  });
});
