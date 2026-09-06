'use client';

import type { ReactNode } from 'react';
import type { FilterOperator } from '@oge-ui/core';
import {
  OGE_DEFAULT_GRID_MESSAGES,
  operatorsFor,
  type OgeBuilderCondition,
  type OgeBuilderGroup,
  type OgeDataType,
  type OgeFilterBuilderField,
  type OgeGridMessages,
} from '@oge-ui/behavior';
import { OgeSelectBox, OgeTextBox } from '@oge-ui/react-inputs';

export interface OgeFilterBuilderGroupProps {
  /** The mutable condition/group tree this node renders and edits. */
  group: OgeBuilderGroup;
  /** Filterable fields offered in the condition dropdowns. */
  fields: readonly OgeFilterBuilderField[];
  /** Localized strings; defaults to the built-in English messages. */
  messages?: OgeGridMessages;
  /** True on the outermost group — hides the remove-group button. */
  root?: boolean;
  /** Called after any mutation (logic, field, operator, value, add/remove). */
  onTreeChanged?: () => void;
  /** Asks the parent group to remove this subgroup from its items. */
  onRemoveRequest?: () => void;
}

const removeGlyph = (
  <svg
    viewBox="0 0 16 16"
    width="11"
    height="11"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
  >
    <path d="m4 4 8 8M12 4l-8 8" />
  </svg>
);

/**
 * Visual editor for arbitrary and/or condition trees (`FilterExpr`) — the
 * React render of `<oge-filter-builder-group>`. Recursive: it renders itself
 * for nested groups.
 *
 * The tree is **mutated in place** and the host is told to re-render through
 * `onTreeChanged`, exactly as the Angular editor does. That is deliberate: the
 * builder's kernel (`builderToExpr` / `exprToBuilder` / `operatorsFor`) is the
 * framework-free one in `@oge-ui/behavior`, and it works on a plain mutable
 * tree — rebuilding an immutable copy per keystroke here would fork the data
 * model between the two layers for no gain.
 */
export function OgeFilterBuilderGroup(
  props: OgeFilterBuilderGroupProps,
): ReactNode {
  const {
    group,
    fields,
    messages = OGE_DEFAULT_GRID_MESSAGES,
    root = false,
    onTreeChanged,
    onRemoveRequest,
  } = props;

  const changed = (): void => onTreeChanged?.();

  const dataTypeOf = (condition: OgeBuilderCondition): OgeDataType =>
    fields.find((field) => field.field === condition.field)?.dataType ??
    'string';

  const textValueOf = (condition: OgeBuilderCondition): string =>
    condition.value == null ? '' : String(condition.value);

  const booleanItems = [
    { value: 'true', text: messages.booleanTrue },
    { value: 'false', text: messages.booleanFalse },
  ];

  const setLogic = (logic: 'and' | 'or'): void => {
    group.logic = logic;
    changed();
  };

  const addCondition = (): void => {
    const first = fields[0];
    if (!first) return;
    group.items.push({
      kind: 'condition',
      field: first.field,
      op: operatorsFor(first.dataType)[0],
      value: '',
    });
    changed();
  };

  const addGroup = (): void => {
    group.items.push({ kind: 'group', logic: 'and', items: [] });
    changed();
  };

  const removeAt = (index: number): void => {
    group.items.splice(index, 1);
    changed();
  };

  const setField = (index: number, field: string): void => {
    const item = group.items[index];
    if (item.kind !== 'condition') return;
    item.field = field;
    const ops = operatorsFor(dataTypeOf(item));
    if (!ops.includes(item.op)) item.op = ops[0];
    changed();
  };

  const setOp = (index: number, op: FilterOperator): void => {
    const item = group.items[index];
    if (item.kind !== 'condition') return;
    item.op = op;
    changed();
  };

  const setValue = (index: number, value: string): void => {
    const item = group.items[index];
    if (item.kind !== 'condition') return;
    item.value = value;
    changed();
  };

  const valueEditor = (item: OgeBuilderCondition, index: number): ReactNode => {
    if (item.op === 'isnull' || item.op === 'isnotnull') return null;
    const dataType = dataTypeOf(item);
    if (dataType === 'boolean') {
      return (
        <OgeSelectBox
          className="oge-fb-input"
          size="sm"
          labelMode="hidden"
          subscriptSizing="none"
          label={messages.filterValuePlaceholder}
          items={booleanItems}
          displayExpr="text"
          valueExpr="value"
          value={item.value}
          onValueCommitted={(event) =>
            setValue(index, String(event.value ?? 'true'))
          }
        />
      );
    }
    if (dataType === 'date') {
      return (
        <input
          className="oge-fb-input"
          type="date"
          placeholder={messages.filterValuePlaceholder}
          value={textValueOf(item)}
          onChange={(event) => setValue(index, event.target.value)}
        />
      );
    }
    return (
      <OgeTextBox
        className="oge-fb-input"
        size="sm"
        labelMode="hidden"
        subscriptSizing="none"
        label={messages.filterValuePlaceholder}
        placeholder={messages.filterValuePlaceholder}
        inputMode={dataType === 'number' ? 'decimal' : undefined}
        value={textValueOf(item)}
        onInputChange={(event) => setValue(index, event.text)}
      />
    );
  };

  return (
    <div className={root ? 'oge-fb-group oge-fb-root' : 'oge-fb-group'}>
      <div className="oge-fb-logic" role="group">
        {(['and', 'or'] as const).map((logic) => (
          <button
            key={logic}
            type="button"
            className={
              group.logic === logic
                ? 'oge-fb-logic-btn oge-fb-logic-active'
                : 'oge-fb-logic-btn'
            }
            onClick={() => setLogic(logic)}
          >
            {logic === 'and' ? messages.logicAnd : messages.logicOr}
          </button>
        ))}
        <button type="button" className="oge-fb-add" onClick={addCondition}>
          + {messages.addCondition}
        </button>
        <button type="button" className="oge-fb-add" onClick={addGroup}>
          + {messages.addGroup}
        </button>
        {root ? null : (
          <button
            type="button"
            className="oge-fb-remove"
            aria-label={messages.removeItem}
            onClick={() => onRemoveRequest?.()}
          >
            {removeGlyph}
          </button>
        )}
      </div>
      {group.items.map((item, index) =>
        item.kind === 'condition' ? (
          <div key={index} className="oge-fb-condition">
            <select
              className="oge-fb-input"
              value={item.field}
              onChange={(event) => setField(index, event.target.value)}
            >
              {fields.map((fieldMeta) => (
                <option key={fieldMeta.field} value={fieldMeta.field}>
                  {fieldMeta.caption}
                </option>
              ))}
            </select>
            <select
              className="oge-fb-input"
              value={item.op}
              onChange={(event) =>
                setOp(index, event.target.value as FilterOperator)
              }
            >
              {operatorsFor(dataTypeOf(item)).map((op) => (
                <option key={op} value={op}>
                  {messages.operators[op]}
                </option>
              ))}
            </select>
            {valueEditor(item, index)}
            <button
              type="button"
              className="oge-fb-remove"
              aria-label={messages.removeItem}
              onClick={() => removeAt(index)}
            >
              {removeGlyph}
            </button>
          </div>
        ) : (
          <OgeFilterBuilderGroup
            key={index}
            group={item}
            fields={fields}
            messages={messages}
            onTreeChanged={onTreeChanged}
            onRemoveRequest={() => removeAt(index)}
          />
        ),
      )}
    </div>
  );
}
