/**
 * Conventional-commit lint for pull requests (`.github/workflows/ci.yml` →
 * `commitlint`). Pushes to main are not linted — main only receives merges
 * of commits that already passed here.
 *
 * Self-contained on purpose: CI runs `npx --yes @commitlint/cli@<pinned>`
 * without installing a shared config, so nothing here may `extends` or
 * resolve another package. The rules follow `@commitlint/config-conventional`
 * except where this repo's history deliberately differs:
 *
 * - `merge:` is a type (worktree merges are written `merge: <what landed>`);
 * - one header may carry several types, `docs,test(rtl): …`;
 * - scopes are optional, lower-case and may list several packages,
 *   `feat(bpmn-engine,bpmn,react-bpmn): …`;
 * - no header / body length limit — headers here summarise whole waves.
 *
 * Run locally: `npx --yes @commitlint/cli@21.2.3 --from origin/main --to HEAD`
 */
const TYPES = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'merge',
  'perf',
  'refactor',
  'revert',
  'style',
  'test',
];

export default {
  parserPreset: {
    parserOpts: {
      // `type[,type…][(scope[,scope…])][!]: subject`
      headerPattern: /^([\w,]+)(?:\(([^()]*)\))?(!)?: (.*)$/,
      headerCorrespondence: ['type', 'scope', 'breaking', 'subject'],
      noteKeywords: ['BREAKING CHANGE', 'BREAKING-CHANGE'],
    },
  },
  // git's own merge / revert headers (`Merge branch 'main'`) are skipped
  defaultIgnores: true,
  plugins: [
    {
      rules: {
        'oge-type-enum': ({ type }) => {
          if (!type) return [true];
          const bad = type.split(',').filter((t) => !TYPES.includes(t));
          return [
            bad.length === 0,
            `type must be one of [${TYPES.join(', ')}] (several may be joined with ",") — got "${bad.join(',')}"`,
          ];
        },
      },
    },
  ],
  rules: {
    'oge-type-enum': [2, 'always'],
    'type-empty': [2, 'never'],
    'type-case': [2, 'always', 'lower-case'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-trim': [2, 'always'],
    'body-leading-blank': [1, 'always'],
    // off: wrapped body lines such as "context: row, index" parse as
    // footer tokens and would warn on almost every long commit
    'footer-leading-blank': [0],
  },
};
