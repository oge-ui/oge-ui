/** One package as the server describes it. */
export interface OgeMcpPackage {
  readonly npm: string;
  readonly label: string;
  readonly summary: string;
  readonly tier: string;
  readonly framework: 'angular' | 'react' | 'agnostic';
  readonly docsRoot?: string;
  /** The package's machine-readable reference (its `llms.txt`). */
  readonly docs: string;
}

/** The docs the server answers from (`docs.json` in the package). */
export interface OgeMcpDocs {
  readonly version: string;
  readonly overview: string;
  readonly packages: readonly OgeMcpPackage[];
}

/** A tool as `tools/list` advertises it. */
export interface OgeMcpTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
}

/**
 * Creates the transport-free server: `handle` maps one JSON-RPC 2.0 message
 * to its reply, or `null` for a notification.
 */
export function createOgeMcpServer(docs: OgeMcpDocs): {
  handle(message: unknown): Record<string, unknown> | null;
  readonly tools: readonly OgeMcpTool[];
};
