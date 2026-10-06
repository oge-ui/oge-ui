'use client';

import { Fragment, useMemo, type CSSProperties, type ReactNode } from 'react';
import {
  addLaneCommand,
  bpmnListCellLabel,
  bpmnListRemoveLabel,
  bpmnListWithCell,
  bpmnListWithRow,
  bpmnListWithout,
  fillBpmnMessages,
  bpmnClearColorsCommand,
  bpmnColorInputValue,
  bpmnCompensationCommand,
  bpmnDefaultFlowCommand,
  bpmnLaneNameLabel,
  bpmnMarkerCommand,
  bpmnPresetCommand,
  bpmnPresetLabel,
  bpmnRemoveLaneLabel,
  buildBpmnPropertiesModel,
  morphNodeCommand,
  removeLaneCommand,
  renameLaneCommand,
  setBoundaryInterruptingCommand,
  setCalledElementCommand,
  setConditionCommand,
  setElementColorsCommand,
  setEventDefinitionCommand,
  toggleSubProcessCollapseCommand,
  updateLabelCommand,
  updateProcessCommand,
  type BpmnCommand,
  type BpmnDiagram,
  type BpmnEventDefinitionKind,
  type BpmnFlowNodeType,
  type OgeBpmnListRow,
  type OgeBpmnMessages,
  type OgeBpmnPropertiesEntry,
  type OgeBpmnPropertiesGroup,
  type OgeBpmnPropertiesValue,
} from '@oge-ui/bpmn-engine';
import {
  NativeCheckbox,
  NativeColor,
  NativeSelect,
  NativeTextField,
} from './native-field';

/** What a `renderPropertiesEntry` render prop receives besides the entry. */
export interface OgeBpmnPropertiesEntryRenderContext {
  /** Commits a value through the entry's `set` (one undoable command). */
  commit: (value: OgeBpmnPropertiesValue) => void;
  /** The DOM id the entry's label carries (point `aria-labelledby` at it). */
  inputId: string;
}

/** Props of the internal {@link BpmnProperties}. */
export interface BpmnPropertiesProps {
  /** Provider groups for the selection (built-in G5b fields included). */
  groups?: readonly OgeBpmnPropertiesGroup[];
  /** Draws `custom` entries. */
  renderEntry?: (
    entry: OgeBpmnPropertiesEntry,
    context: OgeBpmnPropertiesEntryRenderContext,
  ) => ReactNode;
  /** Unique per-instance prefix for field ids. */
  uid: string;
  diagram: BpmnDiagram;
  selection: readonly string[];
  messages: OgeBpmnMessages;
  colorPresets: readonly string[];
  style?: CSSProperties;
  onCommandRequested: (command: BpmnCommand) => void;
}

/**
 * Internal properties panel of the BPMN editor — the React render of the
 * Angular `oge-bpmn-properties`, over the same engine view model
 * (`buildBpmnPropertiesModel`) and the same field → command mapping. Every
 * commit is one undoable engine command; Escape inside a text field reverts
 * it to the model value without committing.
 */
export function BpmnProperties({
  uid,
  diagram,
  selection,
  messages,
  colorPresets,
  style,
  groups = [],
  renderEntry,
  onCommandRequested: emit,
}: BpmnPropertiesProps): ReactNode {
  const p = useMemo(
    () => buildBpmnPropertiesModel(diagram, selection, messages),
    [diagram, selection, messages],
  );
  const msg = messages.properties;
  const view = p.view;

  const idRow = (id: string) => (
    <div className="oge-bpmn-props-field">
      <span className="oge-bpmn-props-label">{msg.id}</span>
      <span className="oge-bpmn-props-id">{id}</span>
    </div>
  );
  const nameField = (inputId: string, id: string, value: string) => (
    <div className="oge-bpmn-props-field">
      <label className="oge-bpmn-props-label" htmlFor={inputId}>
        {msg.name}
      </label>
      <NativeTextField
        id={inputId}
        className="oge-bpmn-props-input"
        value={value}
        onCommit={(next) => emit(updateLabelCommand(id, next))}
      />
    </div>
  );

  let body: ReactNode = null;
  switch (view.kind) {
    case 'process':
      body = (
        <>
          <h3 className="oge-bpmn-props-heading">{msg.processHeading}</h3>
          {idRow(diagram.processId)}
          <div className="oge-bpmn-props-field">
            <label className="oge-bpmn-props-label" htmlFor={`${uid}-pname`}>
              {msg.name}
            </label>
            <NativeTextField
              id={`${uid}-pname`}
              className="oge-bpmn-props-input"
              value={diagram.processName ?? ''}
              onCommit={(next) => emit(updateProcessCommand({ name: next }))}
            />
          </div>
          <label className="oge-bpmn-props-check">
            <NativeCheckbox
              checked={diagram.isExecutable}
              onCommit={(checked) =>
                emit(updateProcessCommand({ isExecutable: checked }))
              }
            />
            {msg.executable}
          </label>
        </>
      );
      break;
    case 'multi':
      body = <p className="oge-bpmn-props-summary">{p.multiSummary}</p>;
      break;
    case 'node': {
      const node = view.node;
      body = (
        <>
          <h3 className="oge-bpmn-props-heading">{view.typeName}</h3>
          {idRow(node.id)}
          {nameField(`${uid}-name`, node.id, node.name ?? '')}
          {p.morph && (
            <div className="oge-bpmn-props-field">
              <label className="oge-bpmn-props-label" htmlFor={`${uid}-type`}>
                {msg.typeLabel}
              </label>
              <NativeSelect
                id={`${uid}-type`}
                className="oge-bpmn-props-input oge-bpmn-props-select"
                value={p.morph.current}
                onCommit={(next) =>
                  emit(morphNodeCommand(node.id, next as BpmnFlowNodeType))
                }
              >
                {p.morph.options.map((option) => (
                  <option
                    key={option.type}
                    value={option.type}
                    disabled={option.disabled}
                    title={option.reason ?? undefined}
                  >
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          {p.eventDefinition && (
            <div className="oge-bpmn-props-field">
              <label className="oge-bpmn-props-label" htmlFor={`${uid}-evdef`}>
                {msg.eventDefinition}
              </label>
              <NativeSelect
                id={`${uid}-evdef`}
                className="oge-bpmn-props-input oge-bpmn-props-select oge-bpmn-props-eventdef"
                value={p.eventDefinition.current ?? ''}
                onCommit={(next) =>
                  emit(
                    setEventDefinitionCommand(
                      node.id,
                      next === ''
                        ? undefined
                        : (next as BpmnEventDefinitionKind),
                    ),
                  )
                }
              >
                <option value="">{msg.noneOption}</option>
                {p.eventDefinition.kinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {msg.eventDefinitionNames[kind]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          {p.boundary && (
            <label className="oge-bpmn-props-check">
              <NativeCheckbox
                className="oge-bpmn-props-interrupting"
                checked={p.boundary.interrupting}
                onCommit={(checked) =>
                  emit(setBoundaryInterruptingCommand(node.id, checked))
                }
              />
              {msg.interrupting}
            </label>
          )}
          {p.subProcess && (
            <label className="oge-bpmn-props-check">
              <NativeCheckbox
                className="oge-bpmn-props-collapsed"
                checked={p.subProcess.collapsed}
                onCommit={(checked) =>
                  emit(toggleSubProcessCollapseCommand(node.id, checked))
                }
              />
              {msg.collapsed}
            </label>
          )}
          {p.calledElement && (
            <div className="oge-bpmn-props-field">
              <label className="oge-bpmn-props-label" htmlFor={`${uid}-called`}>
                {msg.calledElement}
              </label>
              <NativeTextField
                id={`${uid}-called`}
                className="oge-bpmn-props-input oge-bpmn-props-called"
                value={p.calledElement.calledElement}
                onCommit={(next) =>
                  emit(
                    setCalledElementCommand(
                      node.id,
                      next === '' ? undefined : next,
                    ),
                  )
                }
              />
            </div>
          )}
          {p.marker && (
            <>
              <div className="oge-bpmn-props-field">
                <label
                  className="oge-bpmn-props-label"
                  htmlFor={`${uid}-marker`}
                >
                  {msg.marker}
                </label>
                <NativeSelect
                  id={`${uid}-marker`}
                  className="oge-bpmn-props-input oge-bpmn-props-select oge-bpmn-props-marker"
                  value={p.marker.loopMarker ?? ''}
                  onCommit={(next) =>
                    p.marker && emit(bpmnMarkerCommand(p.marker, next))
                  }
                >
                  <option value="">{msg.noneOption}</option>
                  {p.marker.loopKinds.map((marker) => (
                    <option key={marker} value={marker}>
                      {msg.markerNames[marker]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <label className="oge-bpmn-props-check">
                <NativeCheckbox
                  className="oge-bpmn-props-compensation"
                  checked={p.marker.compensation}
                  onCommit={(checked) =>
                    p.marker && emit(bpmnCompensationCommand(p.marker, checked))
                  }
                />
                {msg.forCompensation}
              </label>
            </>
          )}
        </>
      );
      break;
    }
    case 'annotation':
      body = (
        <div className="oge-bpmn-props-field">
          <label className="oge-bpmn-props-label" htmlFor={`${uid}-text`}>
            {msg.annotationText}
          </label>
          <NativeTextField
            id={`${uid}-text`}
            className="oge-bpmn-props-input oge-bpmn-props-textarea"
            multiline
            value={view.node.text}
            onCommit={(next) => emit(updateLabelCommand(view.node.id, next))}
          />
        </div>
      );
      break;
    case 'flow': {
      const edge = view.edge;
      body = (
        <>
          {idRow(edge.id)}
          {nameField(`${uid}-fname`, edge.id, edge.name ?? '')}
          <div className="oge-bpmn-props-field">
            <label className="oge-bpmn-props-label" htmlFor={`${uid}-cond`}>
              {msg.condition}
            </label>
            <NativeTextField
              id={`${uid}-cond`}
              className="oge-bpmn-props-input oge-bpmn-props-textarea"
              multiline
              value={edge.conditionExpression ?? ''}
              onCommit={(next) =>
                emit(
                  setConditionCommand(edge.id, next === '' ? undefined : next),
                )
              }
            />
          </div>
          {view.canDefault && (
            <label className="oge-bpmn-props-check">
              <NativeCheckbox
                checked={view.isDefault}
                onCommit={(checked) =>
                  emit(bpmnDefaultFlowCommand(edge, checked))
                }
              />
              {msg.defaultFlow}
            </label>
          )}
        </>
      );
      break;
    }
    case 'messageFlow':
      body = (
        <>
          <h3 className="oge-bpmn-props-heading">{p.messageFlowTypeName}</h3>
          {idRow(view.edge.id)}
          {nameField(`${uid}-mfname`, view.edge.id, view.edge.name ?? '')}
        </>
      );
      break;
    case 'pool': {
      const pool = view.pool;
      body = (
        <>
          <h3 className="oge-bpmn-props-heading">{view.typeName}</h3>
          {idRow(pool.id)}
          {nameField(`${uid}-poolname`, pool.id, pool.name ?? '')}
          <h3 className="oge-bpmn-props-heading">{msg.lanesHeading}</h3>
          {pool.lanes.map((lane) => (
            <div
              key={lane.id}
              className="oge-bpmn-props-field oge-bpmn-props-lane"
            >
              <NativeTextField
                className="oge-bpmn-props-input oge-bpmn-props-lane-name"
                value={lane.name ?? ''}
                ariaLabel={bpmnLaneNameLabel(messages, lane)}
                onCommit={(next) =>
                  emit(renameLaneCommand(pool.id, lane.id, next))
                }
              />
              <button
                type="button"
                className="oge-bpmn-props-lane-remove"
                aria-label={bpmnRemoveLaneLabel(messages, lane)}
                title={bpmnRemoveLaneLabel(messages, lane)}
                onClick={() => emit(removeLaneCommand(pool.id, lane.id))}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="oge-bpmn-props-add-lane"
            onClick={() => emit(addLaneCommand(pool.id))}
          >
            {msg.addLane}
          </button>
        </>
      );
      break;
    }
    case 'other':
      body = (
        <>
          <h3 className="oge-bpmn-props-heading">{view.typeName}</h3>
          {idRow(view.id)}
        </>
      );
      break;
  }

  const resolved = fillBpmnMessages(messages);
  const commitEntry = (
    entry: OgeBpmnPropertiesEntry,
    value: OgeBpmnPropertiesValue,
  ): void => {
    const command = entry.set?.(value) ?? null;
    if (command !== null) emit(command);
  };
  const text = (entry: OgeBpmnPropertiesEntry): string =>
    typeof entry.value === 'string' ? entry.value : '';
  const rows = (entry: OgeBpmnPropertiesEntry): readonly OgeBpmnListRow[] =>
    Array.isArray(entry.value)
      ? (entry.value as readonly OgeBpmnListRow[])
      : [];
  const renderGroupEntry = (entry: OgeBpmnPropertiesEntry): ReactNode => {
    const inputId = `${uid}-x-${entry.id}`;
    const describedBy = entry.description ? `${uid}-d-${entry.id}` : undefined;
    const disabled = entry.disabled === true || !entry.set;
    let field: ReactNode;
    switch (entry.type) {
      case 'checkbox':
        field = (
          <label className="oge-bpmn-props-check" data-entry={entry.id}>
            <NativeCheckbox
              id={inputId}
              checked={entry.value === true}
              disabled={disabled}
              describedBy={describedBy}
              onCommit={(checked) => commitEntry(entry, checked)}
            />
            {entry.label}
          </label>
        );
        break;
      case 'select':
        field = (
          <div className="oge-bpmn-props-field" data-entry={entry.id}>
            <label className="oge-bpmn-props-label" htmlFor={inputId}>
              {entry.label}
            </label>
            <NativeSelect
              id={inputId}
              className="oge-bpmn-props-input oge-bpmn-props-select"
              value={text(entry)}
              disabled={disabled}
              describedBy={describedBy}
              onCommit={(next) => commitEntry(entry, next)}
            >
              {(entry.options ?? []).map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled === true}
                >
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        );
        break;
      case 'list':
        field = (
          <div
            className="oge-bpmn-props-field oge-bpmn-props-list"
            data-entry={entry.id}
            role="group"
            aria-labelledby={inputId}
          >
            <span className="oge-bpmn-props-label" id={inputId}>
              {entry.label}
            </span>
            {rows(entry).map((row, i) => (
              <div className="oge-bpmn-props-list-row" key={i}>
                {(entry.columns ?? []).map((column) => (
                  <NativeTextField
                    key={column.key}
                    className="oge-bpmn-props-input oge-bpmn-props-list-cell"
                    value={row[column.key] ?? ''}
                    placeholder={column.label}
                    disabled={disabled}
                    ariaLabel={bpmnListCellLabel(resolved, entry, column, i)}
                    onCommit={(next) =>
                      commitEntry(
                        entry,
                        bpmnListWithCell(rows(entry), i, column.key, next),
                      )
                    }
                  />
                ))}
                <button
                  type="button"
                  className="oge-bpmn-props-list-remove"
                  disabled={disabled}
                  aria-label={bpmnListRemoveLabel(resolved, entry, i)}
                  title={bpmnListRemoveLabel(resolved, entry, i)}
                  onClick={() =>
                    commitEntry(entry, bpmnListWithout(rows(entry), i))
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="oge-bpmn-props-list-add"
              disabled={disabled}
              onClick={() =>
                commitEntry(
                  entry,
                  bpmnListWithRow(rows(entry), entry.columns ?? []),
                )
              }
            >
              {resolved.extensions.addItem}
            </button>
          </div>
        );
        break;
      case 'custom':
        field = (
          <div className="oge-bpmn-props-field" data-entry={entry.id}>
            <span className="oge-bpmn-props-label" id={inputId}>
              {entry.label}
            </span>
            {renderEntry?.(entry, {
              commit: (value) => commitEntry(entry, value),
              inputId,
            })}
          </div>
        );
        break;
      default:
        field = (
          <div className="oge-bpmn-props-field" data-entry={entry.id}>
            <label className="oge-bpmn-props-label" htmlFor={inputId}>
              {entry.label}
            </label>
            <NativeTextField
              id={inputId}
              className={
                entry.type === 'expression'
                  ? 'oge-bpmn-props-input oge-bpmn-props-textarea oge-bpmn-props-expression'
                  : entry.type === 'textarea'
                    ? 'oge-bpmn-props-input oge-bpmn-props-textarea'
                    : 'oge-bpmn-props-input'
              }
              multiline={entry.type !== 'text'}
              spellCheck={entry.type === 'expression' ? false : undefined}
              value={text(entry)}
              placeholder={entry.placeholder ?? ''}
              disabled={disabled}
              describedBy={describedBy}
              onCommit={(next) => commitEntry(entry, next)}
            />
          </div>
        );
    }
    return (
      <Fragment key={entry.id}>
        {field}
        {entry.description && (
          <p className="oge-bpmn-props-description" id={describedBy}>
            {entry.description}
          </p>
        )}
      </Fragment>
    );
  };
  const groupBlocks = groups.map((group) => (
    <div
      key={group.id}
      className="oge-bpmn-props-group"
      data-group={group.id}
      role={group.label ? 'group' : undefined}
      aria-labelledby={group.label ? `${uid}-g-${group.id}` : undefined}
    >
      {group.label && (
        <h3 className="oge-bpmn-props-heading" id={`${uid}-g-${group.id}`}>
          {group.label}
        </h3>
      )}
      {group.entries.map(renderGroupEntry)}
    </div>
  ));

  const ap = p.appearance;
  return (
    // Composite name keeps sibling editors' panels distinguishable (axe
    // landmark-unique); tabIndex makes the scrollable region keyboard
    // reachable (axe scrollable-region-focusable).
    <div
      className="oge-bpmn-properties"
      role="region"
      aria-label={p.regionLabel}
      tabIndex={0}
      style={style}
    >
      {body}
      {groupBlocks}
      {ap && (
        <>
          <h3 className="oge-bpmn-props-heading">{msg.appearanceHeading}</h3>
          <div
            className="oge-bpmn-props-swatches"
            role="group"
            aria-label={msg.appearanceHeading}
          >
            {colorPresets.map((color) => (
              <button
                key={color}
                type="button"
                className="oge-bpmn-props-swatch"
                style={{ background: color }}
                aria-label={bpmnPresetLabel(messages, color)}
                title={bpmnPresetLabel(messages, color)}
                onClick={() => emit(bpmnPresetCommand(ap.ids, color))}
              />
            ))}
          </div>
          <div className="oge-bpmn-props-field">
            <label className="oge-bpmn-props-label" htmlFor={`${uid}-fill`}>
              {msg.fillLabel}
            </label>
            <NativeColor
              id={`${uid}-fill`}
              className="oge-bpmn-props-color"
              value={bpmnColorInputValue(ap.fill, '#ffffff')}
              onCommit={(next) =>
                emit(setElementColorsCommand(ap.ids, { fill: next }))
              }
            />
          </div>
          <div className="oge-bpmn-props-field">
            <label className="oge-bpmn-props-label" htmlFor={`${uid}-stroke`}>
              {msg.strokeLabel}
            </label>
            <NativeColor
              id={`${uid}-stroke`}
              className="oge-bpmn-props-color"
              value={bpmnColorInputValue(ap.stroke, '#000000')}
              onCommit={(next) =>
                emit(setElementColorsCommand(ap.ids, { stroke: next }))
              }
            />
          </div>
          <button
            type="button"
            className="oge-bpmn-props-clear"
            onClick={() => emit(bpmnClearColorsCommand(ap.ids))}
          >
            {msg.clearColors}
          </button>
        </>
      )}
    </div>
  );
}
