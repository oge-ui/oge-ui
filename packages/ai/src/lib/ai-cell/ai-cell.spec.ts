import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  createOgeAiColumn,
  provideOgeAiConfig,
  type OgeAiRequest,
  type OgeAiTransport,
} from '../config';
import { OgeAiCell } from './ai-cell';

interface Review {
  id: number;
  text: string;
}

class ManualTransport implements OgeAiTransport {
  readonly requests: OgeAiRequest[] = [];
  private release: ((text: string) => void)[] = [];
  complete(request: OgeAiRequest) {
    this.requests.push(request);
    return new Promise<{ text: string }>((resolve) => {
      this.release.push((text) => resolve({ text }));
    });
  }
  reply(values: { key: number; value: unknown }[]): void {
    this.release.shift()?.(JSON.stringify({ values }));
  }
}

@Component({
  imports: [OgeAiCell],
  template: `
    @for (row of rows(); track row.id) {
      <oge-ai-cell [column]="column" [row]="row" />
    }
  `,
})
class Host {
  readonly rows = signal<Review[]>([
    { id: 1, text: 'Loved it' },
    { id: 2, text: 'Awful' },
  ]);
  readonly column = createOgeAiColumn<Review>({
    prompt: 'Classify the sentiment',
    inputs: ['text'],
    keyField: 'id',
    values: [
      { value: 'pos', text: 'Positive' },
      { value: 'neg', text: 'Negative' },
    ],
  });
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  fixture.detectChanges();
}

function setup() {
  const transport = new ManualTransport();
  TestBed.configureTestingModule({
    providers: [provideOgeAiConfig({ transport, locale: 'en-US' })],
  });
  const fixture = TestBed.createComponent(Host);
  return { fixture, transport, el: fixture.nativeElement as HTMLElement };
}

describe('OgeAiCell', () => {
  it('batches the cells into one request through the provider transport and renders the values', async () => {
    const { fixture, transport, el } = setup();
    await settle(fixture);
    const cells = () => [...el.querySelectorAll('oge-ai-cell')];
    expect(transport.requests).toHaveLength(1);
    expect(cells().every((c) => c.getAttribute('aria-busy') === 'true')).toBe(
      true,
    );
    expect(cells()[0].querySelector('.oge-sr-only')?.textContent).toBe(
      'Generating…',
    );

    transport.reply([
      { key: 1, value: 'pos' },
      { key: 2, value: 'nope' },
    ]);
    await settle(fixture);
    expect(cells()[0].textContent?.trim()).toBe('Positive');
    expect(cells()[0].hasAttribute('aria-busy')).toBe(false);
    expect(cells()[1].classList).toContain('oge-ai-cell-failed');
    expect(cells()[1].querySelector('.oge-ai-cell-error')?.textContent).toBe(
      'Not available',
    );
  });

  it('retry asks again for that row only, without bubbling the click', async () => {
    const { fixture, transport, el } = setup();
    await settle(fixture);
    transport.reply([{ key: 1, value: 'pos' }]);
    await settle(fixture);
    const bubbled = vi.fn();
    el.addEventListener('click', bubbled);
    const retry = el
      .querySelectorAll('oge-ai-cell')[1]
      .querySelector<HTMLButtonElement>('.oge-ai-cell-retry')!;
    expect(retry.getAttribute('aria-label')).toBe('Try again');
    retry.click();
    await settle(fixture);
    expect(bubbled).not.toHaveBeenCalled();
    expect(transport.requests).toHaveLength(2);
    expect(transport.requests[1].messages[1].content).toBe(
      'Rows: [{"key":2,"text":"Awful"}]',
    );
    transport.reply([{ key: 2, value: 'neg' }]);
    await settle(fixture);
    expect(el.querySelectorAll('oge-ai-cell')[1].textContent?.trim()).toBe(
      'Negative',
    );
  });
});
