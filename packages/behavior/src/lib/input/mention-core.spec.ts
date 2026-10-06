import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { ogeCaretRect } from './caret-rect';
import {
  OgeMentionCore,
  ogeFindMentionQuery,
  ogeInsertMention,
  ogeMentionKeyCommand,
  ogeShiftMentions,
  type OgeMentionCoreDeps,
  type OgeMentionToken,
  type OgeMentionTrigger,
} from './mention-core';

const rx: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next) => (value = next);
    return cell;
  },
  derived: (compute) => compute,
};

interface User {
  id: number;
  name: string;
}

const USERS: User[] = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Alan' },
  { id: 3, name: 'Grace' },
];

function core(
  triggers: OgeMentionTrigger<User>[],
  overrides: Partial<OgeMentionCoreDeps<User>> = {},
) {
  return new OgeMentionCore<User>(
    {
      inputId: () => 'm',
      triggers: () => triggers,
      minSearchLength: () => 0,
      maxSuggestions: () => 10,
      allowSpaces: () => false,
      insertSpace: () => true,
      searchMode: () => 'contains',
      searchDebounceMs: () => 0,
      scrollActiveIntoView: () => undefined,
      ...overrides,
    },
    rx,
  );
}

const people: OgeMentionTrigger<User> = {
  char: '@',
  items: USERS,
  displayExpr: 'name',
  valueExpr: 'id',
};

afterEach(() => vi.useRealTimers());

describe('ogeFindMentionQuery', () => {
  it('finds a trigger at the start or after whitespace', () => {
    expect(ogeFindMentionQuery('@ad', 3, ['@'])).toEqual({
      trigger: '@',
      start: 0,
      text: 'ad',
    });
    expect(ogeFindMentionQuery('hi #to', 6, ['@', '#'])).toEqual({
      trigger: '#',
      start: 3,
      text: 'to',
    });
    expect(ogeFindMentionQuery('hi @', 4, ['@'])?.text).toBe('');
  });

  it('ignores triggers inside words, across spaces and line breaks', () => {
    expect(ogeFindMentionQuery('mail@host', 9, ['@'])).toBeNull();
    expect(ogeFindMentionQuery('@ada lo', 7, ['@'])).toBeNull();
    expect(ogeFindMentionQuery('@ada\nlo', 7, ['@'])).toBeNull();
    expect(
      ogeFindMentionQuery('@ada lo', 7, ['@'], { allowSpaces: true })?.text,
    ).toBe('ada lo');
    expect(ogeFindMentionQuery('@ada', 0, ['@'])).toBeNull();
    expect(ogeFindMentionQuery('@ada', 4, [])).toBeNull();
  });

  it('stops looking past maxLength', () => {
    expect(
      ogeFindMentionQuery('@abcdef', 7, ['@'], { maxLength: 3 }),
    ).toBeNull();
  });
});

describe('ogeInsertMention', () => {
  it('replaces the query with the token and a space', () => {
    const result = ogeInsertMention(
      'hi @gr and',
      { trigger: '@', start: 3, text: 'gr' },
      6,
      'Grace',
    );
    expect(result).toEqual({
      text: 'hi @Grace and',
      caret: 10,
      start: 3,
      end: 9,
    });
  });

  it('adds the space at the end of the text and skips it when off', () => {
    expect(
      ogeInsertMention('@a', { trigger: '@', start: 0, text: 'a' }, 2, 'Ada')
        .text,
    ).toBe('@Ada ');
    expect(
      ogeInsertMention(
        '@a',
        { trigger: '@', start: 0, text: 'a' },
        2,
        'Ada',
        false,
      ),
    ).toEqual({ text: '@Ada', caret: 4, start: 0, end: 4 });
  });
});

describe('ogeShiftMentions', () => {
  const token = (start: number, text = 'Ada'): OgeMentionToken<string> => ({
    trigger: '@',
    item: text,
    value: text,
    text,
    start,
    end: start + 1 + text.length,
  });

  it('shifts tokens after an edit and keeps tokens before it', () => {
    const tokens = [token(0), token(9, 'Alan')];
    const shifted = ogeShiftMentions(
      tokens,
      '@Ada and @Alan',
      '@Ada and so @Alan',
    );
    expect(shifted.map((t) => t.start)).toEqual([0, 12]);
  });

  it('drops a token the edit touched or glued to a word', () => {
    expect(ogeShiftMentions([token(0)], '@Ada hi', '@Adx hi')).toEqual([]);
    expect(ogeShiftMentions([token(0)], '@Ada', '@Adax')).toEqual([]);
    expect(ogeShiftMentions([token(1)], ' @Ada', 'x@Ada')).toEqual([]);
    expect(ogeShiftMentions([token(0)], '@Ada', '@Ada,')).toHaveLength(1);
    expect(ogeShiftMentions([token(0)], '@Ada', '')).toEqual([]);
  });

  it('is a copy when nothing changed', () => {
    const tokens = [token(0)];
    const same = ogeShiftMentions(tokens, '@Ada', '@Ada');
    expect(same).toEqual(tokens);
    expect(same).not.toBe(tokens);
  });
});

describe('ogeMentionKeyCommand', () => {
  it('maps the list keys and leaves the rest to the field', () => {
    expect(ogeMentionKeyCommand('ArrowDown')).toBe('next');
    expect(ogeMentionKeyCommand('ArrowUp')).toBe('previous');
    expect(ogeMentionKeyCommand('PageUp')).toBe('first');
    expect(ogeMentionKeyCommand('PageDown')).toBe('last');
    expect(ogeMentionKeyCommand('Enter')).toBe('select');
    expect(ogeMentionKeyCommand('Tab')).toBe('select');
    expect(ogeMentionKeyCommand('Escape')).toBeNull();
    expect(ogeMentionKeyCommand('a')).toBeNull();
  });
});

describe('OgeMentionCore', () => {
  it('opens on a trigger, filters, and activates the first suggestion', () => {
    const machine = core([people]);
    expect(machine.update('hello @', 7)).toBe(true);
    expect(machine.visibleItems()).toHaveLength(3);
    machine.update('hello @al', 9);
    expect(machine.visibleItems().map((u) => u.name)).toEqual(['Alan']);
    expect(machine.activeItem()?.name).toBe('Alan');
    expect(machine.list.activeDescendant()).toBe('m-option-0');
    machine.update('hello there', 11);
    expect(machine.opened()).toBe(false);
  });

  it('honours minSearchLength and maxSuggestions', () => {
    const machine = core([people], {
      minSearchLength: () => 1,
      maxSuggestions: () => 1,
    });
    machine.update('@', 1);
    expect(machine.opened()).toBe(false);
    machine.update('@a', 2);
    expect(machine.opened()).toBe(true);
    expect(machine.visibleItems()).toHaveLength(1);
  });

  it('moves the active option with the key commands', () => {
    const machine = core([people]);
    machine.update('@', 1);
    machine.move('next');
    expect(machine.activeItem()?.name).toBe('Alan');
    machine.move('last');
    expect(machine.activeItem()?.name).toBe('Grace');
    machine.move('first');
    expect(machine.activeItem()?.name).toBe('Ada');
    machine.move('previous');
    expect(machine.activeItem()?.name).toBe('Ada');
  });

  it('inserts the token, records it and keeps it through later edits', () => {
    const machine = core([people]);
    machine.update('hi @gr', 6);
    const result = machine.select(USERS[2], 'hi @gr', 6)!;
    expect(result.insertion.text).toBe('hi @Grace ');
    expect(result.token).toMatchObject({
      trigger: '@',
      value: 3,
      text: 'Grace',
      start: 3,
      end: 9,
    });
    expect(machine.opened()).toBe(false);
    expect(machine.noteTextChange('hi @Grace ', 'oh hi @Grace ')).toBe(true);
    expect(machine.tokens()[0].start).toBe(6);
    expect(machine.noteTextChange('oh hi @Grace ', 'oh hi @Grac ')).toBe(true);
    expect(machine.tokens()).toEqual([]);
    expect(machine.select(USERS[0], 'x', 1)).toBeNull();
  });

  it('with allowSpaces, a finished token or a matchless spaced query stays closed', () => {
    const machine = core([people], { allowSpaces: () => true });
    machine.update('@gr', 3);
    const { insertion } = machine.select(USERS[2], '@gr', 3)!;
    expect(insertion.text).toBe('@Grace ');
    expect(machine.update('@Grace and', 10)).toBe(false);
    machine.update('@zz top', 7);
    expect(machine.opened()).toBe(false);
    machine.update('@zz', 3);
    expect(machine.opened()).toBe(true);
  });

  it('keeps an Escape-dismissed query closed until a new trigger', () => {
    const machine = core([people]);
    machine.update('@a', 2);
    machine.dismiss();
    expect(machine.update('@al', 3)).toBe(false);
    expect(machine.update('@al @', 5)).toBe(true);
  });

  it('serves several triggers with their own items', () => {
    const tags: OgeMentionTrigger<User> = {
      char: '#',
      items: [{ id: 9, name: 'urgent' }],
      displayExpr: 'name',
    };
    const machine = core([people, tags]);
    machine.update('#u', 2);
    expect(machine.activeTrigger()?.char).toBe('#');
    expect(machine.visibleItems().map((u) => u.name)).toEqual(['urgent']);
    expect(machine.displayOf(machine.visibleItems()[0])).toBe('urgent');
  });

  it('calls a query function (debounced) and ignores stale answers', async () => {
    vi.useFakeTimers();
    const resolvers: ((items: User[]) => void)[] = [];
    const source = vi.fn(
      (query: string) =>
        new Promise<User[]>((resolve) => {
          void query;
          resolvers.push(resolve);
        }),
    );
    const searches: string[] = [];
    const machine = core([{ char: '@', items: source, displayExpr: 'name' }], {
      searchDebounceMs: () => 100,
      onSearchChanged: (e) => searches.push(e.text),
    });
    machine.update('@a', 2);
    expect(machine.loading()).toBe(true);
    machine.update('@ad', 3);
    vi.advanceTimersByTime(100);
    expect(source).toHaveBeenCalledTimes(1);
    expect(source).toHaveBeenCalledWith('ad');
    machine.update('@ada', 4);
    vi.advanceTimersByTime(100);
    resolvers[0]([USERS[1]]);
    resolvers[1]([USERS[0]]);
    await Promise.resolve();
    await Promise.resolve();
    expect(machine.visibleItems()).toEqual([USERS[0]]);
    expect(machine.activeItem()).toEqual(USERS[0]);
    expect(searches).toEqual(['a', 'ad', 'ada']);
    machine.destroy();
  });

  it('reports a failed or throwing query function', async () => {
    const machine = core([
      { char: '@', items: () => Promise.reject(new Error('x')) },
    ]);
    machine.update('@', 1);
    await Promise.resolve();
    await Promise.resolve();
    expect(machine.failed()).toBe(true);
    const throwing = core([
      {
        char: '@',
        items: () => {
          throw new Error('boom');
        },
      },
    ]);
    throwing.update('@', 1);
    expect(throwing.failed()).toBe(true);
    throwing.close();
    expect(throwing.failed()).toBe(false);
  });
});

describe('ogeCaretRect', () => {
  it('measures relative to the field and cleans its mirror up', () => {
    const area = document.createElement('textarea');
    document.body.appendChild(area);
    area.value = 'hello @a';
    const rect = ogeCaretRect(area, 8);
    expect(rect).not.toBeNull();
    expect(rect!.width).toBe(0);
    expect(rect!.height).toBeGreaterThan(0);
    expect(document.body.querySelectorAll('div[aria-hidden]')).toHaveLength(0);
    area.remove();
  });
});
