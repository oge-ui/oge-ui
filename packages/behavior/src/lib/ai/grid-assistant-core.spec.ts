import { describe, expect, it, vi } from 'vitest';
import type { GridStateSnapshot } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { OGE_DEFAULT_AI_CONFIG, type OgeGridAssistantMode } from './ai-config';
import {
  OgeAiError,
  type OgeAiRequest,
  type OgeAiTransport,
} from './ai-transport';
import {
  OGE_GRID_AI_ALL_CAPABILITIES,
  type OgeAiGridColumn,
} from './grid-ai-context';
import {
  OgeGridAssistantCore,
  type OgeGridAssistantCoreOptions,
  type OgeGridAssistantTarget,
} from './grid-assistant-core';

/** A plain-closure adapter: no memoization, so nothing depends on a framework's caching. */
const PLAIN: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};

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
];

function fakeGrid(initial: GridStateSnapshot = {}): OgeGridAssistantTarget & {
  current: GridStateSnapshot;
} {
  const grid = {
    current: initial,
    state: () => grid.current,
    applyState: vi.fn((snapshot: GridStateSnapshot) => {
      grid.current = snapshot;
    }),
    describeColumns: () => COLUMNS,
  };
  return grid;
}

function replying(...texts: string[]): OgeAiTransport & {
  requests: OgeAiRequest[];
} {
  const requests: OgeAiRequest[] = [];
  let i = 0;
  return {
    requests,
    complete: vi.fn(async (request: OgeAiRequest) => {
      requests.push(request);
      return { text: texts[Math.min(i++, texts.length - 1)] };
    }),
  };
}

const SORT_REPLY = JSON.stringify({
  status: 'apply',
  summary: 'Sorted by name',
  sort: [{ field: 'name', dir: 'desc' }],
});

function setup(
  transport: OgeAiTransport | null,
  overrides: Partial<Omit<OgeGridAssistantCoreOptions, 'mode'>> & {
    mode?: OgeGridAssistantMode;
  } = {},
) {
  const grid = fakeGrid();
  const { mode = 'preview', ...rest } = overrides;
  const events = {
    applying: vi.fn(),
    applied: vi.fn(),
    undone: vi.fn(),
    errorOccurred: vi.fn(),
  };
  const core = new OgeGridAssistantCore({
    adapter: PLAIN,
    target: () => grid,
    transport: () => transport,
    mode: () => mode,
    capabilities: () => OGE_GRID_AI_ALL_CAPABILITIES,
    instructions: () => undefined,
    messages: () => OGE_DEFAULT_AI_CONFIG.messages.gridAssistant,
    locale: () => 'en-US',
    historyLimit: () => 4,
    undoLimit: () => 20,
    now: () => new Date(2026, 9, 18),
    ...events,
    ...rest,
  });
  return { core, grid, events };
}

describe('OgeGridAssistantCore', () => {
  it('proposes a change in preview mode and applies it on demand', async () => {
    const { core, grid, events } = setup(replying(SORT_REPLY));
    core.setPrompt('  newest names first ');
    expect(core.canSubmit()).toBe(true);
    const pending = core.submit();
    expect(core.status()).toBe('thinking');
    expect(core.busy()).toBe(true);
    expect(core.statusText()).toBe('Thinking…');
    await pending;

    expect(core.status()).toBe('preview');
    expect(core.statusText()).toBe('Proposed: Sorted by name');
    expect(core.proposal()?.slices).toEqual(['sort']);
    expect(grid.applyState).not.toHaveBeenCalled();

    core.apply();
    expect(grid.current.sort).toEqual([{ field: 'name', dir: 'desc' }]);
    expect(core.status()).toBe('applied');
    expect(core.statusText()).toBe('Applied: Sorted by name');
    expect(core.prompt()).toBe('');
    expect(core.canUndo()).toBe(true);
    expect(events.applied).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'newest names first',
        summary: 'Sorted by name',
        previousSnapshot: {},
        slices: ['sort'],
      }),
    );
  });

  it('applies at once in apply mode, and undo restores the previous state', async () => {
    const { core, grid, events } = setup(replying(SORT_REPLY), {
      mode: 'apply',
    });
    await core.submit('sort');
    expect(grid.current.sort).toEqual([{ field: 'name', dir: 'desc' }]);
    core.undo();
    expect(grid.current).toEqual({});
    expect(core.canUndo()).toBe(false);
    expect(core.statusText()).toBe('Change undone.');
    expect(events.undone).toHaveBeenCalledWith({
      summary: 'Sorted by name',
      snapshot: {},
    });
  });

  it('lets an applying handler veto the change', async () => {
    const { core, grid } = setup(replying(SORT_REPLY), {
      mode: 'apply',
      applying: (event) => {
        event.cancel = true;
      },
    });
    await core.submit('sort');
    expect(grid.applyState).not.toHaveBeenCalled();
    expect(core.status()).toBe('idle');
  });

  it('discards a proposal without touching the grid', async () => {
    const { core, grid } = setup(replying(SORT_REPLY));
    await core.submit('sort');
    core.discard();
    expect(core.proposal()).toBeNull();
    expect(core.statusText()).toBe('Proposal discarded.');
    expect(grid.applyState).not.toHaveBeenCalled();
  });

  it('replays applied turns as history for follow-ups', async () => {
    const transport = replying(SORT_REPLY, SORT_REPLY);
    const { core } = setup(transport, { mode: 'apply' });
    await core.submit('sort by name');
    await core.submit('and again');
    const second = transport.requests[1].messages.slice(1);
    expect(second).toEqual([
      { role: 'user', content: 'sort by name' },
      {
        role: 'assistant',
        content: '{"status":"apply","summary":"Sorted by name"}',
      },
      { role: 'user', content: 'and again' },
    ]);
  });

  it('reports clarify, unsupported, unchanged and ignored parts', async () => {
    const transport = replying(
      '{"status":"clarify","summary":"Which year?"}',
      '{"status":"unsupported","summary":"There is no region column."}',
      '{"status":"apply","summary":"same","sort":[]}',
      '{"status":"apply","summary":"s","sort":[{"field":"name","dir":"asc"},{"field":"nope","dir":"asc"}]}',
    );
    const { core } = setup(transport);
    await core.submit('a');
    expect([core.status(), core.statusText()]).toEqual([
      'clarify',
      'Which year?',
    ]);
    await core.submit('b');
    expect(core.statusText()).toBe(
      'Not possible with these columns. There is no region column.',
    );
    await core.submit('c');
    expect(core.status()).toBe('unchanged');
    await core.submit('d');
    expect(core.warningText()).toBe(
      '1 part of the answer did not match the columns and was ignored.',
    );
  });

  it('fails cleanly without a transport, on errors and on unusable replies', async () => {
    const none = setup(null);
    await none.core.submit('x');
    expect(none.core.status()).toBe('error');
    expect(none.core.statusText()).toBe('No AI service is configured.');
    expect(none.events.errorOccurred).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'no-transport' }),
    );

    const failing = setup({
      complete: async () => {
        throw new OgeAiError('http', 'HTTP 500', 500);
      },
    });
    await failing.core.submit('x');
    expect(failing.core.statusText()).toBe(
      'The assistant is not available right now.',
    );
    expect(failing.events.errorOccurred).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'http', prompt: 'x' }),
    );

    const garbage = setup(replying('I cannot help with that.'));
    await garbage.core.submit('x');
    expect(garbage.core.status()).toBe('invalid');
    expect(garbage.events.errorOccurred).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'invalid-reply' }),
    );
  });

  it('cancels a request in flight and ignores its late reply', async () => {
    let release!: (text: string) => void;
    let seenSignal: AbortSignal | undefined;
    const transport: OgeAiTransport = {
      complete: (_request, options) =>
        new Promise((resolve) => {
          seenSignal = options?.signal;
          release = (text) => resolve({ text });
        }),
    };
    const { core, grid } = setup(transport, { mode: 'apply' });
    const pending = core.submit('sort');
    core.cancel();
    expect(seenSignal?.aborted).toBe(true);
    expect(core.status()).toBe('aborted');
    release(SORT_REPLY);
    await pending;
    expect(core.status()).toBe('aborted');
    expect(grid.applyState).not.toHaveBeenCalled();
  });

  it('a newer prompt supersedes the older one', async () => {
    const resolvers: ((text: string) => void)[] = [];
    const transport: OgeAiTransport = {
      complete: () =>
        new Promise((resolve) => resolvers.push((text) => resolve({ text }))),
    };
    const { core } = setup(transport);
    const first = core.submit('first');
    const second = core.submit('second');
    resolvers[1]('{"status":"clarify","summary":"second wins"}');
    resolvers[0]('{"status":"clarify","summary":"first"}');
    await Promise.all([first, second]);
    expect(core.summary()).toBe('second wins');
  });

  it('caps the undo stack and resets everything', async () => {
    const { core, grid } = setup(
      replying(
        SORT_REPLY,
        JSON.stringify({
          status: 'apply',
          summary: 'Asc',
          sort: [{ field: 'name', dir: 'asc' }],
        }),
      ),
      { mode: 'apply', undoLimit: () => 1 },
    );
    await core.submit('one');
    await core.submit('two');
    core.undo();
    expect(grid.current.sort).toEqual([{ field: 'name', dir: 'desc' }]);
    expect(core.canUndo()).toBe(false);
    core.setPrompt('draft');
    core.reset();
    expect([core.prompt(), core.status(), core.statusText()]).toEqual([
      '',
      'idle',
      '',
    ]);
  });

  it('uses host column overrides and ignores replies after destroy', async () => {
    const transport = replying(SORT_REPLY);
    const { core, grid } = setup(transport, {
      mode: 'apply',
      columns: () => [{ ...COLUMNS[0], description: 'Full legal name' }],
    });
    core.destroy();
    await core.submit('sort');
    expect(transport.requests).toHaveLength(0);
    core.revive();
    await core.submit('sort');
    expect(transport.requests[0].messages[0].content).toContain(
      'Full legal name',
    );
    expect(grid.applyState).toHaveBeenCalledTimes(1);
  });
});
