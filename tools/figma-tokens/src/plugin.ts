/**
 * The Figma plugin's main thread: imports the OGE UI tokens as the "OGE UI"
 * variable collection (Light / Dark / High contrast) and exports the edited
 * collection back as a CSS theme. Built by `tools/figma-tokens/build.mjs`,
 * which inlines the shipped collection as `__OGE_COLLECTION__`.
 */
import {
  OGE_FIGMA_COLLECTION,
  OGE_FIGMA_MODES,
  ogeFigmaToCss,
  ogeTokensToFigma,
  type OgeDtcgTokens,
  type OgeFigmaCollection,
  type OgeFigmaExportedVariable,
  type OgeFigmaValue,
} from './convert';

declare const __OGE_COLLECTION__: OgeFigmaCollection;
declare const __html__: string;

/* eslint-disable @typescript-eslint/no-explicit-any -- the Figma plugin API has no types in this repo */
declare const figma: any;

type Message =
  | { type: 'import'; tokens?: OgeDtcgTokens }
  | { type: 'export'; changedOnly: boolean }
  | { type: 'close' };

figma.showUI(__html__, { width: 380, height: 420, themeColors: true });

async function collection(): Promise<any> {
  const all = await figma.variables.getLocalVariableCollectionsAsync();
  const found = all.find((c: any) => c.name === OGE_FIGMA_COLLECTION);
  const target =
    found ?? figma.variables.createVariableCollection(OGE_FIGMA_COLLECTION);
  // modes: rename the first, add the rest
  OGE_FIGMA_MODES.forEach((mode, i) => {
    const existing = target.modes[i];
    if (existing) target.renameMode(existing.modeId, mode);
    else target.addMode(mode);
  });
  return target;
}

async function importCollection(spec: OgeFigmaCollection): Promise<number> {
  const target = await collection();
  const modeIds = new Map<string, string>(
    target.modes.map((m: any) => [m.name, m.modeId]),
  );
  const local = await figma.variables.getLocalVariablesAsync();
  const byName = new Map<string, any>(
    local
      .filter((v: any) => v.variableCollectionId === target.id)
      .map((v: any) => [v.name, v]),
  );
  // first every variable, so aliases can point at any of them
  for (const spec1 of spec.variables) {
    let variable = byName.get(spec1.name);
    if (variable && variable.resolvedType !== spec1.type) {
      variable.remove();
      variable = undefined;
    }
    if (!variable) {
      variable = figma.variables.createVariable(spec1.name, target, spec1.type);
      byName.set(spec1.name, variable);
    }
    variable.description = spec1.description;
    variable.scopes = [...spec1.scopes];
    variable.setVariableCodeSyntax('WEB', `var(${spec1.cssVariable})`);
  }
  for (const spec1 of spec.variables) {
    const variable = byName.get(spec1.name);
    for (const mode of spec.modes) {
      const value = spec1.values[mode];
      const modeId = modeIds.get(mode);
      if (!modeId) continue;
      if (typeof value === 'object' && value !== null && 'type' in value) {
        const target1 = byName.get(value.name);
        if (target1)
          variable.setValueForMode(
            modeId,
            figma.variables.createVariableAlias(target1),
          );
      } else {
        variable.setValueForMode(modeId, value);
      }
    }
  }
  return spec.variables.length;
}

async function exportCollection(): Promise<OgeFigmaExportedVariable[]> {
  const all = await figma.variables.getLocalVariableCollectionsAsync();
  const target = all.find((c: any) => c.name === OGE_FIGMA_COLLECTION);
  if (!target) return [];
  const local = await figma.variables.getLocalVariablesAsync();
  const inCollection = local.filter(
    (v: any) => v.variableCollectionId === target.id,
  );
  const nameById = new Map<string, string>(
    inCollection.map((v: any) => [v.id, v.name]),
  );
  return inCollection.map((variable: any) => {
    const values: Record<string, OgeFigmaValue | boolean> = {};
    for (const mode of target.modes) {
      const value = variable.valuesByMode[mode.modeId];
      values[mode.name] =
        value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS'
          ? { type: 'VARIABLE_ALIAS', name: nameById.get(value.id) ?? '' }
          : value;
    }
    const web: string | undefined = variable.codeSyntax?.WEB;
    return {
      name: variable.name,
      type: variable.resolvedType,
      cssVariable: web?.replace(/^var\((--[^)]+)\)$/, '$1'),
      values,
    };
  });
}

figma.ui.onmessage = async (message: Message) => {
  try {
    if (message.type === 'import') {
      const spec = message.tokens
        ? ogeTokensToFigma(message.tokens)
        : __OGE_COLLECTION__;
      const count = await importCollection(spec);
      figma.notify(`OGE UI: ${count} variables in 3 modes`);
      figma.ui.postMessage({ type: 'imported', count });
    } else if (message.type === 'export') {
      const variables = await exportCollection();
      const css = ogeFigmaToCss(
        variables,
        message.changedOnly ? { baseline: __OGE_COLLECTION__ } : {},
      );
      figma.ui.postMessage({ type: 'exported', css, count: variables.length });
    } else if (message.type === 'close') {
      figma.closePlugin();
    }
  } catch (error) {
    figma.ui.postMessage({ type: 'error', message: String(error) });
  }
};
