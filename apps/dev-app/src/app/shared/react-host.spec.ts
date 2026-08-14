import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { createElement, type ReactNode } from 'react';
import { ReactHost } from './react-host';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  // React's root renders on a microtask of its own
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

@Component({
  imports: [ReactHost],
  template: `<app-react-host [render]="tree" />`,
})
class Host {
  readonly label = signal('first');
  readonly tree = (): ReactNode =>
    createElement('button', { className: 'probe' }, this.label());
}

describe('<app-react-host>', () => {
  it('mounts the React tree into the DOM', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);

    const button = fixture.nativeElement.querySelector('button.probe');
    expect(button).not.toBeNull();
    expect(button.textContent).toBe('first');
  });

  it('re-renders when an Angular signal the tree reads changes', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);

    fixture.componentInstance.label.set('second');
    await settle(fixture);

    expect(
      fixture.nativeElement.querySelector('button.probe').textContent,
    ).toBe('second');
  });

  it('tears the root down without throwing when the host is destroyed', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(() => fixture.destroy()).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
