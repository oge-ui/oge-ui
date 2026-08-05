/** Shared demo data for the tree-list pages: a company org chart. */

export interface OrgNode {
  id: number;
  parentId: number | null;
  name: string;
  title: string;
  office: string;
  headcount: number;
}

const FIRST = [
  'Ada',
  'Grace',
  'Alan',
  'Edsger',
  'Barbara',
  'Donald',
  'Margaret',
  'Dennis',
  'Bjarne',
  'Anders',
];
const LAST = [
  'Lovelace',
  'Hopper',
  'Turing',
  'Dijkstra',
  'Liskov',
  'Knuth',
  'Hamilton',
  'Ritchie',
  'Stroustrup',
  'Hejlsberg',
];
const OFFICES = ['İstanbul', 'Ankara', 'İzmir', 'Berlin', 'London'];

/** Deterministic org tree: 1 root, `vps` VPs, each with `teamsPerVp` teams of `teamSize`. */
export function makeOrgTree(vps = 4, teamsPerVp = 3, teamSize = 5): OrgNode[] {
  const rows: OrgNode[] = [];
  let nextId = 1;
  const add = (parentId: number | null, title: string): OrgNode => {
    const id = nextId;
    nextId += 1;
    const row: OrgNode = {
      id,
      parentId,
      name: `${FIRST[id % FIRST.length]} ${LAST[(id * 3 + 1) % LAST.length]}`,
      title,
      office: OFFICES[id % OFFICES.length],
      headcount: 0,
    };
    rows.push(row);
    return row;
  };
  const root = add(null, 'CEO');
  for (let v = 0; v < vps; v++) {
    const vp = add(root.id, 'VP');
    for (let t = 0; t < teamsPerVp; t++) {
      const director = add(vp.id, 'Director');
      for (let m = 0; m < teamSize; m++) add(director.id, 'Engineer');
    }
  }
  for (const row of rows) {
    row.headcount = rows.filter((entry) => entry.parentId === row.id).length;
  }
  return rows;
}

/** Big synthetic tree for the virtualization demo: `roots` roots × `children` children. */
export function makeBigTree(roots: number, children: number): OrgNode[] {
  const rows: OrgNode[] = [];
  let nextId = 1;
  for (let r = 0; r < roots; r++) {
    const rootId = nextId;
    nextId += 1;
    rows.push({
      id: rootId,
      parentId: null,
      name: `Branch ${r + 1}`,
      title: 'Director',
      office: OFFICES[r % OFFICES.length],
      headcount: children,
    });
    for (let c = 0; c < children; c++) {
      rows.push({
        id: nextId,
        parentId: rootId,
        name: `${FIRST[nextId % FIRST.length]} ${LAST[(nextId * 3 + 1) % LAST.length]}`,
        title: 'Engineer',
        office: OFFICES[nextId % OFFICES.length],
        headcount: 0,
      });
      nextId += 1;
    }
  }
  return rows;
}
