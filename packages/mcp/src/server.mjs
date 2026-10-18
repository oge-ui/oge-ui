/**
 * The OGE UI MCP server: a dependency-free Model Context Protocol server that
 * hands coding assistants the suite's own machine-readable docs — the same
 * `llms.txt` artifacts the docs site publishes, bundled into this package, so
 * it works offline and answers for the installed version.
 *
 * This module is transport-free: `createOgeMcpServer(docs)` returns a
 * `handle(message)` function that maps one JSON-RPC 2.0 message to its reply
 * (or `null` for notifications). `cli.mjs` wires it to stdio.
 */

/** MCP protocol revisions this server speaks, newest first. */
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const MAX_RESULTS = 8;
const EXCERPT = 700;

/**
 * @typedef {{ npm: string, label: string, summary: string, tier: string,
 *   framework: 'angular' | 'react' | 'agnostic', docsRoot?: string, docs: string }} OgeMcpPackage
 * @typedef {{ version: string, overview: string, packages: OgeMcpPackage[] }} OgeMcpDocs
 */

/** Splits a markdown document into heading-led sections. */
function sections(text) {
  const out = [];
  let heading = '';
  let body = [];
  const flush = () => {
    const content = body.join('\n').trim();
    if (heading || content) out.push({ heading, body: content });
  };
  for (const line of text.split(/\r?\n/)) {
    const match = /^(#{1,4})\s+(.*)$/.exec(line);
    if (match) {
      flush();
      heading = match[2].trim();
      body = [];
    } else {
      body.push(line);
    }
  }
  flush();
  return out;
}

function terms(query) {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}@/._-]+/u)
    .filter((t) => t.length > 1);
}

function count(haystack, needle) {
  let n = 0;
  let at = haystack.indexOf(needle);
  while (at >= 0) {
    n++;
    at = haystack.indexOf(needle, at + needle.length);
  }
  return n;
}

function frameworkMatches(pkg, framework) {
  if (!framework || framework === 'any') return true;
  return pkg.framework === framework || pkg.framework === 'agnostic';
}

const TOOLS = [
  {
    name: 'list_packages',
    description:
      'Lists every OGE UI package (Angular, React and framework-free) with its npm name, license tier and a one-line summary. Start here to find the package for a component.',
    inputSchema: {
      type: 'object',
      properties: {
        framework: {
          type: 'string',
          enum: ['angular', 'react', 'any'],
          description:
            'Only packages for this framework (plus the framework-free ones).',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_package_docs',
    description:
      'Returns the complete machine-readable reference of one package — components, every input/prop, output/callback, method and type, usage rules and copy-pasteable examples. Use the npm name from list_packages.',
    inputSchema: {
      type: 'object',
      properties: {
        package: {
          type: 'string',
          description: 'npm name, e.g. "@oge-ui/grid" or "@oge-ui/react-grid".',
        },
      },
      required: ['package'],
      additionalProperties: false,
    },
  },
  {
    name: 'search_docs',
    description:
      'Searches the OGE UI docs and returns the best-matching sections with their package — e.g. "grid virtual scrolling", "date box min max", "kanban swimlanes".',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to look for.' },
        framework: {
          type: 'string',
          enum: ['angular', 'react', 'any'],
          description:
            'Restrict to one framework (framework-free packages always match).',
        },
        limit: {
          type: 'number',
          description: 'Most sections to return (1–8, default 5).',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_setup',
    description:
      'Returns the install command, theme/stylesheet import and provider setup for a framework — the first thing to do in a new project.',
    inputSchema: {
      type: 'object',
      properties: {
        framework: { type: 'string', enum: ['angular', 'react'] },
      },
      required: ['framework'],
      additionalProperties: false,
    },
  },
];

const SETUP = {
  angular: `# OGE UI for Angular

\`\`\`bash
ng add oge-ui            # or: npm install @oge-ui/grid @oge-ui/inputs …
\`\`\`

Every component is standalone and signal-based: import it into the component
that uses it. Styles ship with each component; pick a theme in angular.json
styles (\`@oge-ui/core/themes/dark.css\`, \`tailwind.css\`, \`bootstrap.css\`) or
override the \`--oge-*\` tokens. Defaults and strings come from
\`provideOge<Family>Config()\` providers; \`provideOgeLocale(pack)\` from
\`@oge-ui/locales\` translates the MIT families at once.

Commercial families (pivot, charts, scheduler, gantt, kanban, bpmn) need a key
in production: \`ogeSetLicenseKey('OGE1.…')\` before bootstrapping.`,
  react: `# OGE UI for React

\`\`\`bash
npm install @oge-ui/react          # every MIT family, one stylesheet
# or per family: npm install @oge-ui/react-grid @oge-ui/react-inputs …
\`\`\`

Import the stylesheet once: \`import '@oge-ui/react/styles.css'\` (or the
family's own \`@oge-ui/react-<family>/styles.css\`). Components are client
components (\`'use client'\` is in the build) and SSR-safe. Defaults and
strings come from \`<Oge<Family>ConfigProvider>\`; \`<OgeLocaleProvider pack>\`
translates the MIT families at once.

Commercial families need a key in production: \`ogeSetLicenseKey('OGE1.…')\`
before rendering.`,
};

/**
 * @param {OgeMcpDocs} docs
 */
export function createOgeMcpServer(docs) {
  const byNpm = new Map(docs.packages.map((p) => [p.npm, p]));
  const index = docs.packages.flatMap((pkg) =>
    sections(pkg.docs).map((s) => ({
      pkg,
      heading: s.heading,
      body: s.body,
      lower: `${s.heading}\n${s.body}`.toLowerCase(),
      head: s.heading.toLowerCase(),
    })),
  );

  const text = (value) => ({ content: [{ type: 'text', text: value }] });
  const fail = (value) => ({
    content: [{ type: 'text', text: value }],
    isError: true,
  });

  const tools = {
    list_packages(args) {
      const list = docs.packages.filter((p) =>
        frameworkMatches(p, args.framework),
      );
      return text(
        list
          .map(
            (p) =>
              `- ${p.npm} (${p.framework}, ${p.tier}) — ${p.label}: ${p.summary}`,
          )
          .join('\n'),
      );
    },
    get_package_docs(args) {
      const name = String(args.package ?? '').trim();
      const pkg =
        byNpm.get(name) ??
        docs.packages.find(
          (p) =>
            p.npm.endsWith(`/${name}`) ||
            p.label.toLowerCase() === name.toLowerCase(),
        );
      if (!pkg) {
        return fail(
          `Unknown package "${name}". Known packages: ${docs.packages.map((p) => p.npm).join(', ')}`,
        );
      }
      return text(pkg.docs);
    },
    search_docs(args) {
      const words = terms(String(args.query ?? ''));
      if (words.length === 0)
        return fail('Give a query, e.g. "grid grouping".');
      const limit = Math.max(1, Math.min(MAX_RESULTS, Number(args.limit) || 5));
      const scored = [];
      for (const entry of index) {
        if (!frameworkMatches(entry.pkg, args.framework)) continue;
        let score = 0;
        let hits = 0;
        for (const word of words) {
          const inBody = count(entry.lower, word);
          if (inBody) hits++;
          score += inBody + count(entry.head, word) * 4;
        }
        if (score === 0) continue;
        // sections that match every word rank above partial matches
        scored.push({ entry, score: score * (hits === words.length ? 3 : 1) });
      }
      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, limit);
      if (top.length === 0) return text(`No section matches "${args.query}".`);
      return text(
        top
          .map(({ entry }) => {
            const body =
              entry.body.length > EXCERPT
                ? `${entry.body.slice(0, EXCERPT)}…`
                : entry.body;
            return `## ${entry.heading || '(intro)'} — ${entry.pkg.npm}\n\n${body}`;
          })
          .join('\n\n---\n\n'),
      );
    },
    get_setup(args) {
      const setup = SETUP[args.framework];
      return setup
        ? text(setup)
        : fail('framework must be "angular" or "react".');
    },
  };

  /**
   * Handles one JSON-RPC 2.0 message. Returns the response object, or `null`
   * for a notification (no `id`).
   * @param {any} message
   */
  function handle(message) {
    const isRequest =
      message &&
      typeof message === 'object' &&
      'id' in message &&
      message.id !== null;
    const reply = (result) =>
      isRequest ? { jsonrpc: '2.0', id: message.id, result } : null;
    const error = (code, msg) =>
      isRequest
        ? { jsonrpc: '2.0', id: message.id, error: { code, message: msg } }
        : null;

    if (
      !message ||
      message.jsonrpc !== '2.0' ||
      typeof message.method !== 'string'
    ) {
      return isRequest ? error(-32600, 'Invalid request') : null;
    }
    switch (message.method) {
      case 'initialize': {
        const asked = message.params?.protocolVersion;
        return reply({
          protocolVersion: PROTOCOL_VERSIONS.includes(asked)
            ? asked
            : PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'oge-ui', version: docs.version },
          instructions:
            'Docs for the OGE UI component suite (Angular + React). Call list_packages to find a package, ' +
            'get_package_docs for its full API and examples, search_docs for a topic, get_setup for installation. ' +
            'Prefer these docs over memory: they match the installed version ' +
            docs.version +
            '.',
        });
      }
      case 'ping':
        return reply({});
      case 'tools/list':
        return reply({ tools: TOOLS });
      case 'tools/call': {
        const name = message.params?.name;
        const tool = Object.prototype.hasOwnProperty.call(tools, name)
          ? tools[name]
          : undefined;
        if (!tool) return error(-32602, `Unknown tool: ${name}`);
        const args = message.params?.arguments;
        return reply(tool(args && typeof args === 'object' ? args : {}));
      }
      default:
        if (message.method.startsWith('notifications/')) return null;
        return error(-32601, `Method not found: ${message.method}`);
    }
  }

  return { handle, tools: TOOLS };
}
