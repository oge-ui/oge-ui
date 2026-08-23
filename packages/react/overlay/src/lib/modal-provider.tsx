'use client';

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type {
  OgeModalAutoFocus,
  OgeModalClosedEvent,
  OgeModalPlacement,
  OgeOverlayMessages,
} from '@oge-ui/behavior';
import { OgeModal, type OgeModalHandle } from './modal';

/** Configuration of an imperatively opened modal — the declarative props, minus slots. */
export interface OgeModalOpenConfig<D = unknown> {
  title?: string;
  ariaLabel?: string;
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  placement?: OgeModalPlacement;
  shading?: boolean;
  fullScreen?: boolean;
  showCloseButton?: boolean;
  showMaximizeButton?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  scrollLock?: boolean;
  autoFocus?: OgeModalAutoFocus;
  restoreFocus?: boolean;
  padding?: boolean;
  dragEnabled?: boolean;
  dragOutsideBoundary?: boolean;
  resizeEnabled?: boolean;
  inertBackground?: boolean;
  closeGuard?: () => boolean | Promise<boolean>;
  messages?: Partial<OgeOverlayMessages>;
  /** Made available to the content via `useOgeModalData()`. */
  data?: D;
}

/**
 * Handle of an imperatively opened modal: close it programmatically (full
 * guard pipeline) and await the result. Content reads it via `useOgeModalRef()`.
 */
export class OgeModalRef<R = unknown> {
  /** @internal wired by the provider once the modal renders. */
  _close: (result?: R) => void = () => undefined;

  /** Resolves after the modal closed, with reason and optional result. */
  readonly closed: Promise<OgeModalClosedEvent<R>>;

  constructor(closed: Promise<OgeModalClosedEvent<R>>) {
    this.closed = closed;
  }

  /** Closes through the full pipeline; the argument becomes `closed.result`. */
  close(result?: R): void {
    this._close(result);
  }
}

/** Context handed to a function `content` of `open()`. */
export interface OgeModalContentContext<D = unknown, R = unknown> {
  /** The `config.data` payload. */
  data: D;
  /** Closes the modal through the full pipeline with an optional result. */
  close: (result?: R) => void;
}

/** What `open()` renders: a node, or a function receiving `data` and `close`. */
export type OgeModalContent<D = unknown, R = unknown> =
  ReactNode | ((context: OgeModalContentContext<D, R>) => ReactNode);

/**
 * The React counterpart of Angular's `OgeModalService` — imperative,
 * body-appended modals for prompt/confirm flows and `transform`ed ancestors.
 */
export interface OgeModalsHandle {
  /** Opens `content` in a body-appended modal. */
  open<R = unknown, D = unknown>(
    content: OgeModalContent<D, R>,
    config?: OgeModalOpenConfig<D>,
  ): OgeModalRef<R>;
}

interface OpenModal {
  readonly key: number;
  readonly content: OgeModalContent;
  readonly config: OgeModalOpenConfig;
  readonly ref: OgeModalRef;
  readonly resolve: (event: OgeModalClosedEvent) => void;
  opened: boolean;
}

const ModalsContext = createContext<OgeModalsHandle | null>(null);
const ModalDataContext = createContext<unknown>(undefined);
const ModalRefContext = createContext<OgeModalRef | null>(null);

let nextModalKey = 0;

/**
 * Hosts the modals opened through `useOgeModals()` — the React counterpart
 * of Angular's `OgeModalService`. Mount it once near the app root:
 *
 * ```tsx
 * <OgeModalProvider>
 *   <App />
 * </OgeModalProvider>
 * ```
 *
 * Each modal renders into `document.body`, so `transform`ed ancestors never
 * break its `position: fixed`; page-level themes still apply.
 */
export function OgeModalProvider({ children }: { children?: ReactNode }) {
  const [modals, setModals] = useState<readonly OpenModal[]>([]);
  const modalsRef = useRef(modals);
  modalsRef.current = modals;

  const handle = useMemo<OgeModalsHandle>(
    () => ({
      open<R, D>(
        content: OgeModalContent<D, R>,
        config: OgeModalOpenConfig<D> = {},
      ): OgeModalRef<R> {
        let resolve!: (event: OgeModalClosedEvent<R>) => void;
        const ref = new OgeModalRef<R>(
          new Promise<OgeModalClosedEvent<R>>((r) => (resolve = r)),
        );
        const key = nextModalKey++;
        const entry: OpenModal = {
          key,
          content: content as OgeModalContent,
          config: config as OgeModalOpenConfig,
          ref: ref as OgeModalRef,
          resolve: resolve as (event: OgeModalClosedEvent) => void,
          opened: true,
        };
        setModals((list) => [...list, entry]);
        return ref;
      },
    }),
    [],
  );

  const remove = (key: number): void =>
    setModals((list) => list.filter((m) => m.key !== key));

  return (
    <ModalsContext.Provider value={handle}>
      {children}
      {typeof document !== 'undefined' &&
        modals.map((modal) =>
          createPortal(
            <HostedModal key={modal.key} modal={modal} onDone={remove} />,
            document.body,
          ),
        )}
    </ModalsContext.Provider>
  );
}

function HostedModal({
  modal,
  onDone,
}: {
  modal: OpenModal;
  onDone: (key: number) => void;
}) {
  const { data, ...config } = modal.config;
  const handleRef = useRef<OgeModalHandle | null>(null);
  // The ref's close() runs the full pipeline of the rendered modal.
  modal.ref._close = (result) => handleRef.current?.close(result);
  const close = (result?: unknown): void => handleRef.current?.close(result);
  const content =
    typeof modal.content === 'function'
      ? modal.content({ data, close })
      : modal.content;
  return (
    <ModalDataContext.Provider value={data}>
      <ModalRefContext.Provider value={modal.ref}>
        <OgeModal
          ref={handleRef}
          defaultOpened
          defaultFullScreen={config.fullScreen ?? false}
          title={config.title}
          ariaLabel={config.ariaLabel}
          width={config.width}
          height={config.height}
          minWidth={config.minWidth}
          minHeight={config.minHeight}
          maxWidth={config.maxWidth}
          maxHeight={config.maxHeight}
          placement={config.placement}
          shading={config.shading}
          showCloseButton={config.showCloseButton}
          showMaximizeButton={config.showMaximizeButton}
          closeOnEscape={config.closeOnEscape}
          closeOnBackdropClick={config.closeOnBackdropClick}
          scrollLock={config.scrollLock}
          autoFocus={config.autoFocus}
          restoreFocus={config.restoreFocus}
          padding={config.padding}
          dragEnabled={config.dragEnabled}
          dragOutsideBoundary={config.dragOutsideBoundary}
          resizeEnabled={config.resizeEnabled}
          inertBackground={config.inertBackground}
          closeGuard={config.closeGuard}
          messages={config.messages}
          onClosed={(event) => {
            modal.resolve(event);
            // Let the close finish its teardown before the tree goes away.
            queueMicrotask(() => onDone(modal.key));
          }}
        >
          {content}
        </OgeModal>
      </ModalRefContext.Provider>
    </ModalDataContext.Provider>
  );
}

/**
 * Imperative modals — the React counterpart of injecting `OgeModalService`:
 *
 * ```tsx
 * const modals = useOgeModals();
 * const { result } = await modals.open<string>(
 *   ({ data, close }) => <ConfirmDelete name={data.name} onPick={close} />,
 *   { title: 'Delete file?', width: 360, data: { name: 'report.xlsx' } },
 * ).closed;
 * ```
 */
export function useOgeModals(): OgeModalsHandle {
  const handle = useContext(ModalsContext);
  if (!handle) {
    throw new Error(
      '[oge-overlay] useOgeModals() needs an <OgeModalProvider> above it.',
    );
  }
  return handle;
}

/** The `config.data` of the enclosing imperative modal — Angular's `OGE_MODAL_DATA`. */
export function useOgeModalData<D = unknown>(): D {
  return useContext(ModalDataContext) as D;
}

/** The handle of the enclosing imperative modal — Angular's injected `OgeModalRef`. */
export function useOgeModalRef<R = unknown>(): OgeModalRef<R> {
  const ref = useContext(ModalRefContext);
  if (!ref) {
    throw new Error(
      '[oge-overlay] useOgeModalRef() only works inside a modal opened by useOgeModals().',
    );
  }
  return ref as OgeModalRef<R>;
}
