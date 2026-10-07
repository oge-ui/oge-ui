/** Code samples rendered on the theme builder. */

export const EXPORT_USAGE = `/* styles.css — load the exported file after the OGE stylesheets
   (and after a bridge or dark theme, if you start from one) */
@import './my-theme.css';`;

export const EXPORT_SCOPE = `<!-- the scoped variant applies wherever the attribute is set:
     the whole app, or one region of it -->
<html data-oge-theme="my-theme">
<section data-oge-theme="my-theme">…</section>`;
