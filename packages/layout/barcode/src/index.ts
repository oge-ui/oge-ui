// @oge-ui/layout/barcode — secondary entry point. Importing a single
// component from its own entry lets a bundler split the family per component;
// the primary '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeBarcode } from './barcode';
export { OgeBarcodeScanner } from './barcode-scanner';
export {
  OGE_BARCODE_CONFIG,
  OGE_DEFAULT_BARCODE_CONFIG,
  OGE_DEFAULT_BARCODE_MESSAGES,
  provideOgeBarcodeConfig,
  type OgeBarcodeConfig,
  type OgeBarcodeConfigInput,
  type OgeBarcodeMessages,
} from './config';
export {
  ogeBarcodeSvg,
  ogeEncodeBarcode,
  ogeNativeBarcodeDecoder,
  type OgeBarcodeDecoder,
  type OgeBarcodeResult,
  type OgeBarcodeScannerStatus,
  type OgeBarcodeType,
  type OgeQrErrorCorrection,
} from '@oge-ui/behavior';
