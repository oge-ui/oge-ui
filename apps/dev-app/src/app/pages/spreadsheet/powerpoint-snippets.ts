import { demoSource } from '../../shared/demo-source';

export const PRESENTATION_GETTING_STARTED_SNIPPET = demoSource({
  use: { '@oge-ui/spreadsheet/powerpoint': ['OgePresentation'] },
  template: `<!-- One element shows a .pptx file the way PowerPoint does. [source]
     takes a URL, the file's bytes or a File; reading happens in the browser,
     with no dependency. Arrow keys, Page Up/Down, Home and End move between
     slides. -->
<oge-presentation
  source="/demo/spreadsheet/slides.pptx"
  style="height: 520px"
/>`,
});

export const PRESENTATION_CONTROLLED_SNIPPET = demoSource({
  use: { '@oge-ui/spreadsheet/powerpoint': ['OgePresentation'] },
  body: `readonly slide = signal(2);`,
  template: `<!-- [(slideIndex)] keeps the current slide in your own state and
     [thumbnails]="false" hides the slide rail. -->
<oge-presentation
  source="/demo/spreadsheet/slides.pptx"
  [thumbnails]="false"
  [(slideIndex)]="slide"
  style="height: 420px"
/>`,
});
