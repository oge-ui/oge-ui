import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgePresentation } from '@oge-ui/react-spreadsheet/powerpoint';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { PRESENTATION_DEMOS } from './powerpoint-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_PRESENTATION_SECTIONS = [
  'Getting started',
  'Controlled slide',
] as const;

const SOURCE = '/demo/spreadsheet/slides.pptx';

function ControlledDemo(): ReactNode {
  const [slide, setSlide] = useState(2);
  return createElement(OgePresentation, {
    source: SOURCE,
    thumbnails: false,
    slideIndex: slide,
    onSlideIndexChange: setSlide,
    style: { height: 420 },
  });
}

@Component({
  selector: 'app-react-presentation-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React viewer carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/react/spreadsheet/src/styles.scss'],
  template: `
    <app-demo-card
      [chips]="['source', 'thumbnails', 'keyboard']"
      heading="Getting started"
      description="Point <code>source</code> at a presentation. Arrow keys, Page Up, Page Down, Home and End move between slides, and every slide is announced to screen readers."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="gettingStarted" />
    </app-demo-card>

    <app-demo-card
      [chips]="['slideIndex', 'thumbnails']"
      heading="Controlled slide"
      description="<code>slideIndex</code> with <code>onSlideIndexChange</code> keeps the current slide in your own state, and <code>thumbnails</code> hides the slide rail."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="controlled" />
    </app-demo-card>
  `,
})
export class ReactPresentationDemos {
  protected readonly demos = PRESENTATION_DEMOS;
  protected readonly gettingStarted = () =>
    createElement(OgePresentation, {
      source: SOURCE,
      style: { height: 520 },
    });
  protected readonly controlled = () => createElement(ControlledDemo);
}
