import dagre from 'dagre';

export type LayoutNode = { id: string; width: number; height: number };
export type LayoutEdge = { id: string; source: string; target: string };

export function applyDagreLayout(nodes: LayoutNode[], edges: LayoutEdge[]) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 100 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    g.setNode(n.id, { width: n.width, height: n.height });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const { x, y } = g.node(n.id);
    positions.set(n.id, { x, y });
  }
  return positions;
}


