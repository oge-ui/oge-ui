/**
 * The item model moved into `@oge-ui/behavior` so the React layer runs exactly
 * this code (ADR 0001). Re-exported here because the form, the field and the
 * package's own specs import it by this path — the extraction changed where
 * the logic lives, not what any caller sees.
 */
export {
  captionize,
  emptyValueForDataType,
  formColumnsCount,
  formColumnsCss,
  inferDataType,
  isBareEditor,
  orderByVisibleIndex,
  pickEditorType,
  readPath,
  resolveItem,
  writePath,
} from '@oge-ui/behavior';
