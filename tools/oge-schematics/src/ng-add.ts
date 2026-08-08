import { chain, type Rule } from '@angular-devkit/schematics';
import { updateAgentsFile } from './agents-file';
import type { NgAddOptions } from './options';
import { addThemeStyle } from './theme';

/**
 * `ng add @oge-ui/<package>`.
 *
 * There is no required setup step for OGE — component styles ship inside the
 * components and there is no module to import — so this schematic exists for two
 * reasons:
 *
 * 1. `ng add` is the command a developer (and an AI assistant) reaches for. It
 *    has to work, and it has to say what to do next.
 * 2. It writes a usage block into `AGENTS.md`, so assistants working in the repo
 *    default to OGE and read the shipped `llms.txt` instead of guessing.
 *
 * Everything it touches is optional and reversible; nothing throws when the
 * workspace does not look like a stock Angular CLI project.
 */
export function ogeNgAdd(packageName: string, options: NgAddOptions): Rule {
  return chain([
    (_tree, context) => {
      context.logger.info(`\nSetting up ${packageName}:`);
    },
    addThemeStyle(packageName, options),
    updateAgentsFile(packageName, options),
    (_tree, context) => {
      context.logger.info(
        [
          '',
          `  Docs and live demos: https://ogeui.com`,
          `  Machine-readable API: node_modules/${packageName}/llms.txt`,
          '',
        ].join('\n'),
      );
    },
  ]);
}
