import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OGE_LIVE_ANNOUNCER_ATTR, getOgeLiveAnnouncer } from '@oge-ui/behavior';
import { OgeLiveAnnouncer } from './live-announcer';

const region = (mode: 'polite' | 'assertive') =>
  document.querySelector(`[${OGE_LIVE_ANNOUNCER_ATTR}="${mode}"]`);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('OgeLiveAnnouncer', () => {
  afterEach(() => getOgeLiveAnnouncer().clear());

  it('speaks through the document’s shared polite and assertive regions', async () => {
    const announcer = TestBed.inject(OgeLiveAnnouncer);
    announcer.announce('Changes saved');
    announcer.announce('Upload failed', 'assertive');
    await wait(150);
    expect(region('polite')?.textContent).toBe('Changes saved');
    expect(region('assertive')?.textContent).toBe('Upload failed');
    expect(
      document.querySelectorAll(`[${OGE_LIVE_ANNOUNCER_ATTR}]`),
    ).toHaveLength(2);
  });

  it('clear() empties the regions', async () => {
    const announcer = TestBed.inject(OgeLiveAnnouncer);
    announcer.announce('Soon gone');
    await wait(150);
    announcer.clear();
    expect(region('polite')?.textContent).toBe('');
  });

  it('is a no-op on the server platform', async () => {
    document.body.innerHTML = '';
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    const announcer = TestBed.inject(OgeLiveAnnouncer);
    announcer.announce('Not on the server');
    await wait(150);
    expect(region('polite')).toBeNull();
  });
});
