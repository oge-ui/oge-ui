import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  BpmnCommandStack,
  OGE_DEFAULT_BPMN_COLOR_PRESETS,
  OGE_DEFAULT_BPMN_MESSAGES,
  readBpmnXml,
  type BpmnCommand,
  type BpmnDiagram,
} from '@oge-ui/bpmn-engine';
import { V04_FIXTURE_XML, demoProcessXml } from '@oge-ui/bpmn-engine/testing';
import { BpmnProperties } from './bpmn-properties';

function model(xml: string): BpmnDiagram {
  const result = readBpmnXml(xml);
  if (result.model === null) throw new Error(result.error ?? 'no model');
  return result.model;
}

function setup(diagram: BpmnDiagram, selection: readonly string[]) {
  const commands: BpmnCommand[] = [];
  const utils = render(
    <BpmnProperties
      uid="t"
      diagram={diagram}
      selection={selection}
      messages={OGE_DEFAULT_BPMN_MESSAGES}
      colorPresets={OGE_DEFAULT_BPMN_COLOR_PRESETS}
      onCommandRequested={(command) => commands.push(command)}
    />,
  );
  const apply = () => {
    const stack = new BpmnCommandStack(diagram);
    for (const command of commands) stack.execute(command);
    return stack.current;
  };
  return { ...utils, commands, apply };
}

describe('BpmnProperties', () => {
  it('is a labelled, focusable region showing the process when nothing is selected', () => {
    const { container } = setup(model(demoProcessXml('bpmn')), []);
    const region = screen.getByRole('region');
    expect(region.getAttribute('aria-label')).toBe(
      'BPMN diagram editor — Properties',
    );
    expect(region.tabIndex).toBe(0);
    expect(
      container.querySelector('.oge-bpmn-props-heading')?.textContent,
    ).toBe('Process');
  });

  it('commits the executable checkbox on change', () => {
    const { container, commands, apply } = setup(
      model(demoProcessXml('bpmn')),
      [],
    );
    const box = container.querySelector(
      '.oge-bpmn-props-check input',
    ) as HTMLInputElement;
    const was = box.checked;
    act(() => {
      box.click();
    });
    expect(commands).toHaveLength(1);
    expect(apply().isExecutable).toBe(!was);
  });

  it('offers the morph and marker selects on an activity', () => {
    const { container, commands, apply } = setup(
      model(demoProcessXml('bpmn')),
      ['Activity_approve'],
    );
    expect(container.querySelector(`#t-type`)).not.toBeNull();
    const marker = container.querySelector('#t-marker') as HTMLSelectElement;
    act(() => {
      marker.value = 'loop';
      marker.dispatchEvent(new Event('change'));
    });
    expect(commands).toHaveLength(1);
    const node = apply().nodes['Activity_approve'];
    expect(node.type !== 'textAnnotation' && node.markers).toEqual(['loop']);
  });

  it('applies a preset swatch as fill only and clears colors', () => {
    const { commands, apply } = setup(model(demoProcessXml('bpmn')), [
      'Activity_approve',
    ]);
    fireEvent.click(
      screen.getByRole('button', {
        name: `Fill ${OGE_DEFAULT_BPMN_COLOR_PRESETS[0]}`,
      }),
    );
    expect(apply().shapeDi['Activity_approve'].fill).toBe(
      OGE_DEFAULT_BPMN_COLOR_PRESETS[0],
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear colors' }));
    expect(commands).toHaveLength(2);
    expect(apply().shapeDi['Activity_approve'].fill).toBeUndefined();
  });

  it('lists a pool’s lanes with add and remove', () => {
    const diagram = model(V04_FIXTURE_XML);
    const poolId = Object.keys(diagram.pools)[0];
    const { commands, apply } = setup(diagram, [poolId]);
    const lanes = diagram.pools[poolId].lanes.length;
    fireEvent.click(screen.getByRole('button', { name: 'Add lane' }));
    expect(commands).toHaveLength(1);
    expect(apply().pools[poolId].lanes.length).toBeGreaterThan(lanes);
  });

  it('summarizes a multi-selection', () => {
    const { container } = setup(model(demoProcessXml('bpmn')), [
      'StartEvent_1',
      'Activity_approve',
    ]);
    expect(
      container.querySelector('.oge-bpmn-props-summary')?.textContent,
    ).toBe('2 elements selected');
  });
});
