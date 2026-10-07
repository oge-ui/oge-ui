/** Code samples rendered on the versioning and deprecation policy guide. */

export const LOCKSTEP = `# every @oge-ui package releases together — keep them on one version
npm install @oge-ui/grid@1.1.3 @oge-ui/inputs@1.1.3

# a mixed install shows up as two copies of the shared engines
npm ls @oge-ui/core @oge-ui/behavior`;

export const DEPRECATED_MEMBER = `// @oge-ui/behavior — OgeGridMessages (excerpt)
rowCountAnnouncement: string;
/**
 * @deprecated Put the singular into \`rowCountAnnouncement\` as an ICU plural
 * branch. Still honoured for exactly one row (with a dev-mode warning)
 * until the next minor.
 */
rowCountOneAnnouncement?: string;`;
