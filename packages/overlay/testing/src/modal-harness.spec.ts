import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentHarness, type HarnessLoader } from '@angular/cdk/testing';
import { resetScrollLockForTests } from '@oge-ui/behavior';
import { OgeModal } from '../../src/lib/modal/modal';
import { OgeModalService } from '../../src/lib/modal/modal-service';
import { OgeModalFooter } from '../../src/lib/modal/modal-templates';
import { OgeModalHarness } from './modal-harness';

/** A stand-in for any harness of content projected into the modal. */
class NoteFieldHarness extends ComponentHarness {
  static hostSelector = '#note';
}

@Component({
  imports: [OgeModal, OgeModalFooter],
  template: `
    <oge-modal title="Edit note" [(opened)]="opened">
      <p>Change the note text.</p>
      <input id="note" aria-label="Note" />
      <div *ogeModalFooter="let close">
        <button type="button" (click)="close('cancel')">Cancel</button>
        <button type="button" (click)="close('save')">Save</button>
      </div>
    </oge-modal>
    <oge-modal ariaLabel="Help" [(opened)]="helpOpened">Help text</oge-modal>
  `,
})
class Host {
  readonly modals = inject(OgeModalService);
  readonly opened = signal(true);
  readonly helpOpened = signal(false);
}

describe('OgeModalHarness', () => {
  beforeEach(() => {
    // overlay specs stub rAF asynchronously (a sync stub causes NG0100)
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetScrollLockForTests();
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.innerHTML = '';
  });

  function setup(): { host: Host; loader: HarnessLoader; root: HarnessLoader } {
    const fixture = TestBed.createComponent(Host);
    return {
      host: fixture.componentInstance,
      loader: TestbedHarnessEnvironment.loader(fixture),
      root: TestbedHarnessEnvironment.documentRootLoader(fixture),
    };
  }

  it('filters by title and open state', async () => {
    const { loader } = setup();
    expect(await loader.getAllHarnesses(OgeModalHarness)).toHaveLength(2);
    const help = await loader.getHarness(OgeModalHarness.with({ open: false }));
    expect(await help.isOpen()).toBe(false);
    const edit = await loader.getHarness(
      OgeModalHarness.with({ title: /note/i }),
    );
    expect(await edit.isOpen()).toBe(true);
  });

  it('reads the title, role, content and buttons', async () => {
    const { loader } = setup();
    const modal = await loader.getHarness(
      OgeModalHarness.with({ title: 'Edit note' }),
    );
    expect(await modal.getRole()).toBe('dialog');
    expect(await modal.isBusy()).toBe(false);
    expect(await modal.getContentText()).toContain('Change the note text.');
    expect(await modal.getButtonTexts()).toEqual(['Cancel', 'Save']);
    // a content container: harnesses inside the panel are one call away
    expect(await modal.getHarness(NoteFieldHarness)).toBeTruthy();
  });

  it('closes through a footer button', async () => {
    const { host, loader } = setup();
    const modal = await loader.getHarness(OgeModalHarness);
    await modal.clickButton('Save');
    expect(await modal.isOpen()).toBe(false);
    expect(host.opened()).toBe(false);
  });

  it('closes with Escape, the close button and the backdrop', async () => {
    const { host, loader } = setup();
    const modal = await loader.getHarness(OgeModalHarness);
    await modal.pressEscape();
    expect(host.opened()).toBe(false);

    host.opened.set(true);
    await modal.close();
    expect(await modal.isOpen()).toBe(false);

    host.opened.set(true);
    await modal.clickBackdrop();
    expect(await modal.isOpen()).toBe(false);
  });

  it('falls back to aria-label for an untitled modal', async () => {
    const { host, loader } = setup();
    host.helpOpened.set(true);
    const help = await loader.getHarness(
      OgeModalHarness.with({ title: 'Help' }),
    );
    expect(await help.getContentText()).toBe('Help text');
  });

  it('finds service dialogs from the document root', async () => {
    const { host, root } = setup();
    const answer = host.modals.confirm({
      title: 'Delete row?',
      message: 'This cannot be undone.',
      okText: 'Delete',
    });
    const dialog = await root.getHarness(
      OgeModalHarness.with({ title: 'Delete row?' }),
    );
    expect(await dialog.getContentText()).toContain('This cannot be undone.');
    expect(await dialog.getButtonTexts()).toEqual(['Cancel', 'Delete']);
    await dialog.clickButton('Delete');
    await expect(answer).resolves.toBe(true);
  });
});
