# @oge-ui/mcp

A free [Model Context Protocol](https://modelcontextprotocol.io) server for the
OGE UI component suite. It gives your coding assistant — Claude Code, Cursor,
GitHub Copilot, Windsurf, Zed or any MCP client — the suite's own
machine-readable docs: every package's components, inputs and props, outputs
and callbacks, methods, types, usage rules and copy-pasteable examples, for
Angular and React.

- **Offline and exact.** The docs are bundled into the package and match the
  version you install — no network call, no account, no API key.
- **Dependency-free.** Plain Node (18+) over stdio.
- **MIT**, like the rest of the open tier.

## Set up

```bash
# Claude Code
claude mcp add oge-ui -- npx -y @oge-ui/mcp
```

Cursor (`.cursor/mcp.json`), VS Code (`.vscode/mcp.json`), Windsurf, Zed and other clients:

```json
{
  "mcpServers": {
    "oge-ui": { "command": "npx", "args": ["-y", "@oge-ui/mcp"] }
  }
}
```

## Tools

| Tool               | What it returns                                                                     |
| ------------------ | ----------------------------------------------------------------------------------- |
| `list_packages`    | Every package with its npm name, framework, license tier and summary                |
| `get_package_docs` | One package's complete reference (`@oge-ui/grid`, `@oge-ui/react-grid`, …)          |
| `search_docs`      | The best-matching doc sections for a topic ("grid virtual scrolling"), by framework |
| `get_setup`        | Install, stylesheet and provider setup for Angular or React                         |

## Use it from code

```js
import { createOgeMcpServer } from '@oge-ui/mcp';
// handle(message) maps one JSON-RPC 2.0 message to its reply (null for notifications)
```

## License

MIT — free forever. See [LICENSE](LICENSE).
