import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React signature pad page. Pure data — the generator
 * and the compile gate load it in plain Node. Section-for-section mirror of
 * `../inputs/signature-pad.ts`.
 */
export const INPUTS_SIGNATURE_PAD_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      'Draw on the surface; each pen-up commits a PNG data: URL. Undo (or Ctrl+Z) removes the last stroke, Escape mid-stroke cancels it, Clear empties the pad. Strokes are surface-relative, so resizing redraws them.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSignaturePad'] },
      name: 'SignaturePadDemo',
      body: `const [signature, setSignature] = useState<string | null>(null);
const [strokes, setStrokes] = useState(0);`,
      jsx: `<>
  <OgeSignaturePad
    label="Customer signature"
    value={signature}
    onValueChange={setSignature}
    onStrokeEnded={(e) => setStrokes(e.strokeCount)}
  />
  <p className="mt-3 text-sm">
    Strokes: <code>{strokes}</code> · signed: <code>{String(signature !== null)}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Typed signature',
    description:
      'The keyboard alternative: Type switches to a labelled text field, and the name is rendered in fontFamily into the same export. mode + onModeChange is the controlled pair; allowTyping={false} hides the switch.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSignaturePad'] },
      types: { '@oge-ui/react-inputs': ['OgeSignatureMode'] },
      name: 'SignaturePadTypedDemo',
      body: `const [mode, setMode] = useState<OgeSignatureMode>('type');
const [signature, setSignature] = useState<string | null>(null);`,
      jsx: `<OgeSignaturePad
  label="Typed signature"
  fontFamily="'Segoe Script', 'Brush Script MT', cursive"
  mode={mode}
  onModeChange={setMode}
  value={signature}
  onValueChange={setSignature}
/>`,
    }),
  },
  {
    title: 'SVG and pen options',
    description:
      'format="svg" exports vector paths and embeds the strokes, so writing a stored value back restores an editable pad. minWidth / maxWidth bound the speed-weighted width; the handle exposes toDataUrl(), toSvg(), undo() and clear().',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: {
        '@oge-ui/react-inputs': ['OgeSignaturePad'],
        '@oge-ui/react-buttons': ['OgeButton'],
      },
      types: { '@oge-ui/react-inputs': ['OgeSignaturePadHandle'] },
      name: 'SignaturePadSvgDemo',
      body: `const pad = useRef<OgeSignaturePadHandle>(null);
const saved = useRef<string | null>(null);
const [svg, setSvg] = useState<string | null>(null);`,
      jsx: `<>
  <OgeSignaturePad
    ref={pad}
    label="Approval"
    format="svg"
    minWidth={1.5}
    maxWidth={4.5}
    height={140}
    value={svg}
    onValueChange={setSvg}
  />
  <OgeButton
    text="Save"
    onClick={() => {
      saved.current = pad.current?.toDataUrl('svg') ?? null;
    }}
  />
  <OgeButton text="Restore saved" onClick={() => setSvg(saved.current)} />
</>`,
    }),
  },
  {
    title: 'Inside a form',
    description:
      'React has no formControl binding — the controlled pair is the integration point; pass required, errors and touched from your form layer.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSignaturePad'] },
      name: 'SignaturePadFormDemo',
      body: `const [signature, setSignature] = useState<string | null>(null);
const [touched, setTouched] = useState(false);`,
      jsx: `<OgeSignaturePad
  label="Signature"
  required
  value={signature}
  onValueChange={(next) => {
    setSignature(next);
    setTouched(true);
  }}
  touched={touched}
  onBlur={() => setTouched(true)}
  errors={signature ? [] : [{ kind: 'required' }]}
/>`,
    }),
  },
];
