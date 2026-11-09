import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React PowerPoint preview. Pure data, no React imports
 * — the `llms.txt` generator and the compile gate load this module in plain
 * Node. Section-for-section mirror of `../spreadsheet/powerpoint.ts`.
 */
export const PRESENTATION_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    source: reactDemoSource({
      use: { '@oge-ui/react-spreadsheet/powerpoint': ['OgePresentation'] },
      name: 'PresentationViewer',
      jsx: `<>
  {/* One element shows a .pptx file the way PowerPoint does. source takes
      a URL, the file's bytes or a File; reading happens in the browser, with
      no dependency. Arrow keys, Page Up/Down, Home and End move between
      slides. */}
  <OgePresentation
    source="/demo/spreadsheet/slides.pptx"
    style={{ height: 520 }}
  />
</>`,
    }),
  },
  {
    title: 'Controlled slide',
    source: reactDemoSource({
      use: { '@oge-ui/react-spreadsheet/powerpoint': ['OgePresentation'] },
      react: ['useState'],
      name: 'ControlledPresentation',
      body: `const [slide, setSlide] = useState(2);`,
      jsx: `<>
  {/* slideIndex keeps the current slide in your own state and
      thumbnails={false} hides the slide rail. */}
  <OgePresentation
    source="/demo/spreadsheet/slides.pptx"
    thumbnails={false}
    slideIndex={slide}
    onSlideIndexChange={setSlide}
    style={{ height: 420 }}
  />
</>`,
    }),
  },
];
