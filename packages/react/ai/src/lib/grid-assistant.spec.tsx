import { StrictMode, createRef } from 'react';
import { renderToString } from 'react-dom/server';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { GridStateSnapshot } from '@oge-ui/core';
import type {
  OgeAiGridColumn,
  OgeAiRequest,
  OgeAiTransport,
  OgeGridAssistantTarget,
} from '@oge-ui/behavior';
import { OgeAiConfigProvider } from './ai-config';
import {
  OgeGridAssistant,
  type OgeGridAssistantHandle,
  type OgeGridAssistantProps,
} from './grid-assistant';

const COLUMNS: OgeAiGridColumn[] = [
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
  async reply(value: unknown): Promise<void> {
    await act(async () => {
      this.release.shift()?.(JSON.stringify(value));
    });
  }
}

const SORT = {
  status: 'apply',
  summary: 'Sorted by city',
  sort: [{ field: 'city', dir: 'asc' }],
};

function setup(
  props: Partial<OgeGridAssistantProps> = {},
  transport: OgeAiTransport | null = new ManualTransport(),
) {
  const grid = new FakeGrid();
  const handle = createRef<OgeGridAssistantHandle>();
  const view = render(
    <StrictMode>
      <OgeAiConfigProvider config={{ transport, locale: 'en-US' }}>
        <OgeGridAssistant
          ref={handle}
          target={grid}
          suggestions={['Sort by city']}
          messages={{ submit: 'Send' }}
          {...props}
        />
      </OgeAiConfigProvider>
    </StrictMode>,
  );
  const input = () => screen.getByRole('textbox') as HTMLInputElement;
  return {
    grid,
    handle,
    view,
    input,
    transport: transport as ManualTransport,
  };
}

describe('<OgeGridAssistant>', () => {
  it('renders the same labelled region, field and status as the Angular one', () => {
    const { input } = setup();
    const region = screen.getByRole('region', { name: 'Ask the grid' });
    expect(region).toHaveClass('oge-grid-assistant');
    const status = screen.getByRole('status');
    expect(input()).toHaveAttribute('aria-describedby', status.id);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('submits, proposes and applies — under StrictMode', async () => {
    const onApplied = vi.fn();
    const { grid, input, transport } = setup({ onApplied });
    fireEvent.change(input(), { target: { value: 'by city' } });
    fireEvent.submit(input().form!);
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    expect(transport.requests[0].messages.at(-1)?.content).toBe('by city');

    await transport.reply(SORT);
    expect(
      screen.getByRole('group', { name: 'Proposed change' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sorted by city')).toBeInTheDocument();
    expect(screen.getByText('Sort')).toHaveClass('oge-grid-assistant-slice');
    expect(grid.applied).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(grid.current.sort).toEqual([{ field: 'city', dir: 'asc' }]);
    expect(onApplied).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Sorted by city' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Applied: Sorted by city',
    );
    expect(document.activeElement).toBe(input());
  });

  it('runs suggestions, applies at once in apply mode and undoes', async () => {
    const { grid, transport } = setup({ mode: 'apply' });
    fireEvent.click(screen.getByRole('button', { name: 'Sort by city' }));
    await transport.reply(SORT);
    expect(grid.current.sort).toEqual([{ field: 'city', dir: 'asc' }]);
    expect(screen.queryByRole('list', { name: 'Suggestions' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(grid.current).toEqual({});
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('Escape stops a request, then discards a proposal', async () => {
    const { input, transport } = setup();
    fireEvent.change(input(), { target: { value: 'x' } });
    fireEvent.submit(input().form!);
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(transport.aborted).toBe(1);
    expect(screen.getByRole('status')).toHaveTextContent('Stopped.');

    fireEvent.submit(input().form!);
    await transport.reply({ status: 'clarify', summary: 'first' });
    await transport.reply(SORT);
    expect(screen.getByRole('group')).toBeInTheDocument();
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('accepts a ref object as target and exposes the handle', async () => {
    const grid = new FakeGrid();
    const transport = new ManualTransport();
    const handle = createRef<OgeGridAssistantHandle>();
    const target = { current: grid };
    render(
      <OgeGridAssistant
        ref={handle}
        target={target}
        transport={transport}
        mode="apply"
      />,
    );
    let pending!: Promise<void>;
    act(() => {
      pending = handle.current!.submit('sort');
    });
    await transport.reply(SORT);
    await act(async () => {
      await pending;
    });
    expect(grid.current.sort).toEqual([{ field: 'city', dir: 'asc' }]);
    act(() => handle.current!.undo());
    expect(grid.current).toEqual({});
  });

  it('reports a missing transport as an error', async () => {
    const onErrorOccurred = vi.fn();
    const { handle } = setup({ onErrorOccurred }, null);
    await act(() => handle.current!.submit('sort'));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('No AI service is configured.');
    expect(status).toHaveClass('oge-grid-assistant-status-error');
    expect(onErrorOccurred).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'no-transport' }),
    );
  });

  it('server-renders without touching the target', () => {
    const html = renderToString(
      <OgeGridAssistant target={new FakeGrid()} suggestions={['a']} />,
    );
    expect(html).toContain('oge-grid-assistant');
    expect(html).toContain('role="status"');
  });
});
