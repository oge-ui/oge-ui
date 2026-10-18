import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { GridStateSnapshot } from '@oge-ui/core';
import {
  provideOgeAiConfig,
  type OgeAiGridColumn,
  type OgeAiRequest,
  type OgeAiTransport,
  type OgeGridAssistantAppliedEvent,
  type OgeGridAssistantMode,
  type OgeGridAssistantTarget,
} from '../config';
import { OgeGridAssistant } from './grid-assistant';

const COLUMNS: OgeAiGridColumn[] = [
  {
    field: 'name',
    caption: 'Name',
    dataType: 'string',
    sortable: true,
    filterable: true,
    groupable: true,
    visible: true,
  },
  {
    field: 'city',
    caption: 'City',
    dataType: 'string',
    sortable: true,
    filterable: true,
    groupable: true,
    visible: true,
  },
];

class FakeGrid implements OgeGridAssistantTarget {
  current: GridStateSnapshot = {};
  applied: GridStateSnapshot[] = [];
  state(): GridStateSnapshot {
    return this.current;
  }
  applyState(snapshot: GridStateSnapshot): void {
    this.current = snapshot;
    this.applied.push(snapshot);
  }
  describeColumns(): readonly OgeAiGridColumn[] {
    return COLUMNS;
  }
}

/** A transport whose replies the spec releases by hand. */
class ManualTransport implements OgeAiTransport {
  readonly requests: OgeAiRequest[] = [];
  private release: ((text: string) => void)[] = [];
  aborted = 0;
  complete(request: OgeAiRequest, options?: { signal?: AbortSignal }) {
    this.requests.push(request);
    options?.signal?.addEventListener('abort', () => this.aborted++);
    return new Promise<{ text: string }>((resolve) => {
      this.release.push((text) => resolve({ text }));
    });
  }
  reply(value: unknown): void {
    this.release.shift()?.(JSON.stringify(value));
  }
}

const SORT = {
  status: 'apply',
  summary: 'Sorted by city',
  sort: [{ field: 'city', dir: 'asc' }],
};

@Component({
  imports: [OgeGridAssistant],
  template: `
    <oge-grid-assistant
      [target]="grid"
      [mode]="mode()"
      [suggestions]="suggestions()"
      [disabled]="disabled()"
      [messages]="{ submit: 'Send' }"
      (applied)="applied.push($event)"
      (applying)="$event.cancel = veto"
    />
  `,
})
class Host {
  readonly grid = new FakeGrid();
  readonly mode = signal<OgeGridAssistantMode>('preview');
  readonly suggestions = signal<readonly string[]>(['Sort by city']);
  readonly disabled = signal(false);
  readonly assistant = viewChild.required(OgeGridAssistant);
  readonly applied: OgeGridAssistantAppliedEvent[] = [];
  veto = false;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  fixture.detectChanges();
}

function setup(transport: OgeAiTransport | null = new ManualTransport()) {
  TestBed.configureTestingModule({
    providers: [provideOgeAiConfig({ transport, locale: 'en-US' })],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = <E extends Element>(sel: string) => el.querySelector<E>(sel);
  return { fixture, host: fixture.componentInstance, el, q, transport };
}

function type(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new Event('input'));
}

describe('OgeGridAssistant', () => {
  it('renders a labelled region, field, submit button and status region', () => {
    const { q } = setup();
    const region = q('.oge-grid-assistant')!;
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-label')).toBe('Ask the grid');
    const input = q<HTMLInputElement>('.oge-grid-assistant-input')!;
    expect(input.getAttribute('aria-label')).toBe('Ask the grid');
    const status = q('.oge-grid-assistant-status')!;
    expect(status.getAttribute('role')).toBe('status');
    expect(input.getAttribute('aria-describedby')).toBe(status.id);
    const submit = q<HTMLButtonElement>('.oge-grid-assistant-submit')!;
    expect(submit.textContent?.trim()).toBe('Send');
    expect(submit.disabled).toBe(true);
  });

  it('submits, shows a proposal and applies it to the grid', async () => {
    const { fixture, host, q, transport } = setup();
    const manual = transport as ManualTransport;
    type(q<HTMLInputElement>('.oge-grid-assistant-input')!, 'by city');
    fixture.detectChanges();
    q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(q('.oge-grid-assistant')!.getAttribute('aria-busy')).toBe('true');
    expect(q('.oge-grid-assistant-stop')).not.toBeNull();
    expect(manual.requests[0].messages.at(-1)?.content).toBe('by city');

    manual.reply(SORT);
    await settle(fixture);
    const proposal = q('.oge-grid-assistant-proposal')!;
    expect(proposal.getAttribute('role')).toBe('group');
    expect(q('.oge-grid-assistant-summary')!.textContent).toContain(
      'Sorted by city',
    );
    expect(q('.oge-grid-assistant-slice')!.textContent?.trim()).toBe('Sort');
    expect(host.grid.applied).toEqual([]);

    q<HTMLButtonElement>('.oge-grid-assistant-apply')!.click();
    fixture.detectChanges();
    expect(host.grid.current.sort).toEqual([{ field: 'city', dir: 'asc' }]);
    expect(host.applied[0].summary).toBe('Sorted by city');
    expect(q('.oge-grid-assistant-status')!.textContent?.trim()).toBe(
      'Applied: Sorted by city',
    );
    expect(document.activeElement).toBe(q('.oge-grid-assistant-input'));
  });

  it('undo restores the previous state and suggestions run as prompts', async () => {
    const { fixture, host, q, transport } = setup();
    const manual = transport as ManualTransport;
    host.mode.set('apply');
    fixture.detectChanges();
    q<HTMLButtonElement>('.oge-grid-assistant-chip')!.click();
    expect(manual.requests[0].messages.at(-1)?.content).toBe('Sort by city');
    manual.reply(SORT);
    await settle(fixture);
    expect(host.grid.current.sort).toEqual([{ field: 'city', dir: 'asc' }]);
    // suggestions hide once there is something to undo
    expect(q('.oge-grid-assistant-suggestions')).toBeNull();
    q<HTMLButtonElement>('.oge-grid-assistant-undo')!.click();
    fixture.detectChanges();
    expect(host.grid.current).toEqual({});
    expect(q('.oge-grid-assistant-undo')).toBeNull();
  });

  it('Escape stops a request, then discards a proposal', async () => {
    const { fixture, q, transport } = setup();
    const manual = transport as ManualTransport;
    const input = q<HTMLInputElement>('.oge-grid-assistant-input')!;
    type(input, 'x');
    q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    expect(manual.aborted).toBe(1);
    expect(q('.oge-grid-assistant-status')!.textContent?.trim()).toBe(
      'Stopped.',
    );

    q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    manual.reply({ status: 'clarify', summary: 'first' });
    manual.reply(SORT);
    await settle(fixture);
    expect(q('.oge-grid-assistant-proposal')).not.toBeNull();
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    expect(q('.oge-grid-assistant-proposal')).toBeNull();
  });

  it('lets an applying handler veto and reports a missing transport', async () => {
    const vetoed = setup();
    vetoed.host.veto = true;
    vetoed.host.mode.set('apply');
    vetoed.fixture.detectChanges();
    void vetoed.host.assistant().submit('sort');
    (vetoed.transport as ManualTransport).reply(SORT);
    await settle(vetoed.fixture);
    expect(vetoed.host.grid.applied).toEqual([]);

    TestBed.resetTestingModule();
    const none = setup(null);
    await none.host.assistant().submit('sort');
    await settle(none.fixture);
    const status = none.q('.oge-grid-assistant-status')!;
    expect(status.textContent?.trim()).toBe('No AI service is configured.');
    expect(status.classList).toContain('oge-grid-assistant-status-error');
  });

  it('disables every control', () => {
    const { fixture, host, q } = setup();
    host.disabled.set(true);
    fixture.detectChanges();
    expect(q<HTMLInputElement>('.oge-grid-assistant-input')!.disabled).toBe(
      true,
    );
    expect(q<HTMLButtonElement>('.oge-grid-assistant-chip')!.disabled).toBe(
      true,
    );
  });
});
