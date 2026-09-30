import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import {
  updateWorkspace,
  type WorkspaceDefinition,
} from '@schematics/angular/utility/workspace';
import type { NgAddOptions } from './options';

/**
 * Theme stylesheets ship in `@oge-ui/core`, which every OGE package installs.
 * The schematic makes it a **direct** dependency before pointing `styles` at it:
 * under pnpm (or Yarn PnP) a transitive package is not reachable from the app,
 * so `node_modules/@oge-ui/core/…` would otherwise not resolve.
 */
const THEME_OWNER = '@oge-ui/core';

/**
 * Registers an optional theme stylesheet in the target project's `styles` array.
 *
 * There is nothing to wire for the default look — component styles travel with
 * the components and the light theme is built in. The bridge/dark stylesheets
 * only override `--oge-*` tokens, so they go **first** in `styles`: the app's own
 * stylesheet then still wins over them.
 *
 * Never throws. A workspace this schematic cannot understand (an Nx repo, a bare
 * library, a project with no `build` target) gets a warning and the manual
 * one-liner instead.
 *
 * @param packageVersion the version of the package being added — every OGE
 *   package is released in lockstep, so `@oge-ui/core` is pinned to the same one
 */
export function addThemeStyle(
  packageName: string,
  options: NgAddOptions,
  packageVersion: string,
): Rule {
  return (tree, context) => {
    const theme = options.theme ?? 'none';
    if (theme === 'none') return;

    const entry = `node_modules/${THEME_OWNER}/themes/${theme}.css`;
    const manual = `Add \`@import '${THEME_OWNER}/themes/${theme}.css';\` to your global stylesheet instead.`;

    if (!ensureDirectDependency(tree, context, packageName, packageVersion)) {
      context.logger.warn(
        `  ! no readable package.json — run \`npm i ${THEME_OWNER}@${packageVersion}\`, then ${manual.charAt(0).toLowerCase()}${manual.slice(1)}`,
      );
      return;
    }
    if (!tree.exists('/angular.json')) {
      context.logger.warn(`  ! no angular.json found — ${manual}`);
      return;
    }

    return updateWorkspace((workspace) => {
      const project = resolveProject(workspace, options.project);
      if (!project) {
        context.logger.warn(
          `  ! could not pick a project to configure — pass \`--project <name>\`. ${manual}`,
        );
        return;
      }
      const build = project.definition.targets.get('build');
      if (!build) {
        context.logger.warn(
          `  ! project "${project.name}" has no \`build\` target — ${manual}`,
        );
        return;
      }
      const styles = Array.isArray(build.options?.['styles'])
        ? [...(build.options['styles'] as unknown[])]
        : [];
      const already = styles.some(
        (style) =>
          typeof style === 'string' && style.includes(`themes/${theme}.css`),
      );
      if (already) {
        context.logger.info(
          `  · ${theme} theme already registered in "${project.name}"`,
        );
        return;
      }
      styles.unshift(entry);
      build.options = { ...build.options, styles: styles as never };
      context.logger.info(
        `  ✓ added ${entry} to the "${project.name}" build styles`,
      );
    });
  };
}

/**
 * Makes `@oge-ui/core` a direct dependency (pinned to the added package's
 * version) and schedules an install when it was not one. False when there is no
 * package.json to edit.
 */
function ensureDirectDependency(
  tree: Tree,
  context: SchematicContext,
  packageName: string,
  version: string,
): boolean {
  const raw = tree.read('/package.json')?.toString('utf8');
  if (!raw) return false;
  let json: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  try {
    json = JSON.parse(raw) as typeof json;
  } catch {
    return false;
  }
  if (packageName === THEME_OWNER) return true;
  if (json.dependencies?.[THEME_OWNER] || json.devDependencies?.[THEME_OWNER])
    return true;
  json.dependencies = { ...json.dependencies, [THEME_OWNER]: version };
  tree.overwrite(
    '/package.json',
    `${JSON.stringify(json, null, 2)}
`,
  );
  context.addTask(new NodePackageInstallTask());
  context.logger.info(
    `  ✓ added ${THEME_OWNER}@${version} to dependencies (the theme stylesheets ship there)`,
  );
  return true;
}

/**
 * The named project, or the only application in the workspace. Ambiguity is
 * reported rather than guessed — silently styling the wrong app is worse than
 * printing the manual step.
 */
function resolveProject(
  workspace: WorkspaceDefinition,
  name: string | undefined,
): {
  name: string;
  definition: NonNullable<ReturnType<WorkspaceDefinition['projects']['get']>>;
} | null {
  if (name) {
    const definition = workspace.projects.get(name);
    return definition ? { name, definition } : null;
  }
  const applications = [...workspace.projects.entries()].filter(
    ([, definition]) => definition.extensions['projectType'] === 'application',
  );
  if (applications.length !== 1) return null;
  const [projectName, definition] = applications[0];
  return { name: projectName, definition };
}
