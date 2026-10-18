import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';

/** The React inputs sheet, on a carrier of its own (it alone is near the budget). */
@Component({
  selector: 'app-react-ai-inputs-styles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/react/inputs/src/styles.scss'],
  template: '',
})
export class ReactAiInputsStyles {}

/**
 * Stylesheet carrier for the React smart-paste demo: the React form and its
 * editors carry class names but no styles of their own, so the docs inline
 * the same SCSS the packages compile. Separate components because the docs
 * inline every stylesheet per component, and the forms and inputs sheets
 * together would pass the `anyComponentStyle` budget one component may carry.
 */
@Component({
  selector: 'app-react-ai-smart-paste-styles',
  imports: [ReactAiInputsStyles],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/react/forms/src/styles.scss'],
  template: '<app-react-ai-inputs-styles />',
})
export class ReactAiSmartPasteStyles {}
