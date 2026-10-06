import type { SsrFamily } from '../render';
import { CHARTS } from './charts';
import { PIVOT, TREE_LIST } from './data';
import { BPMN, EDITOR, FORMS, UPLOAD } from './editors';
import { GRID } from './grid';
import { GANTT, KANBAN, SCHEDULER } from './planning';
import { BUTTONS, INPUTS, LAYOUT, NAVIGATION, OVERLAY, TABS } from './ui';

/**
 * One entry per Angular family; the specs iterate this list. A new family
 * adds its host here (ARCHITECTURE → "SSR and hydration").
 */
export const FAMILIES: readonly SsrFamily[] = [
  GRID,
  TREE_LIST,
  PIVOT,
  CHARTS,
  SCHEDULER,
  GANTT,
  KANBAN,
  BPMN,
  INPUTS,
  OVERLAY,
  NAVIGATION,
  LAYOUT,
  TABS,
  BUTTONS,
  FORMS,
  UPLOAD,
  EDITOR,
];
