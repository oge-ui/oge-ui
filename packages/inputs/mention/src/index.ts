// @oge-ui/inputs/mention — secondary entry point. Importing a single editor
// from its own entry lets a bundler split the family per component; the
// primary '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export {
  OgeMention,
  OgeMentionItemTemplate,
  type OgeMentionItemTemplateContext,
} from './mention';
export {
  type OgeMentionItemsSource,
  type OgeMentionSearchChangedEvent,
  type OgeMentionSelectedEvent,
  type OgeMentionToken,
  type OgeMentionTrigger,
} from '@oge-ui/behavior';
