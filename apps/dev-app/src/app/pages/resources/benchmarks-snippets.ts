/** Code samples rendered on the benchmarks page (shell commands: fragments, exempt from the component compile gate). */

export const RUN = `npx nx run dev-app:build                 # the production docs build
node tools/benchmarks/grid-bench.mjs      # writes tools/benchmarks/grid-results.json
node tools/benchmarks/grid-bench.mjs --runs 9 --rows 250000`;
