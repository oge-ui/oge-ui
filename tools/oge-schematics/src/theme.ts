import type { Rule, Tree } from '@angular-devkit/schematics';
import {
  updateWorkspace,
  type WorkspaceDefinition,
} from '@schematics/angular/utility/workspace';
import type { NgAddOptions } from './options';

/** Theme stylesheets ship in `@oge-ui/grid` — the package that owns the tokens. */
const THEME_OWNER = '@oge-ui/grid';
const UMBRELLA = 'oge-ui';

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
 */
export function addThemeStyle(
  packageName: string,
  options: NgAddOptions,
): Rule {
  return (tree, context) => {
    const theme = options.theme ?? 'none';
    if (theme === 'none') return;

    const entry = `node_modules/${THEME_OWNER}/themes/${theme}.css`;
    const manual = `Add \`@import '${THEME_OWNER}/themes/${theme}.css';\` to your global stylesheet instead.`;

    if (!ownsThemes(tree, packageName)) {
      context.logger.warn(
        `  ! theme stylesheets live in ${THEME_OWNER}, which is not installed. Run \`npm i ${THEME_OWNER}\` (or \`${UMBRELLA}\`) first.`,
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

/** True when the theme stylesheets are reachable from the consumer's deps. */
function ownsThemes(tree: Tree, packageName: string): boolean {
  if (packageName === THEME_OWNER || packageName === UMBRELLA) return true;
  const raw = tree.read('/package.json')?.toString('utf8');
  if (!raw) return false;
  try {
    const json = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return [json.dependencies, json.devDependencies].some(
      (group) =>
        group !== undefined && (THEME_OWNER in group || UMBRELLA in group),
    );
  } catch {
    return false;
  }
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
