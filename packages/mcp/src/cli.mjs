#!/usr/bin/env node
/**
 * `npx @oge-ui/mcp` — the OGE UI MCP server over stdio (newline-delimited
 * JSON-RPC 2.0, the MCP stdio transport). Diagnostics go to stderr; stdout
 * carries protocol messages only.
 */
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createOgeMcpServer } from './server.mjs';

const docs = JSON.parse(
  readFileSync(fileURLToPath(new URL('./docs.json', import.meta.url)), 'utf8'),
);
const server = createOgeMcpServer(docs);

const write = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
lines.on('line', (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    write({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' },
    });
    return;
  }
  const batch = Array.isArray(message) ? message : [message];
  const replies = batch.map((m) => server.handle(m)).filter(Boolean);
  if (replies.length) write(Array.isArray(message) ? replies : replies[0]);
});
lines.on('close', () => process.exit(0));
process.stderr.write(`OGE UI MCP server ${docs.version} ready on stdio\n`);
