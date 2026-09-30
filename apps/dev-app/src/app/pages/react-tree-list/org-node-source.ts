/**
 * The org-chart row declaration every React tree-list demo's Code tab starts
 * with (the shape of `../tree-list/tree-data.ts`). A plain string, kept out of
 * the `*-snippets.ts` modules so the snippet collector never mistakes it for
 * a demo of its own.
 */
export const ORG_NODE = `interface OrgNode {
  id: number;
  parentId: number | null;
  name: string;
  title: string;
  office: string;
  headcount: number;
}

declare const org: OrgNode[];`;
