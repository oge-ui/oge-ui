'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  emptyValueForDataType,
  evaluateOgeValidationRules,
  asyncValidationRules,
  formColumnsCount,
  formColumnsCss,
  messageForFieldError,
  orderByVisibleIndex,
  readPath,
  resolveItem,
  writePath,
  type OgeFieldError,
  type OgeFormColCount,
  type OgeFormErrorEntry,
  type OgeFormsMessages,
  type OgeResolvedFormItem,
} from '@oge-ui/behavior';
import { useOgeInputsConfig } from '@oge-ui/react-inputs';
import { OgeTabPanel } from '@oge-ui/react-tabs';
import { OgeAccordion } from '@oge-ui/react-layout';
import { OgeStepper } from '@oge-ui/react-navigation';
import { useOgeFormsConfig } from './forms-config';
import { OgeFormField, type OgeFormFieldHandle } from './form-field';
import { OgeValidationSummary } from './validation-summary';
import type {
  OgeFormGroupDefinition,
  OgeFormHandle,
  OgeFormItemDefinition,
  OgeFormNodeDefinition,
  OgeFormProps,
  OgeFormSectionDefinition,
} from './form-types';

/** The layout tree before the model is consulted — structure only. */
interface LayoutNode {
  readonly id: string;
  readonly kind: 'item' | 'group' | 'tabs' | 'accordion' | 'steps';
  readonly section?: OgeFormSectionDefinition;
  readonly sectionIndex?: number;
  readonly visibleIndex?: number;
  readonly itemId?: string;
  readonly caption?: string;
  readonly colCount?: OgeFormColCount;
  readonly colSpan: number;
  readonly cssClass?: string;
  readonly children?: readonly LayoutNode[];
  readonly renderCaption?: OgeFormGroupDefinition['renderCaption'];
  readonly renderItem?: OgeFormItemDefinition['renderItem'];
  readonly renderEditor?: OgeFormItemDefinition['renderEditor'];
  readonly renderLabel?: OgeFormItemDefinition['renderLabel'];
}

interface SourceEntry {
  readonly id: string;
  readonly source: OgeFormItemDefinition;
}

const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

const isSection = (
  node: OgeFormNodeDefinition,
): node is OgeFormSectionDefinition =>
  'kind' in node &&
  (node.kind === 'tabs' || node.kind === 'accordion' || node.kind === 'steps');

const isGroup = (node: OgeFormNodeDefinition): node is OgeFormGroupDefinition =>
  'caption' in node && !('field' in node);

/**
 * Form layout over the `@oge-ui/react-inputs` editors: labels, responsive
 * columns, nestable `<fieldset>` groups, tabbed / accordion / wizard sections,
 * declarative validation, a validation summary and submit.
 *
 * The model is the standard React controlled/uncontrolled pair — `formData` +
 * `onFormDataChange`, or `defaultFormData` — where Angular offers three
 * bindings (`[fieldTree]`, `[formGroup]`, `[(formData)]`): the other two are
 * Angular form engines with no React counterpart. Everything they drive is
 * shared anyway, because the item model and the rule evaluator live in
 * `@oge-ui/behavior` and both layers run exactly those (ADR 0001).
 *
 * ```tsx
 * <OgeForm
 *   defaultFormData={{ firstName: '', email: '' }}
 *   items={[
 *     { field: 'firstName', isRequired: true },
 *     { field: 'email', validationRules: [{ type: 'email' }] },
 *   ]}
 * />
 * ```
 */
function OgeFormInner<T extends object = Record<string, unknown>>(
  props: OgeFormProps<T>,
  ref: React.Ref<OgeFormHandle<T>>,
) {
  const config = useOgeFormsConfig();
  const inputsConfig = useOgeInputsConfig();
  const messages: OgeFormsMessages = useMemo(
    () => ({ ...config.messages, ...props.messages }),
    [config.messages, props.messages],
  );

  const colCount = props.colCount ?? 'auto';
  const minColWidth = props.minColWidth ?? config.minColWidth ?? 220;
  const labelLocation = props.labelLocation ?? config.labelLocation ?? 'top';
  const showRequiredMark =
    props.showRequiredMark ?? config.showRequiredMark ?? true;
  const showOptionalMark =
    props.showOptionalMark ?? config.showOptionalMark ?? false;
  const showColonAfterLabel =
    props.showColonAfterLabel ?? config.showColonAfterLabel ?? false;
  const size = props.size ?? 'md';
  const readOnly = props.readOnly ?? false;
  const disabled = props.disabled ?? false;
  const renderFormElement = props.renderFormElement ?? true;
  const scrollToFirstInvalid = props.scrollToFirstInvalid ?? true;

  const appearance = useMemo(
    () => ({
      size,
      stylingMode: props.stylingMode ?? ('outlined' as const),
      // a side label is drawn by the form, so the editor must not draw one too
      labelMode:
        labelLocation === 'top'
          ? (props.labelMode ?? 'static')
          : ('hidden' as const),
      subscriptSizing: props.subscriptSizing ?? ('fixed' as const),
    }),
    [
      size,
      props.stylingMode,
      props.labelMode,
      props.subscriptSizing,
      labelLocation,
    ],
  );

  // --- the bound model -------------------------------------------------------

  const [ownData, setOwnData] = useState<T>(props.defaultFormData ?? ({} as T));
  const data = props.formData !== undefined ? props.formData : ownData;
  const dataRef = useRef(data);
  dataRef.current = data;
  const initialData = useRef<T>(
    props.formData ?? props.defaultFormData ?? ({} as T),
  );

  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [asyncErrors, setAsyncErrors] = useState<
    Readonly<Record<string, string>>
  >({});

  const latest = useRef({ props, data });
  latest.current = { props, data };

  const writeData = useCallback((next: T) => {
    const previous = dataRef.current;
    if (Object.is(previous, next)) return;
    dataRef.current = next;
    if (latest.current.props.formData === undefined) setOwnData(next);
    latest.current.props.onFormDataChange?.(next);
  }, []);

  // --- the layout tree -------------------------------------------------------

  const { nodes: layoutNodes, entries } = useMemo(() => {
    const collected: SourceEntry[] = [];
    let counter = 0;
    const nextId = (source: OgeFormItemDefinition): string =>
      `oge-form-item-${counter++}-${source.key ?? source.field}`;

    const itemNode = (
      source: OgeFormItemDefinition,
      inherited: { readOnly?: boolean; disabled?: boolean },
    ): LayoutNode => {
      const merged: OgeFormItemDefinition = {
        ...source,
        readOnly: source.readOnly ?? inherited.readOnly,
        disabled: source.disabled ?? inherited.disabled,
      };
      const id = nextId(merged);
      collected.push({ id, source: merged });
      return {
        id,
        kind: 'item',
        itemId: id,
        visibleIndex: merged.visibleIndex,
        colSpan: Math.max(1, Math.floor(merged.colSpan ?? 1)),
        renderItem: merged.renderItem,
        renderEditor: merged.renderEditor,
        renderLabel: merged.renderLabel,
      };
    };

    const groupNode = (
      group: OgeFormGroupDefinition,
      inherited: { readOnly?: boolean; disabled?: boolean },
    ): LayoutNode => {
      const own = {
        readOnly: group.readOnly ?? inherited.readOnly,
        disabled: group.disabled ?? inherited.disabled,
      };
      return {
        id: `oge-form-group-${counter++}-${group.key ?? group.caption}`,
        kind: 'group',
        visibleIndex: group.visibleIndex,
        caption: group.caption,
        colCount: group.colCount,
        colSpan: Math.max(1, group.colSpan ?? 1),
        cssClass: group.cssClass,
        renderCaption: group.renderCaption,
        children: walk(group.children ?? [], own),
      };
    };

    const sectionNode = (
      section: OgeFormSectionDefinition,
      inherited: { readOnly?: boolean; disabled?: boolean },
    ): LayoutNode => {
      const id = `oge-form-section-${counter++}-${section.key ?? section.kind}`;
      // a section's children are groups; anything else is wrapped so every
      // panel still has a caption to show
      const children = walk(section.children ?? [], inherited).map(
        (child, index) =>
          child.kind === 'group'
            ? { ...child, sectionIndex: index }
            : {
                id: `${id}-panel-${index}`,
                kind: 'group' as const,
                caption: '',
                colSpan: 1,
                sectionIndex: index,
                children: [child],
              },
      );
      return {
        id,
        kind: section.kind,
        section,
        visibleIndex: section.visibleIndex,
        colSpan: Math.max(1, section.colSpan ?? 1),
        cssClass: section.cssClass,
        children,
      };
    };

    const walk = (
      children: readonly OgeFormNodeDefinition[],
      inherited: { readOnly?: boolean; disabled?: boolean },
    ): LayoutNode[] =>
      children
        .filter((child) => (child as { visible?: boolean }).visible !== false)
        .map((child) =>
          isSection(child)
            ? sectionNode(child, inherited)
            : isGroup(child)
              ? groupNode(child, inherited)
              : itemNode(child as OgeFormItemDefinition, inherited),
        );

    const nodes: LayoutNode[] = [...walk(props.layout ?? [], {})];

    // data-driven groups, then data-driven items attached to their group
    const groupNodes = new Map<
      string,
      LayoutNode & { children: LayoutNode[] }
    >();
    for (const node of nodes) {
      if (node.kind === 'group' && node.caption !== undefined) {
        groupNodes.set(
          node.caption,
          node as LayoutNode & { children: LayoutNode[] },
        );
      }
    }
    for (const group of props.groups ?? []) {
      if (group.visible === false) continue;
      const key = group.key ?? group.caption;
      if (groupNodes.has(key)) continue;
      const node = {
        id: `oge-form-group-${counter++}-${key}`,
        kind: 'group' as const,
        visibleIndex: group.visibleIndex,
        caption: group.caption,
        colCount: group.colCount,
        colSpan: Math.max(1, group.colSpan ?? 1),
        cssClass: group.cssClass,
        children: [] as LayoutNode[],
      };
      groupNodes.set(key, node);
      nodes.push(node);
    }

    for (const source of props.items ?? []) {
      if (source.visible === false) continue;
      const target =
        source.group !== undefined ? groupNodes.get(source.group) : undefined;
      if (target) target.children.push(itemNode(source, {}));
      else nodes.push(itemNode(source, {}));
    }

    // `visibleIndex` orders each level on its own, the way the reference
    // libraries scope it — "in a form, group or tab", not across the whole form
    const orderLevels = (level: readonly LayoutNode[]): LayoutNode[] =>
      orderByVisibleIndex(level).map((node) =>
        node.kind === 'group'
          ? { ...node, children: orderLevels(node.children ?? []) }
          : node,
      );

    return { nodes: orderLevels(nodes), entries: collected };
  }, [props.layout, props.groups, props.items]);

  // --- resolved items and validation ----------------------------------------

  const resolvedItems = useMemo<readonly OgeResolvedFormItem[]>(
    () =>
      entries.map((entry) =>
        resolveItem(
          entry.source,
          entry.id,
          readPath(data, entry.source.field),
          {
            readOnly,
            disabled,
          },
        ),
      ),
    [entries, data, readOnly, disabled],
  );

  const fieldErrors = useMemo<
    ReadonlyMap<string, readonly OgeFieldError[]>
  >(() => {
    const map = new Map<string, readonly OgeFieldError[]>();
    for (const item of resolvedItems) {
      const errors = [
        ...evaluateOgeValidationRules(
          readPath(data, item.field),
          data as Record<string, unknown>,
          item.validationRules,
          item.required,
        ),
      ];
      const asyncMessage = asyncErrors[item.field];
      if (asyncMessage) errors.push({ kind: 'async', message: asyncMessage });
      map.set(item.id, errors);
    }
    return map;
  }, [resolvedItems, data, asyncErrors]);

  const messageFor = useCallback(
    (item: OgeResolvedFormItem, gated: boolean): string | null => {
      const errors = fieldErrors.get(item.id) ?? [];
      if (errors.length === 0) return null;
      if (gated && !touched.has(item.field) && !submitAttempted) return null;
      return (
        errors[0].message ??
        messageForFieldError(errors[0], inputsConfig.messages)
      );
    },
    [fieldErrors, touched, submitAttempted, inputsConfig.messages],
  );

  /** One entry per invalid field, in layout order — regardless of gating. */
  const errors = useMemo<readonly OgeFormErrorEntry[]>(
    () =>
      resolvedItems.flatMap((item) => {
        const message = messageFor(item, false);
        return message === null
          ? []
          : [{ field: item.field, label: item.label, message }];
      }),
    [resolvedItems, messageFor],
  );
  // async rules: one run per field whenever its value changes
  const asyncRunId = useRef(0);
  useEffect(() => {
    const pending = resolvedItems.flatMap((item) => {
      const rules = asyncValidationRules(item.validationRules);
      return rules.length === 0 ? [] : [{ item, rules }];
    });
    if (pending.length === 0) return;
    const runId = ++asyncRunId.current;
    let cancelled = false;
    void Promise.all(
      pending.map(async ({ item, rules }) => {
        const value = readPath(dataRef.current, item.field);
        for (const rule of rules) {
          try {
            const message = await rule.validate(value);
            if (message) return [item.field, message] as const;
          } catch {
            // a rejected check is a failed check — the rule's own message, or
            // the inputs table's fallback through `messageForFieldError`
            return [item.field, rule.message ?? ''] as const;
          }
        }
        return [item.field, ''] as const;
      }),
    ).then((results) => {
      // a stale run must never overwrite a newer verdict
      if (cancelled || runId !== asyncRunId.current) return;
      setAsyncErrors((previous) => {
        const next: Record<string, string> = { ...previous };
        let changed = false;
        for (const [field, message] of results) {
          if (message) {
            if (next[field] !== message) {
              next[field] = message;
              changed = true;
            }
          } else if (field in next) {
            delete next[field];
            changed = true;
          }
        }
        return changed ? next : previous;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [resolvedItems, data]);

  // --- field values ----------------------------------------------------------

  const fieldRefs = useRef(new Map<string, OgeFormFieldHandle | null>());

  const setFieldValue = useCallback(
    (field: string, value: unknown) => {
      const previous = readPath(dataRef.current, field);
      if (Object.is(previous, value)) return;
      setDirty(true);
      writeData(writePath(dataRef.current as object, field, value) as T);
      latest.current.props.onFieldChanged?.({
        field,
        value,
        previousValue: previous,
      });
    },
    [writeData],
  );

  const markTouched = useCallback((field: string) => {
    setTouched((previous) =>
      previous.has(field) ? previous : new Set(previous).add(field),
    );
  }, []);

  // --- section state ---------------------------------------------------------

  const [sectionIndex, setSectionIndex] = useState<
    Readonly<Record<string, number>>
  >({});
  const [sectionKeys, setSectionKeys] = useState<
    Readonly<Record<string, readonly string[]>>
  >({});

  const activeIndexOf = (node: LayoutNode): number =>
    node.section?.activeIndex ??
    sectionIndex[node.id] ??
    node.section?.defaultActiveIndex ??
    0;
  // Angular's `expandedKeys` model starts empty, and its panels are keyed by
  // the same internal panel id — so an app that wants a panel open on arrival
  // reveals it through the section state, not by guessing an id.
  const expandedKeysOf = (node: LayoutNode): readonly string[] =>
    node.section?.expandedKeys ??
    sectionKeys[node.id] ??
    node.section?.defaultExpandedKeys ??
    [];

  const setActiveIndex = (node: LayoutNode, index: number) => {
    node.section?.onActiveIndexChange?.(index);
    if (node.section?.activeIndex === undefined) {
      setSectionIndex((previous) => ({ ...previous, [node.id]: index }));
    }
  };
  const setExpandedKeys = (node: LayoutNode, keys: readonly string[]) => {
    node.section?.onExpandedKeysChange?.(keys);
    if (node.section?.expandedKeys === undefined) {
      setSectionKeys((previous) => ({ ...previous, [node.id]: keys }));
    }
  };

  // --- public surface --------------------------------------------------------

  const itemsById = useMemo(
    () => new Map(resolvedItems.map((item) => [item.id, item])),
    [resolvedItems],
  );
  const invalidFields = useMemo(
    () => new Set(errors.map((entry) => entry.field)),
    [errors],
  );

  const fieldsUnder = useCallback(
    (node: LayoutNode): readonly string[] => {
      if (node.kind === 'item') {
        const item = node.itemId ? itemsById.get(node.itemId) : undefined;
        return item ? [item.field] : [];
      }
      return (node.children ?? []).flatMap((child) => fieldsUnder(child));
    },
    [itemsById],
  );

  const errorCountUnder = useCallback(
    (node: LayoutNode): number =>
      fieldsUnder(node).filter((field) => invalidFields.has(field)).length,
    [fieldsUnder, invalidFields],
  );

  /** Outermost-first list of the sections that hide `field`. */
  const sectionPathFor = useCallback(
    (field: string) => {
      const path: { node: LayoutNode; index: number; groupId: string }[] = [];
      const walk = (
        nodes: readonly LayoutNode[],
        trail: readonly { node: LayoutNode; index: number; groupId: string }[],
      ): boolean => {
        for (const node of nodes) {
          if (node.kind === 'item') {
            const item = node.itemId ? itemsById.get(node.itemId) : undefined;
            if (item?.field === field) {
              path.push(...trail);
              return true;
            }
            continue;
          }
          if (node.kind === 'group') {
            if (walk(node.children ?? [], trail)) return true;
            continue;
          }
          for (const panel of node.children ?? []) {
            const step = {
              node,
              index: panel.sectionIndex ?? 0,
              groupId: panel.id,
            };
            if (walk(panel.children ?? [], [...trail, step])) return true;
          }
        }
        return false;
      };
      walk(layoutNodes, []);
      return path;
    },
    [layoutNodes, itemsById],
  );

  const focusField = useCallback(
    (field: string): boolean => {
      const item = resolvedItems.find((entry) => entry.field === field);
      const handle = item ? fieldRefs.current.get(item.id) : undefined;
      if (!handle) return false;
      handle.focus();
      const element = handle.element;
      // guarded: jsdom (and any non-browser DOM) has no `scrollIntoView`, and
      // failing to scroll must never swallow the focus move
      if (
        scrollToFirstInvalid &&
        typeof element?.scrollIntoView === 'function'
      ) {
        element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      return true;
    },
    [resolvedItems, scrollToFirstInvalid],
  );

  const handle = useMemo<OgeFormHandle<T>>(
    () => ({
      async submit(event?: Event) {
        event?.preventDefault();
        setSubmitAttempted(true);
        setTouched(new Set(resolvedItems.map((item) => item.field)));
        const currentErrors = errors;
        const isValid = currentErrors.length === 0;
        latest.current.props.onValidated?.({
          valid: isValid,
          errors: currentErrors,
        });
        const pre = {
          data: dataRef.current,
          valid: isValid,
          cancel: false,
          event,
        };
        latest.current.props.onSubmitting?.(pre);
        if (pre.cancel || !isValid) {
          this.focusFirstInvalid();
          return false;
        }
        latest.current.props.onSubmitted?.({ data: dataRef.current, event });
        return true;
      },
      validate() {
        latest.current.props.onValidated?.({
          valid: errors.length === 0,
          errors,
        });
        return errors.length === 0;
      },
      reset(values?: Partial<T>) {
        setSubmitAttempted(false);
        setTouched(new Set());
        setDirty(false);
        setAsyncErrors({});
        writeData(
          values
            ? ({ ...initialData.current, ...values } as T)
            : initialData.current,
        );
      },
      clear() {
        setSubmitAttempted(false);
        setTouched(new Set());
        setAsyncErrors({});
        let next = dataRef.current as object;
        for (const item of resolvedItems) {
          next = writePath(
            next,
            item.field,
            emptyValueForDataType(item.dataType),
          );
        }
        writeData(next as T);
      },
      focus(field?: string) {
        if (field === undefined) {
          const first = resolvedItems[0];
          if (first) focusField(first.field);
          return;
        }
        focusField(field);
      },
      focusFirstInvalid() {
        const first = errors[0];
        if (!first) return false;
        let revealed = false;
        for (const step of sectionPathFor(first.field)) {
          if (step.node.kind === 'accordion') {
            const keys = expandedKeysOf(step.node);
            if (!keys.includes(step.groupId)) {
              setExpandedKeys(step.node, [...keys, step.groupId]);
              revealed = true;
            }
            continue;
          }
          if (activeIndexOf(step.node) !== step.index) {
            setActiveIndex(step.node, step.index);
            revealed = true;
          }
        }
        if (revealed) {
          // the field is only mounted after the reveal renders
          requestAnimationFrame(() => focusField(first.field));
          return true;
        }
        return focusField(first.field);
      },
      itemOption(field: string) {
        return resolvedItems.find((item) => item.field === field);
      },
      updateData(fieldOrData: string | Partial<T>, value?: unknown) {
        if (typeof fieldOrData === 'string') {
          setFieldValue(fieldOrData, value);
          return;
        }
        writeData({ ...(dataRef.current as object), ...fieldOrData } as T);
      },
      get errors() {
        return errors;
      },
      get valid() {
        return errors.length === 0;
      },
      get dirty() {
        return dirty;
      },
      get data() {
        return dataRef.current;
      },
    }),
    // the section setters below are stable closures over `useState` setters,
    // which React guarantees never change identity
    [
      errors,
      resolvedItems,
      dirty,
      focusField,
      sectionPathFor,
      setFieldValue,
      writeData,
    ],
  );

  useImperativeHandle(ref, () => handle, [handle]);

  // --- render ----------------------------------------------------------------

  const breakpointStyle = useMemo<CSSProperties>(() => {
    const style: Record<string, string> = {
      '--oge-form-min-col': `${minColWidth}px`,
    };
    for (const screen of BREAKPOINTS) {
      const count = props.colCountByScreen?.[screen];
      if (count !== undefined) {
        style[`--oge-form-cols-${screen}`] = formColumnsCss(count);
      }
    }
    return style as CSSProperties;
  }, [minColWidth, props.colCountByScreen]);

  const renderNodes = (
    nodes: readonly LayoutNode[],
    columns: number,
  ): ReactNode =>
    nodes.map((node) => {
      const spanStyle =
        node.colSpan > 1
          ? ({ gridColumn: `span ${node.colSpan}` } as CSSProperties)
          : undefined;

      if (node.kind === 'tabs') {
        return (
          <OgeTabPanel
            key={node.id}
            className={['oge-form-section', 'oge-form-tabs', node.cssClass]
              .filter(Boolean)
              .join(' ')}
            style={spanStyle}
            selectedIndex={activeIndexOf(node)}
            onSelectedIndexChange={(index) => setActiveIndex(node, index)}
            deferRendering={node.section?.deferRendering ?? false}
            keepAlive={node.section?.keepAlive ?? true}
            tabs={(node.children ?? []).map((panel) => ({
              key: panel.id,
              text: panel.caption ?? '',
              badge:
                (node.section?.showErrorBadges ?? true) &&
                errorCountUnder(panel) > 0
                  ? errorCountUnder(panel)
                  : undefined,
              content: (
                <div
                  className="oge-form-fields"
                  style={{
                    gridTemplateColumns: formColumnsCss(panel.colCount),
                  }}
                >
                  {renderNodes(
                    panel.children ?? [],
                    formColumnsCount(panel.colCount, colCount),
                  )}
                </div>
              ),
            }))}
          />
        );
      }

      if (node.kind === 'steps') {
        return (
          <OgeStepper
            key={node.id}
            className={['oge-form-section', 'oge-form-steps', node.cssClass]
              .filter(Boolean)
              .join(' ')}
            style={spanStyle}
            activeIndex={activeIndexOf(node)}
            onActiveIndexChange={(index) => setActiveIndex(node, index)}
            linear={node.section?.linear ?? false}
            orientation={node.section?.orientation ?? 'horizontal'}
            showNavigation={node.section?.showNavigation ?? true}
            deferRendering={node.section?.deferRendering ?? false}
            keepAlive={node.section?.keepAlive ?? true}
            onStepChanging={(event) => {
              // touch the leaving step's fields as the user advances, so the
              // steps ahead stay quiet
              if (
                node.section?.touchOnLeave === false ||
                event.toIndex <= event.fromIndex
              ) {
                return;
              }
              const leaving = node.children?.[event.fromIndex];
              if (!leaving) return;
              setTouched((previous) => {
                const next = new Set(previous);
                for (const field of fieldsUnder(leaving)) next.add(field);
                return next;
              });
            }}
            steps={(node.children ?? []).map((panel) => ({
              key: panel.id,
              label: panel.caption ?? '',
              invalid:
                (node.section?.showInvalidSections ?? true) &&
                errorCountUnder(panel) > 0,
              completed: errorCountUnder(panel) === 0,
              content: (
                <div
                  className="oge-form-fields"
                  style={{
                    gridTemplateColumns: formColumnsCss(panel.colCount),
                  }}
                >
                  {renderNodes(
                    panel.children ?? [],
                    formColumnsCount(panel.colCount, colCount),
                  )}
                </div>
              ),
            }))}
          />
        );
      }

      if (node.kind === 'accordion') {
        return (
          <OgeAccordion
            key={node.id}
            className={['oge-form-section', 'oge-form-accordion', node.cssClass]
              .filter(Boolean)
              .join(' ')}
            style={spanStyle}
            expandedKeys={expandedKeysOf(node)}
            onExpandedKeysChange={(keys) => setExpandedKeys(node, keys)}
            multiple={node.section?.multiple ?? true}
            collapsible={node.section?.collapsible ?? true}
            deferRendering={node.section?.deferRendering ?? false}
            keepAlive={node.section?.keepAlive ?? true}
            items={(node.children ?? []).map((panel) => ({
              key: panel.id,
              title: panel.caption ?? '',
              invalid:
                (node.section?.showInvalidSections ?? true) &&
                errorCountUnder(panel) > 0,
              content: (
                <div
                  className="oge-form-fields"
                  style={{
                    gridTemplateColumns: formColumnsCss(panel.colCount),
                  }}
                >
                  {renderNodes(
                    panel.children ?? [],
                    formColumnsCount(panel.colCount, colCount),
                  )}
                </div>
              ),
            }))}
          />
        );
      }

      if (node.kind === 'group') {
        const caption = node.caption;
        const renderCaption = node.renderCaption ?? props.renderGroupCaption;
        return (
          <fieldset
            key={node.id}
            className={['oge-form-group', node.cssClass]
              .filter(Boolean)
              .join(' ')}
            style={spanStyle}
          >
            {caption ? (
              <legend className="oge-form-group-caption">
                {renderCaption
                  ? renderCaption({ caption, colCount: node.colCount })
                  : caption}
              </legend>
            ) : null}
            <div
              className="oge-form-fields"
              style={{ gridTemplateColumns: formColumnsCss(node.colCount) }}
            >
              {renderNodes(
                node.children ?? [],
                formColumnsCount(node.colCount, colCount),
              )}
            </div>
          </fieldset>
        );
      }

      const item = node.itemId ? itemsById.get(node.itemId) : undefined;
      if (!item) return null;
      return (
        <OgeFormField
          key={node.id}
          ref={(instance) => {
            fieldRefs.current.set(item.id, instance);
          }}
          item={item}
          value={readPath(data, item.field)}
          onValueChange={(value) => setFieldValue(item.field, value)}
          onTouched={() => markTouched(item.field)}
          errors={fieldErrors.get(item.id) ?? []}
          error={messageFor(item, true)}
          appearance={appearance}
          labelLocation={labelLocation}
          messages={messages}
          showRequiredMark={showRequiredMark}
          showOptionalMark={showOptionalMark}
          showColonAfterLabel={showColonAfterLabel}
          availableColumns={columns}
          onEnterKey={(event) =>
            latest.current.props.onEditorEnterKey?.({
              field: item.field,
              event,
            })
          }
          renderItem={node.renderItem ?? props.renderItem}
          renderEditor={node.renderEditor ?? props.renderEditor}
          renderLabel={node.renderLabel ?? props.renderLabel}
        />
      );
    });

  const hostClasses = [
    'oge-form',
    labelLocation === 'start' && 'oge-form-label-start',
    labelLocation === 'end' && 'oge-form-label-end',
    (props.alignItemLabels ?? true) && 'oge-form-align-labels',
    readOnly && 'oge-form-readonly',
    disabled && 'oge-form-disabled',
    size === 'sm' && 'oge-form-sm',
    size === 'lg' && 'oge-form-lg',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      {props.showValidationSummary && submitAttempted && (
        <OgeValidationSummary
          errors={errors}
          messages={props.messages}
          onErrorClick={(entry) => focusField(entry.field)}
        />
      )}

      <fieldset className="oge-form-fieldset" disabled={disabled}>
        {resolvedItems.length > 0 ? (
          <div
            className="oge-form-fields"
            style={{ gridTemplateColumns: formColumnsCss(colCount) }}
          >
            {renderNodes(layoutNodes, formColumnsCount(colCount, colCount))}
          </div>
        ) : (
          <p className="oge-form-empty">{messages.noItems}</p>
        )}
      </fieldset>

      <div className="oge-form-actions">{props.actions}</div>
    </>
  );

  return (
    <div className={hostClasses} style={props.style} id={props.id}>
      {renderFormElement ? (
        <form
          className="oge-form-body"
          noValidate
          style={breakpointStyle}
          onSubmit={(event) => {
            event.preventDefault();
            void handle.submit(event.nativeEvent);
          }}
        >
          {body}
        </form>
      ) : (
        <div className="oge-form-body" style={breakpointStyle}>
          {body}
        </div>
      )}
    </div>
  );
}

export const OgeForm = forwardRef(OgeFormInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgeFormProps<T> & { ref?: React.Ref<OgeFormHandle<T>> },
) => ReactNode;
