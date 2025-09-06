"use client";
import React from 'react';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

export interface GraphPersonNodeData {
  id: string;
  label: string;
  birthDeath?: string;
}

export function FamilyGraph({ nodes, edges, onNodeSelect }: {
  nodes: Node<GraphPersonNodeData>[];
  edges: Edge[];
  onNodeSelect: (id: string | null) => void;
}) {
  return (
    <div className="h-full print-strong">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={(_, node) => onNodeSelect(node.id)}
        onPaneClick={() => onNodeSelect(null)}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}


