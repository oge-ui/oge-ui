import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';

/** The rich-text editor's toolbar sheet (layout), on a carrier of its own. */
@Component({
  selector: 'app-react-forms-toolbar-styles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/layout/toolbar/src/toolbar.scss'],
  template: '',
})
export class ReactFormsToolbarStyles {}

/**
 * Stylesheet carrier for the React forms "More editors" demo: the React
 * editors carry class names but no styles of their own, so the docs inline
 * the same SCSS the packages compile — the inputs family (rating, OTP, list
 * box, transfer list, mention, signature pad), the rich-text editor and its
 * popups (overlay). Separate components because the docs inline every
 * stylesheet per component, and these sheets together would pass the
 * `anyComponentStyle` budget one component may carry.
 */
@Component({
  selector: 'app-react-forms-more-editors-styles',
  imports: [ReactFormsToolbarStyles],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/editor/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
  ],
  template: '<app-react-forms-toolbar-styles />',
})
export class ReactFormsMoreEditorsStyles {}
