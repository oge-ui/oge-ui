/** `ng add @oge-ui/<package>` options — mirrors `schema.json`. */
export interface NgAddOptions {
  /** Workspace project to wire the theme stylesheet into. */
  readonly project?: string;
  /**
   * Optional theme stylesheet. `none` (the default) adds nothing: component
   * styles ship inside the components and the light theme is built in.
   */
  readonly theme?: 'none' | 'dark' | 'tailwind' | 'bootstrap';
  /** Skip writing the OGE usage block into `AGENTS.md`. */
  readonly skipAgentsFile?: boolean;
}
