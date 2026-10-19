import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  test: {
    name: 'mcp',
    watch: false,
    environment: 'node',
    include: ['src/**/*.spec.mjs'],
    reporters: ['default'],
  },
});
