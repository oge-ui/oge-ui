/** Code samples rendered on the design token reference. */

export const DTCG_IMPORT = `// Design Tokens Community Group format (2025.10): $value + $type,
// one group per theme — light, dark and high-contrast.
import tokens from '@oge-ui/core/tokens.json' with { type: 'json' };

tokens.light.accent.$value.hex; // '#2563eb'
tokens.dark.accent.$value.components; // [0.3765, 0.6471, 0.9804] (sRGB)
tokens.light['input-muted'].$value; // '{light.header-color}' — an alias

// every token names the CSS custom property it maps to
tokens.light.accent.$extensions['com.ogeui'].cssVariable; // '--oge-accent'`;

export const OVERRIDE = `/* A token is a CSS custom property: set it on :root (the defaults sit at
   zero specificity, so this wins wherever your stylesheet loads)… */
:root {
  --oge-accent: #7c3aed;
  --oge-radius: 8px;
}

/* …or on any subtree. A scope that sets a base token re-derives the
   tints that depend on it only where those tints are declared, so a
   scoped theme also re-declares the derived set — the Theme builder's
   scoped export does that for you. */
.billing-panel {
  --oge-accent: #0f766e;
}`;
