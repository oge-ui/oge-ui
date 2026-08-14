// Stylesheet entry point. Kept separate from `index.ts` so the JS bundle never
// imports CSS: a consumer rendering on the server, or bundling without a CSS
// loader, must not be forced to resolve it. Apps import the built artifact —
// `import '@oge-ui/react-layout/styles.css'` — exactly once.
import './styles.scss';
