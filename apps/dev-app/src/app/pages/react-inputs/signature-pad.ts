import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import { OgeButton } from '@oge-ui/react-buttons';
import {
  OgeSignaturePad,
  type OgeSignatureMode,
  type OgeSignaturePadHandle,
} from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_SIGNATURE_PAD_DEMOS } from './signature-pad-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_INPUTS_SIGNATURE_PAD_SECTIONS = [
  'Getting started',
  'Typed signature',
  'SVG and pen options',
  'Inside a form',
] as const;

const out = (testId: string, text: string) =>
  createElement('code', { 'data-testid': testId }, text);

function BasicDemo(): ReactNode {
  const [signature, setSignature] = useState<string | null>(null);
  const [strokes, setStrokes] = useState(0);
  return createElement(
    'div',
    null,
    createElement(OgeSignaturePad, {
      key: 'pad',
      label: 'Customer signature',
      value: signature,
      onValueChange: setSignature,
      onStrokeEnded: (e) => setStrokes(e.strokeCount),
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Strokes: ',
      out('signature-strokes', String(strokes)),
      ' · signed: ',
      out('signature-signed', String(signature !== null)),
    ),
  );
}

function TypedDemo(): ReactNode {
  const [mode, setMode] = useState<OgeSignatureMode>('type');
  const [signature, setSignature] = useState<string | null>(null);
  return createElement(
    'div',
    null,
    createElement(OgeSignaturePad, {
      key: 'pad',
      label: 'Typed signature',
      mode,
      onModeChange: setMode,
      value: signature,
      onValueChange: setSignature,
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Mode: ',
      out('signature-mode', mode),
      ' · signed: ',
      out('signature-typed-signed', String(signature !== null)),
    ),
  );
}

function SvgDemo(): ReactNode {
  const pad = useRef<OgeSignaturePadHandle>(null);
  const saved = useRef<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  return createElement(
    'div',
    null,
    createElement(OgeSignaturePad, {
      key: 'pad',
      ref: pad,
      label: 'Approval',
      format: 'svg',
      minWidth: 1.5,
      maxWidth: 4.5,
      height: 140,
      value: svg,
      onValueChange: setSvg,
    }),
    createElement(
      'div',
      { key: 'actions', className: 'mt-3 flex flex-wrap gap-2 text-sm' },
      createElement(
        'span',
        { key: 'save', 'data-testid': 'signature-save' },
        createElement(OgeButton, {
          text: 'Save',
          stylingMode: 'outlined',
          size: 'sm',
          onClick: () => {
            saved.current = pad.current?.toDataUrl('svg') ?? null;
          },
        }),
      ),
      createElement(
        'span',
        { key: 'restore', 'data-testid': 'signature-restore' },
        createElement(OgeButton, {
          text: 'Restore saved',
          stylingMode: 'outlined',
          size: 'sm',
          onClick: () => setSvg(saved.current),
        }),
      ),
    ),
  );
}

function FormDemo(): ReactNode {
  const [signature, setSignature] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  return createElement(
    'div',
    null,
    createElement(OgeSignaturePad, {
      key: 'pad',
      label: 'Signature',
      required: true,
      value: signature,
      onValueChange: (next) => {
        setSignature(next);
        setTouched(true);
      },
      touched,
      onBlur: () => setTouched(true),
      errors: signature ? [] : [{ kind: 'required' }],
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Valid: ',
      out('signature-valid', String(signature !== null)),
    ),
  );
}

/**
 * The React half of the signature pad page — the same demo sections as the
 * Angular page, rendered as real React trees (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-signature-pad-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/buttons/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['value', 'undo', 'Escape cancels']"
      heading="Getting started"
      description="Draw on the surface; each pen-up commits a PNG <code>data:</code> URL. Undo (or Ctrl+Z) removes the last stroke, Escape mid-stroke cancels it, Clear empties the pad. Strokes are surface-relative, so resizing redraws them."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['mode: type', 'fontFamily', 'keyboard']"
      heading="Typed signature"
      description="The keyboard alternative (WCAG 2.1.1): <strong>Type</strong> switches to a labelled text field and the name is rendered in <code>fontFamily</code> into the same export. <code>mode</code> + <code>onModeChange</code> is the controlled pair."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="typed" />
    </app-demo-card>

    <app-demo-card
      [chips]="['format: svg', 'minWidth / maxWidth', 'toDataUrl()']"
      heading="SVG and pen options"
      description='<code>format="svg"</code> exports vector paths and embeds the strokes, so writing a stored value back restores an editable pad; the handle exposes <code>toDataUrl()</code>, <code>toSvg()</code>, <code>undo()</code> and <code>clear()</code>.'
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="svg" />
    </app-demo-card>

    <app-demo-card
      [chips]="['controlled pair', 'errors', 'touched']"
      heading="Inside a form"
      description="React has no <code>formControl</code> binding — <strong>the controlled pair is the integration point</strong>; pass <code>required</code>, <code>errors</code> and <code>touched</code> from your form layer."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="form" />
    </app-demo-card>
  `,
})
export class ReactInputsSignaturePadDemos {
  protected readonly demos = INPUTS_SIGNATURE_PAD_DEMOS;

  protected readonly basic = () => createElement(BasicDemo);
  protected readonly typed = () => createElement(TypedDemo);
  protected readonly svg = () => createElement(SvgDemo);
  protected readonly form = () => createElement(FormDemo);
}
