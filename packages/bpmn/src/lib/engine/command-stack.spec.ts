import type { BpmnDiagram } from './bpmn-model';
import { createEmptyDiagram } from './bpmn-model';
import type { BpmnCommand, BpmnCommandStackSource } from './command-stack';
import { BpmnCommandStack } from './command-stack';

function renameCommand(processId: string): BpmnCommand {
  return {
    label: `Rename to ${processId}`,
    apply: (model) => ({ ...model, processId }),
  };
}

const NOOP_COMMAND: BpmnCommand = { label: 'No-op', apply: (model) => model };

describe('BpmnCommandStack', () => {
  let initial: BpmnDiagram;
  let stack: BpmnCommandStack;

  beforeEach(() => {
    initial = createEmptyDiagram();
    stack = new BpmnCommandStack(initial);
  });

  describe('execute', () => {
    it('applies the command and updates current', () => {
      const next = stack.execute(renameCommand('Process_2'));
      expect(next.processId).toBe('Process_2');
      expect(stack.current).toBe(next);
      expect(stack.canUndo).toBe(true);
      expect(stack.canRedo).toBe(false);
    });

    it('does not push commands returning the same reference', () => {
      const result = stack.execute(NOOP_COMMAND);
      expect(result).toBe(initial);
      expect(stack.canUndo).toBe(false);
      expect(stack.isDirty).toBe(false);
    });

    it('clears the redo stack', () => {
      stack.execute(renameCommand('Process_2'));
      stack.undo();
      expect(stack.canRedo).toBe(true);
      stack.execute(renameCommand('Process_3'));
      expect(stack.canRedo).toBe(false);
    });
  });

  describe('undo/redo', () => {
    it('returns null when there is nothing to undo or redo', () => {
      expect(stack.undo()).toBeNull();
      expect(stack.redo()).toBeNull();
    });

    it('round-trips through undo and redo', () => {
      const changed = stack.execute(renameCommand('Process_2'));
      expect(stack.undo()).toBe(initial);
      expect(stack.current).toBe(initial);
      expect(stack.canRedo).toBe(true);
      expect(stack.redo()).toBe(changed);
      expect(stack.current).toBe(changed);
    });

    it('walks multiple steps in order', () => {
      stack.execute(renameCommand('Process_2'));
      stack.execute(renameCommand('Process_3'));
      expect(stack.undo()?.processId).toBe('Process_2');
      expect(stack.undo()?.processId).toBe('Process_1');
      expect(stack.redo()?.processId).toBe('Process_2');
      expect(stack.redo()?.processId).toBe('Process_3');
    });
  });

  describe('limit', () => {
    it('drops the oldest snapshots beyond the limit', () => {
      const limited = new BpmnCommandStack(initial, 2);
      limited.execute(renameCommand('Process_2'));
      limited.execute(renameCommand('Process_3'));
      limited.execute(renameCommand('Process_4'));
      expect(limited.undo()?.processId).toBe('Process_3');
      expect(limited.undo()?.processId).toBe('Process_2');
      expect(limited.undo()).toBeNull();
      expect(limited.current.processId).toBe('Process_2');
    });
  });

  describe('isDirty / markSaved', () => {
    it('starts clean and becomes dirty after a change', () => {
      expect(stack.isDirty).toBe(false);
      stack.execute(renameCommand('Process_2'));
      expect(stack.isDirty).toBe(true);
    });

    it('becomes clean at the save point and dirty when leaving it', () => {
      stack.execute(renameCommand('Process_2'));
      stack.markSaved();
      expect(stack.isDirty).toBe(false);
      stack.execute(renameCommand('Process_3'));
      expect(stack.isDirty).toBe(true);
    });

    it('reports clean again after undoing back to the save point', () => {
      stack.execute(renameCommand('Process_2'));
      stack.markSaved();
      stack.execute(renameCommand('Process_3'));
      stack.undo();
      expect(stack.isDirty).toBe(false);
      stack.redo();
      expect(stack.isDirty).toBe(true);
    });
  });

  describe('reset', () => {
    it('replaces the model and clears history and dirtiness', () => {
      stack.execute(renameCommand('Process_2'));
      const fresh = createEmptyDiagram('Process_new');
      stack.reset(fresh);
      expect(stack.current).toBe(fresh);
      expect(stack.canUndo).toBe(false);
      expect(stack.canRedo).toBe(false);
      expect(stack.isDirty).toBe(false);
    });
  });

  describe('onChange', () => {
    it('notifies with the model and the change source', () => {
      const seen: { model: BpmnDiagram; source: BpmnCommandStackSource }[] = [];
      stack.onChange((model, source) => seen.push({ model, source }));
      const changed = stack.execute(renameCommand('Process_2'));
      stack.undo();
      stack.redo();
      const fresh = createEmptyDiagram('Process_new');
      stack.reset(fresh);
      expect(seen.map((entry) => entry.source)).toEqual([
        'execute',
        'undo',
        'redo',
        'reset',
      ]);
      expect(seen[0].model).toBe(changed);
      expect(seen[1].model).toBe(initial);
      expect(seen[2].model).toBe(changed);
      expect(seen[3].model).toBe(fresh);
    });

    it('does not notify for no-op commands', () => {
      const sources: BpmnCommandStackSource[] = [];
      stack.onChange((_model, source) => sources.push(source));
      stack.execute(NOOP_COMMAND);
      expect(sources).toEqual([]);
    });

    it('stops notifying after unsubscribe', () => {
      const sources: BpmnCommandStackSource[] = [];
      const unsubscribe = stack.onChange((_model, source) =>
        sources.push(source),
      );
      stack.execute(renameCommand('Process_2'));
      unsubscribe();
      stack.execute(renameCommand('Process_3'));
      expect(sources).toEqual(['execute']);
    });
  });
});
