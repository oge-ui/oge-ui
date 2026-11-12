import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React barcode page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 * Section-for-section mirror of `../layout/barcode.ts`.
 */
export const LAYOUT_BARCODE_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Generate',
    description:
      'Type a value and pick a symbology. A value the symbology cannot hold shows a message instead of a symbol; download() on the ref saves an SVG file.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-layout': ['OgeBarcode'] },
      types: { '@oge-ui/react-layout': ['OgeBarcodeHandle', 'OgeBarcodeType'] },
      name: 'BarcodeGenerateDemo',
      before: `const types: OgeBarcodeType[] = ['qr', 'code128', 'ean13'];`,
      body: `const code = useRef<OgeBarcodeHandle>(null);
const [value, setValue] = useState('https://ogeui.com');
const [type, setType] = useState<OgeBarcodeType>('qr');`,
      jsx: `<>
  <input aria-label="Value" value={value} onChange={(e) => setValue(e.target.value)} />
  {types.map((t) => (
    <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}>
      {t}
    </button>
  ))}
  <OgeBarcode ref={code} value={value} type={type} scale={3} />
  <button type="button" onClick={() => code.current?.download('barcode.svg')}>
    Download SVG
  </button>
</>`,
    }),
  },
  {
    title: 'Labels',
    description:
      'EAN-13 adds its own check digit; a QR code at level H still reads with 30 % of it scuffed; bars take a height and a colour.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeBarcode'] },
      name: 'BarcodeLabelsDemo',
      jsx: `<>
  <OgeBarcode type="ean13" value="400638133393" scale={2} />
  <OgeBarcode value="SKU-2041 · Lot 7" errorCorrection="H" scale={3} />
  <OgeBarcode type="code128" value="SHIP-000123" barHeight={30} color="#1e3a8a" />
</>`,
    }),
  },
  {
    title: 'Scan',
    description:
      'Start opens the camera; "Scan an image" reads a file. Reading uses the browser’s BarcodeDetector — pass decoder where there is none.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeBarcodeScanner'] },
      name: 'BarcodeScanDemo',
      body: `const [last, setLast] = useState('Nothing read yet');`,
      jsx: `<>
  <OgeBarcodeScanner onDetected={(r) => setLast(\`\${r.format}: \${r.value}\`)} />
  <p>{last}</p>
</>`,
    }),
  },
];
