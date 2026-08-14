import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeFileUploader } from './file-uploader';

const settle = async (fixture: ComponentFixture<unknown>) => {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};

const makeFile = (name: string) =>
  new File(['x'], name, { type: 'text/plain' });

@Component({
  imports: [OgeFileUploader],
  template: `<oge-file-uploader [maxFileSize]="maxFileSize()" />`,
})
class Host {
  readonly maxFileSize = signal<number | undefined>(undefined);
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const uploader = fixture.debugElement.children[0]
    .componentInstance as OgeFileUploader;
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, uploader, element };
}

async function addFiles(
  fixture: ComponentFixture<Host>,
  uploader: OgeFileUploader,
  names: readonly string[],
) {
  uploader.addFiles(names.map(makeFile));
  await settle(fixture);
}

const rows = (element: HTMLElement) =>
  Array.from(element.querySelectorAll<HTMLElement>('.oge-upload-file'));

describe('OgeFileUploader — accessibility', () => {
  it('names the uploader and exposes it as a group', () => {
    const { element } = setup();
    const host = element.querySelector('oge-file-uploader');
    expect(host?.getAttribute('role')).toBe('group');
    expect(host?.getAttribute('aria-label')).toBe('File upload');
  });

  it('makes the drop zone a real button, so the keyboard reaches the dialog', () => {
    const { element } = setup();
    const zone = element.querySelector<HTMLButtonElement>(
      '.oge-upload-dropzone',
    );
    // A div with a click handler would be unreachable by keyboard and would
    // also trip angular-eslint's click-events-have-key-events.
    expect(zone?.tagName).toBe('BUTTON');
    expect(zone?.type).toBe('button');
    expect(zone?.getAttribute('aria-label')).toBeTruthy();
  });

  it('opens the dialog when the zone is activated', () => {
    const { element } = setup();
    const input = element.querySelector<HTMLInputElement>('.oge-upload-input');
    const zone = element.querySelector<HTMLButtonElement>(
      '.oge-upload-dropzone',
    );
    let clicked = 0;
    if (input) input.click = () => (clicked += 1);

    zone?.click();
    expect(clicked).toBe(1);
  });

  it('renders the list as a list, not a grid', async () => {
    const { fixture, uploader, element } = setup();
    await addFiles(fixture, uploader, ['a.txt']);

    const list = element.querySelector('.oge-upload-list');
    expect(list?.tagName).toBe('UL');
    expect(list?.getAttribute('role')).toBe('list');
    // Row actions are plain buttons inside a non-interactive listitem, so
    // axe's nested-interactive rule has nothing to complain about.
    expect(rows(element)[0].querySelector('button')).not.toBeNull();
  });

  it('keeps exactly one row in the tab order', async () => {
    const { fixture, uploader, element } = setup();
    await addFiles(fixture, uploader, ['a.txt', 'b.txt', 'c.txt']);

    const tabIndexes = rows(element).map((row) => row.getAttribute('tabindex'));
    expect(tabIndexes).toEqual(['0', '-1', '-1']);
  });

  it('moves the roving tab stop with the arrow keys', async () => {
    const { fixture, uploader, element } = setup();
    await addFiles(fixture, uploader, ['a.txt', 'b.txt', 'c.txt']);

    const list = element.querySelector('.oge-upload-list');
    list?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await settle(fixture);

    expect(rows(element).map((r) => r.getAttribute('tabindex'))).toEqual([
      '-1',
      '0',
      '-1',
    ]);
  });

  it('jumps to the ends with Home and End', async () => {
    const { fixture, uploader, element } = setup();
    await addFiles(fixture, uploader, ['a.txt', 'b.txt', 'c.txt']);
    const list = element.querySelector('.oge-upload-list');

    list?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
    );
    await settle(fixture);
    expect(rows(element)[2].getAttribute('tabindex')).toBe('0');

    list?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    await settle(fixture);
    expect(rows(element)[0].getAttribute('tabindex')).toBe('0');
  });

  it('removes the focused row with Delete, and advertises the shortcut', async () => {
    const { fixture, uploader, element } = setup();
    await addFiles(fixture, uploader, ['a.txt', 'b.txt']);

    expect(rows(element)[0].getAttribute('aria-keyshortcuts')).toBe('Delete');

    const list = element.querySelector('.oge-upload-list');
    list?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }),
    );
    await settle(fixture);

    // No reference library removes a file from the keyboard; the mouse
    // affordance without its keyboard twin is the gap this closes.
    expect(uploader.files().map((f) => f.name)).toEqual(['b.txt']);
  });

  it('moves the tab stop off a row that was deleted', async () => {
    const { fixture, uploader, element } = setup();
    await addFiles(fixture, uploader, ['a.txt', 'b.txt']);

    uploader.removeFile(uploader.files()[0].uid);
    await settle(fixture);

    expect(rows(element)).toHaveLength(1);
    expect(rows(element)[0].getAttribute('tabindex')).toBe('0');
  });

  it('names each row action after the file it acts on', async () => {
    const { fixture, uploader, element } = setup();
    await addFiles(fixture, uploader, ['report.pdf']);

    const action = rows(element)[0].querySelector('.oge-upload-file-action');
    expect(action?.getAttribute('aria-label')).toBe('Remove: report.pdf');
  });

  it('announces additions and removals in a polite live region', async () => {
    const { fixture, uploader, element } = setup();
    const live = element.querySelector('.oge-upload-live');
    expect(live?.getAttribute('aria-live')).toBe('polite');
    expect(live?.getAttribute('aria-atomic')).toBe('true');

    await addFiles(fixture, uploader, ['a.txt']);
    expect(live?.textContent?.trim()).toBe('a.txt added');

    uploader.removeFile(uploader.files()[0].uid);
    await settle(fixture);
    expect(live?.textContent?.trim()).toBe('a.txt removed');
  });

  it('announces a rejection with its reason, not just a failure', async () => {
    const { fixture, uploader, element } = setup();
    fixture.componentInstance.maxFileSize.set(0);
    await settle(fixture);

    await addFiles(fixture, uploader, ['a.txt']);

    const announcement =
      element.querySelector('.oge-upload-live')?.textContent ?? '';
    expect(announcement).toContain('a.txt was rejected');
    expect(announcement).toContain('too large');
  });

  it('marks the whole uploader disabled for assistive tech', async () => {
    const { fixture, uploader, element } = setup();
    uploader.setDisabledState(true);
    await settle(fixture);

    expect(
      element.querySelector('oge-file-uploader')?.getAttribute('aria-disabled'),
    ).toBe('true');
  });
});
