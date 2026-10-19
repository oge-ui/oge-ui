import { StrictMode, createRef } from 'react';
import { renderToString } from 'react-dom/server';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type {
  OgeAiRequest,
  OgeAiTransport,
  OgeSmartPasteField,
  OgeSmartPasteTarget,
} from '@oge-ui/behavior';
import { OgeAiConfigProvider } from './ai-config';
import {
  OgeSmartPaste,
  type OgeSmartPasteHandle,
  type OgeSmartPasteProps,
} from './smart-paste';

class FakeForm implements OgeSmartPasteTarget {
  data: Record<string, unknown> = { name: '', seats: null, plan: 'free' };
  describeFields(): readonly OgeSmartPasteField[] {
    return [
      {
        field: 'name',
        label: 'Full name',
        dataType: 'string',
        value: this.data['name'],
      },
      {
        field: 'seats',
        label: 'Seats',
        dataType: 'number',
        value: this.data['seats'],
      },
      {
        field: 'plan',
        label: 'Plan',
        dataType: 'string',
        values: [
          { value: 'free', text: 'Free' },
          { value: 'pro', text: 'Pro' },
        ],
        value: this.data['plan'],
      },
    ];
  }
  updateData(values: Record<string, unknown>): void {
    this.data = { ...this.data, ...values };
  }
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
  async reply(value: unknown): Promise<void> {
    await act(async () => {
      this.release.shift()?.(JSON.stringify(value));
    });
  }
}

const REPLY = {
  status: 'apply',
  summary: 'Ada, 5 seats on Pro',
  values: { name: 'Ada Lovelace', seats: 5, plan: 'Pro' },
};

function setup(
  props: Partial<OgeSmartPasteProps> = {},
  clipboard: () => Promise<string> = async () =>
    'Ada Lovelace, 5 seats, Pro plan',
) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { readText: clipboard },
  });
  const form = new FakeForm();
  const transport = new ManualTransport();
  const handle = createRef<OgeSmartPasteHandle>();
  render(
    <StrictMode>
      <OgeAiConfigProvider config={{ transport, locale: 'en-US' }}>
        <OgeSmartPaste
          ref={handle}
          target={form}
          messages={{ label: 'Fill from clipboard' }}
          {...props}
        />
      </OgeAiConfigProvider>
    </StrictMode>,
  );
  return { form, transport, handle };
}

describe('<OgeSmartPaste>', () => {
  it('reads the clipboard, shows the same proposal table and applies — under StrictMode', async () => {
    const onApplied = vi.fn();
    const { form, transport } = setup({ onApplied });
    expect(
      screen.getByRole('group', { name: 'Fill from clipboard' }),
    ).toHaveClass('oge-smart-paste');
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Fill from clipboard' }),
      );
    });
    expect(transport.requests[0].messages[1].content).toContain(
      'Ada Lovelace, 5 seats',
    );
    await transport.reply(REPLY);

    const table = within(
      screen.getByRole('group', { name: 'Proposed values' }),
    ).getByRole('table');
    const rows = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => [...row.children].map((c) => c.textContent));
    expect(rows).toEqual([
      ['Full name', '(empty)', 'Ada Lovelace'],
      ['Seats', '(empty)', '5'],
      ['Plan', 'Free', 'Pro'],
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(form.data).toEqual({ name: 'Ada Lovelace', seats: 5, plan: 'pro' });
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('3 fields filled.');

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(form.data).toEqual({ name: '', seats: null, plan: 'free' });
  });

  it('falls back to the text area when the clipboard is denied', async () => {
    const { form, transport } = setup({ mode: 'apply' }, async () => {
      throw new DOMException('denied', 'NotAllowedError');
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Fill from clipboard' }),
      );
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'clipboard could not be read',
    );
    expect(
      screen.getByRole('button', { name: 'Paste text instead' }),
    ).toHaveAttribute('aria-expanded', 'true');
    const area = screen.getByLabelText('Text to fill the form from');
    fireEvent.change(area, { target: { value: 'Ada, 5 seats' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fill the form' }));
    await transport.reply(REPLY);
    expect(form.data['seats']).toBe(5);
    expect(screen.queryByLabelText('Text to fill the form from')).toBeNull();
  });

  it('accepts a ref object as target and exposes the handle', async () => {
    const form = new FakeForm();
    const transport = new ManualTransport();
    const handle = createRef<OgeSmartPasteHandle>();
    render(
      <OgeSmartPaste
        ref={handle}
        target={{ current: form }}
        transport={transport}
        mode="apply"
      />,
    );
    let pending!: Promise<void>;
    act(() => {
      pending = handle.current!.paste('Ada, 5 seats');
    });
    await transport.reply(REPLY);
    await act(async () => {
      await pending;
    });
    expect(form.data['name']).toBe('Ada Lovelace');
  });

  it('server-renders without touching the clipboard', () => {
    const html = renderToString(<OgeSmartPaste target={new FakeForm()} />);
    expect(html).toContain('oge-smart-paste');
    expect(html).toContain('Smart paste');
  });
});
