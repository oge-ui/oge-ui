/**
 * Tiny dependency-free syntax highlighter for the docs code blocks.
 *
 * Single-pass scanner: at every position the earliest-starting rule match
 * wins (rule order breaks ties), the token is emitted, and scanning resumes
 * after it. Nothing is ever re-scanned and every chunk is HTML-escaped at
 * emit time — so the output's textContent is exactly the input, by
 * construction. (The previous placeholder/stash design could corrupt output
 * when a later rule matched inside a placeholder.)
 */

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface Rule {
  /** Must be a global ('g') regex; it is executed with lastIndex. */
  pattern: RegExp;
  /** Renders the raw match into HTML (must escape user text via `esc`). */
  render: (match: RegExpExecArray) => string;
}

const span =
  (className: string) =>
  (match: RegExpExecArray): string =>
    `<span class="${className}">${esc(match[0])}</span>`;

/** group 1 emitted plain, group 2 wrapped. */
const prefixed =
  (className: string) =>
  (match: RegExpExecArray): string =>
    `${esc(match[1] ?? '')}<span class="${className}">${esc(match[2] ?? '')}</span>`;

const TS_KEYWORDS =
  '\\b(?:import|export|from|const|let|var|function|return|class|interface|type|extends|implements|new|this|readonly|public|protected|private|static|async|await|if|else|for|of|in|while|switch|case|default|null|undefined|true|false|void|typeof|instanceof|as|satisfies|enum)\\b';

const RULES: Record<string, Rule[]> = {
  ts: [
    { pattern: /\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, render: span('tok-comment') },
    { pattern: /`(?:[^`\\]|\\.)*`|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, render: span('tok-string') },
    { pattern: /@\w+/g, render: span('tok-decorator') },
    { pattern: new RegExp(TS_KEYWORDS, 'g'), render: span('tok-keyword') },
    { pattern: /\b[A-Z][A-Za-z0-9_]*\b/g, render: span('tok-type') },
    { pattern: /\b\d+(?:\.\d+)?\b/g, render: span('tok-number') },
  ],
  html: [
    { pattern: /<!--[\s\S]*?-->/g, render: span('tok-comment') },
    { pattern: /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, render: span('tok-string') },
    { pattern: /(<\/?)([a-zA-Z][\w-]*)/g, render: prefixed('tok-tag') },
    { pattern: /\{\{[^}]*\}\}/g, render: span('tok-interp') },
    {
      pattern:
        /(\s)((?:\[\([^\s=\]]*\)\]|\[[^\s=\]]*\]|\([^\s=)]*\)|\*[\w-]+|@[\w.]+|[a-zA-Z-]+))(?==)/g,
      render: prefixed('tok-attr'),
    },
  ],
  css: [
    { pattern: /\/\*[\s\S]*?\*\//g, render: span('tok-comment') },
    { pattern: /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, render: span('tok-string') },
    { pattern: /@[a-z-]+/g, render: span('tok-decorator') },
    { pattern: /--[\w-]+/g, render: span('tok-attr') },
    { pattern: /(^|[{;]\s*)([a-z-]+)(?=\s*:)/gm, render: prefixed('tok-attr') },
    {
      pattern: /#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em|%|ms|s|fr)?\b/g,
      render: span('tok-number'),
    },
  ],
  sh: [
    { pattern: /#[^\n]*/g, render: span('tok-comment') },
    { pattern: /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, render: span('tok-string') },
    { pattern: /(^|\s)(npm|npx|nx|ng|git|install)(?=\s|$)/gm, render: prefixed('tok-keyword') },
  ],
};

export function highlight(code: string, language: string): string {
  const rules = RULES[language] ?? RULES['ts'];
  let out = '';
  let pos = 0;

  while (pos < code.length) {
    let bestMatch: RegExpExecArray | null = null;
    let bestRule: Rule | null = null;

    for (const rule of rules) {
      rule.pattern.lastIndex = pos;
      const match = rule.pattern.exec(code);
      if (match && (bestMatch === null || match.index < bestMatch.index)) {
        bestMatch = match;
        bestRule = rule;
        if (match.index === pos) break; // cannot start earlier; rule order breaks ties
      }
    }

    if (!bestMatch || !bestRule) {
      out += esc(code.slice(pos));
      break;
    }
    out += esc(code.slice(pos, bestMatch.index));
    out += bestRule.render(bestMatch);
    pos = bestMatch.index + Math.max(bestMatch[0].length, 1);
  }

  return out;
}
