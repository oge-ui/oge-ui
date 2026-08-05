/**
 * Tiny dependency-free syntax highlighter for the docs code blocks.
 * Escapes the input first, then wraps tokens in <span class="tok-*"> —
 * safe to bind via innerHTML.
 */

function escapeHtml(code: string): string {
  return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface Rule {
  pattern: RegExp;
  /** Wraps the match; `g` are the capture groups. */
  render: (match: string, g: string[]) => string;
}

const span = (className: string) => (match: string) =>
  `<span class="${className}">${match}</span>`;

const TS_KEYWORDS =
  '\\b(?:import|export|from|const|let|var|function|return|class|interface|type|extends|implements|new|this|readonly|public|protected|private|static|async|await|if|else|for|of|in|while|switch|case|default|null|undefined|true|false|void|typeof|instanceof|as|satisfies|enum)\\b';

const RULES: Record<string, Rule[]> = {
  ts: [
    { pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|&lt;!--[\s\S]*?--&gt;)/g, render: span('tok-comment') },
    { pattern: /(`(?:[^`\\]|\\.)*`|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")/g, render: span('tok-string') },
    { pattern: /(@\w+)/g, render: span('tok-decorator') },
    { pattern: new RegExp(`(${TS_KEYWORDS})`, 'g'), render: span('tok-keyword') },
    { pattern: /\b([A-Z][A-Za-z0-9_]*)\b/g, render: span('tok-type') },
    { pattern: /\b(\d+(?:\.\d+)?)\b/g, render: span('tok-number') },
  ],
  html: [
    { pattern: /(&lt;!--[\s\S]*?--&gt;)/g, render: span('tok-comment') },
    { pattern: /('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")/g, render: span('tok-string') },
    {
      pattern: /(&lt;\/?)([a-zA-Z][\w-]*)/g,
      render: (_m, g) => `${g[0]}<span class="tok-tag">${g[1]}</span>`,
    },
    { pattern: /(\{\{[^}]*\}\})/g, render: span('tok-interp') },
    {
      pattern: /(\s)((?:[[(]{1,2}[\w.\-$]+[\])]{1,2}|\*[\w-]+|@[\w.]+|[a-zA-Z-]+))(?==)/g,
      render: (_m, g) => `${g[0]}<span class="tok-attr">${g[1]}</span>`,
    },
  ],
  css: [
    { pattern: /(\/\*[\s\S]*?\*\/)/g, render: span('tok-comment') },
    { pattern: /('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")/g, render: span('tok-string') },
    { pattern: /(@[a-z-]+)/g, render: span('tok-decorator') },
    { pattern: /(--[\w-]+)/g, render: span('tok-attr') },
    {
      pattern: /(^|[{;]\s*)([a-z-]+)(?=\s*:)/gm,
      render: (_m, g) => `${g[0]}<span class="tok-attr">${g[1]}</span>`,
    },
    {
      pattern: /(#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em|%|ms|s|fr)?\b)/g,
      render: span('tok-number'),
    },
  ],
  sh: [
    { pattern: /(#[^\n]*)/g, render: span('tok-comment') },
    { pattern: /('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")/g, render: span('tok-string') },
    { pattern: /(^|\s)(npm|npx|nx|ng|git|install)(?=\s|$)/gm, render: (_m, g) => `${g[0]}<span class="tok-keyword">${g[1]}</span>` },
  ],
};

/**
 * Applies rules in order; earlier matches are stashed behind private-use
 * placeholder characters so later rules cannot re-tokenize them.
 */
const OPEN = '';
const CLOSE = '';

export function highlight(code: string, language: string): string {
  const rules = RULES[language] ?? RULES['ts'];
  let text = escapeHtml(code);
  const stash: string[] = [];

  for (const rule of rules) {
    text = text.replace(rule.pattern, (match, ...args) => {
      if (match.includes(OPEN)) return match;
      const groups = args.slice(0, -2) as string[];
      stash.push(rule.render(match, groups));
      return `${OPEN}${stash.length - 1}${CLOSE}`;
    });
  }

  return text.replace(/(\d+)/g, (_m, index: string) => stash[Number(index)]);
}
