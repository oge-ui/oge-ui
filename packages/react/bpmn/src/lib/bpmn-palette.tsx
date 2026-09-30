'use client';

import { useRef, useState, type ReactNode } from 'react';
import {
  bpmnPaletteNavIndex,
  type BpmnPaletteDragStart,
  type BpmnPaletteItemType,
} from '@oge-ui/bpmn-engine';

/** Props of the internal {@link BpmnPalette}. */
export interface BpmnPaletteProps {
  label: string;
  items: readonly BpmnPaletteItemType[];
  labels: Readonly<Record<BpmnPaletteItemType, string>>;
  activeType: BpmnPaletteItemType | null;
  disabled?: boolean;
  onToolPicked: (type: BpmnPaletteItemType) => void;
  onDragStarted: (start: BpmnPaletteDragStart) => void;
}

/** The glyph of one palette entry — the same SVG the Angular palette draws. */
function PaletteGlyph({ item }: { item: BpmnPaletteItemType }): ReactNode {
  const thin = 'oge-bpmn-glyph-thin';
  const taskRect = (
    <rect x="4" y="6" width="16" height="12" rx="3" className={thin} />
  );
  switch (item) {
    case 'startEvent':
      return <circle cx="12" cy="12" r="8" className={thin} />;
    case 'endEvent':
      return <circle cx="12" cy="12" r="8" className="oge-bpmn-glyph-thick" />;
    case 'intermediateThrowEvent':
      return (
        <>
          <circle cx="12" cy="12" r="8" className={thin} />
          <circle cx="12" cy="12" r="5.5" className={thin} />
          <circle cx="12" cy="12" r="1.5" className="oge-bpmn-glyph-fill" />
        </>
      );
    case 'intermediateCatchEvent':
      return (
        <>
          <circle cx="12" cy="12" r="8" className={thin} />
          <circle cx="12" cy="12" r="5.5" className={thin} />
        </>
      );
    case 'boundaryEvent':
      return (
        <>
          <circle cx="12" cy="12" r="8" className="oge-bpmn-glyph-dash" />
          <circle cx="12" cy="12" r="5.5" className="oge-bpmn-glyph-dash" />
        </>
      );
    case 'task':
      return taskRect;
    case 'userTask':
      return (
        <>
          {taskRect}
          <circle cx="12" cy="10.5" r="1.6" className={thin} />
          <path
            d="M9.4 15.5c0-1.4 1.2-2.4 2.6-2.4s2.6 1 2.6 2.4"
            className={thin}
          />
        </>
      );
    case 'serviceTask':
      return (
        <>
          {taskRect}
          <circle cx="12" cy="12" r="2.2" className={thin} />
          <path
            d="M12 8.4v1.2M12 14.4v1.2M8.4 12h1.2M14.4 12h1.2"
            className={thin}
          />
        </>
      );
    case 'scriptTask':
      return (
        <>
          {taskRect}
          <path d="M8 10h8M8 12.5h8M8 15h5" className={thin} />
        </>
      );
    case 'subProcess':
      return (
        <>
          {taskRect}
          <path d="M9.5 15h5M12 12.5v5" className={thin} />
        </>
      );
    case 'eventSubProcess':
      return (
        <>
          <rect
            x="4"
            y="6"
            width="16"
            height="12"
            rx="3"
            className="oge-bpmn-glyph-dash"
          />
          <circle cx="12" cy="12" r="3" className={thin} />
        </>
      );
    case 'transaction':
      return (
        <>
          {taskRect}
          <rect x="6" y="8" width="12" height="8" rx="2" className={thin} />
        </>
      );
    case 'callActivity':
      return (
        <>
          <rect
            x="4"
            y="6"
            width="16"
            height="12"
            rx="3"
            className="oge-bpmn-glyph-thick"
          />
          <path d="M9.5 15h5M12 12.5v5" className={thin} />
        </>
      );
    case 'exclusiveGateway':
      return (
        <>
          <path d="M12 3 21 12 12 21 3 12Z" className={thin} />
          <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" className={thin} />
        </>
      );
    case 'parallelGateway':
      return (
        <>
          <path d="M12 3 21 12 12 21 3 12Z" className={thin} />
          <path d="M12 8v8M8 12h8" className={thin} />
        </>
      );
    case 'dataObject':
      return <path d="M7 4h7l4 4v12H7Z M14 4v4h4" className={thin} />;
    case 'dataStore':
      return (
        <>
          <path
            d="M5 7c0-1.7 3.1-3 7-3s7 1.3 7 3v10c0 1.7-3.1 3-7 3s-7-1.3-7-3Z"
            className={thin}
          />
          <path d="M5 7c0 1.7 3.1 3 7 3s7-1.3 7-3" className={thin} />
        </>
      );
    case 'group':
      return (
        <rect
          x="4"
          y="5"
          width="16"
          height="14"
          rx="3"
          className="oge-bpmn-glyph-dash"
        />
      );
    case 'pool':
      return (
        <>
          <rect x="3" y="6" width="18" height="12" className={thin} />
          <path d="M7 6v12" className={thin} />
        </>
      );
    case 'textAnnotation':
      return (
        <>
          <path d="M15 5H9v14h6" className={thin} />
          <path d="M12 9h7M12 12h7M12 15h5" className="oge-bpmn-glyph-hair" />
        </>
      );
  }
}

/**
 * Internal elements palette of the BPMN editor: a vertical toolbar of real
 * buttons with a roving tabindex (APG toolbar), one per placeable node type —
 * the React render of the Angular `oge-bpmn-palette`, on the engine's shared
 * key map. Picking an entry arms the editor's click-then-place tool; a
 * pointer-down may become a drag-to-canvas gesture.
 */
export function BpmnPalette({
  label,
  items,
  labels,
  activeType,
  disabled = false,
  onToolPicked,
  onDragStarted,
}: BpmnPaletteProps): ReactNode {
  const [focusIndex, setFocusIndex] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={hostRef}
      className="oge-bpmn-palette"
      role="toolbar"
      aria-orientation="vertical"
      aria-label={label}
    >
      {items.map((item, i) => (
        <button
          key={item}
          type="button"
          className={
            activeType === item
              ? 'oge-bpmn-palette-btn oge-bpmn-palette-active'
              : 'oge-bpmn-palette-btn'
          }
          tabIndex={i === focusIndex ? 0 : -1}
          disabled={disabled}
          aria-pressed={activeType === item}
          aria-label={labels[item]}
          title={labels[item]}
          onClick={() => onToolPicked(item)}
          onPointerDown={(event) => {
            if (event.button !== 0 || disabled) return;
            onDragStarted({
              type: item,
              clientX: event.clientX,
              clientY: event.clientY,
            });
          }}
          onKeyDown={(event) => {
            const next = bpmnPaletteNavIndex(event.key, i, items.length);
            if (next === null) return;
            event.preventDefault();
            setFocusIndex(next);
            hostRef.current
              ?.querySelectorAll<HTMLButtonElement>('.oge-bpmn-palette-btn')
              [next]?.focus();
          }}
          onFocus={() => setFocusIndex(i)}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <PaletteGlyph item={item} />
          </svg>
        </button>
      ))}
    </div>
  );
}
