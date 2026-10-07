/**
 * `.md` files import as their text (the `loader` option in project.json) —
 * the `/changelog` page reads the repository's CHANGELOG.md this way.
 */
declare module '*.md' {
  const content: string;
  export default content;
}
