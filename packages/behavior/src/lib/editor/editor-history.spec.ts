import { describe, expect, it } from 'vitest';
import { OgeEditorHistory } from './editor-history';
import {
  ogeEditorCaret,
  ogeEditorEmptyDoc,
  ogeEditorParagraph,
  ogeEditorText,
} from './editor-model';

const entry = (text: string) => ({
  doc: { blocks: [ogeEditorParagraph(text ? [ogeEditorText(text)] : [])] },
  selection: ogeEditorCaret({ block: 0, offset: text.length }),
});

describe('OgeEditorHistory', () => {
  it('undoes and redoes model states', () => {
    const history = new OgeEditorHistory();
    history.record(entry(''), 'format');
    expect(history.canUndo).toBe(true);
    const back = history.undo(entry('x'));
    expect(back?.doc.blocks[0].inlines).toEqual([]);
    expect(history.canRedo).toBe(true);
    const forward = history.redo(back!);
    expect(forward?.doc.blocks[0].inlines[0]).toMatchObject({ text: 'x' });
  });

  it('coalesces a typing run, and a space ends the run', () => {
    let now = 0;
    const history = new OgeEditorHistory({ now: () => now });
    history.record(entry(''), 'typing', 'a');
    now += 100;
    history.record(entry('a'), 'typing', 'b');
    now += 100;
    history.record(entry('ab'), 'typing', ' ');
    now += 100;
    history.record(entry('ab '), 'typing', 'c');
    // entries: '' (a+b), 'ab' (the space), 'ab ' (c)
    expect(history.undo(entry('ab c'))?.doc.blocks[0].inlines[0]).toMatchObject(
      { text: 'ab ' },
    );
    expect(history.undo(entry('ab '))?.doc.blocks[0].inlines[0]).toMatchObject({
      text: 'ab',
    });
    expect(history.undo(entry('ab'))?.doc.blocks[0].inlines).toEqual([]);
    expect(history.canUndo).toBe(false);
  });

  it('a pause or a different kind of change starts a new entry', () => {
    let now = 0;
    const history = new OgeEditorHistory({ now: () => now, coalesceMs: 500 });
    history.record(entry(''), 'typing', 'a');
    now += 1000;
    history.record(entry('a'), 'typing', 'b');
    history.record(entry('ab'), 'format');
    history.record(entry('ab'), 'deleting');
    history.record(entry('a'), 'deleting');
    let count = 0;
    while (history.undo(entry('x'))) count++;
    expect(count).toBe(4);
  });

  it('breakRun ends a run without recording anything', () => {
    const history = new OgeEditorHistory({ now: () => 0 });
    history.record(entry(''), 'typing', 'a');
    history.breakRun();
    history.record(entry('a'), 'typing', 'b');
    let count = 0;
    while (history.undo(entry('x'))) count++;
    expect(count).toBe(2);
  });

  it('a new change clears the redo stack; the limit drops the oldest entries', () => {
    const history = new OgeEditorHistory({ limit: 2 });
    history.record(entry('1'), 'format');
    history.record(entry('2'), 'format');
    history.record(entry('3'), 'format');
    history.undo(entry('4'));
    history.record(entry('5'), 'format');
    expect(history.canRedo).toBe(false);
    let count = 0;
    while (history.undo(entry('x'))) count++;
    expect(count).toBe(2);
  });

  it('clear forgets everything', () => {
    const history = new OgeEditorHistory();
    history.record(
      {
        doc: ogeEditorEmptyDoc(),
        selection: ogeEditorCaret({ block: 0, offset: 0 }),
      },
      'paste',
    );
    history.clear();
    expect(history.canUndo).toBe(false);
    expect(history.undo(entry('x'))).toBeNull();
  });
});
