"use client";

import React, { useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  EdgeTypes,
  ConnectionMode,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  addEdge,
  Connection,
  useReactFlow,
  NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import PersonNode from "./PersonNode";
import ParentChildEdge from "./edges/ParentChildEdge";
import PartnershipEdge from "./edges/PartnershipEdge";
import FamilyEdge from "./edges/FamilyEdge";
import { useFamilyTreeStore } from "@/stores/family-tree-store";
import { PersonNode as PersonNodeType, FamilyEdge as FamilyEdgeType } from "@/types";

const nodeTypes: NodeTypes = {
  person: PersonNode,
};

const edgeTypes: EdgeTypes = {
  "parent-child": FamilyEdge, // 家系図専用エッジを使用
  "partnership": PartnershipEdge,
};

const TreeCanvas: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    selectNode,
  } = useFamilyTreeStore();

  // Debug logging disabled to prevent console spam
  // React.useEffect(() => {
  //   console.log("🎨 TreeCanvas - Data counts:", {
  //     nodes: nodes.length,
  //     edges: edges.length
  //   });
  // }, [nodes.length, edges.length]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // ノードの位置変更を許可（手動調整用）
      const positionChanges = changes.filter(change => change.type === 'position');
      
      if (positionChanges.length > 0) {
        setNodes((nds) => {
          // 配列チェックを追加
          if (!Array.isArray(nds)) {
            console.warn("setNodes received non-array:", nds);
            return nds;
          }
          
          return nds.map((node) => {
            const positionChange = positionChanges.find(change => change.id === node.id);
            if (positionChange && positionChange.type === 'position') {
              return {
                ...node,
                position: positionChange.position || node.position,
              };
            }
            return node;
          });
        });
      }
    },
    [setNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      // For now, just log the changes - full edge management will be implemented later
      // console.log("Edge changes:", changes);
    },
    []
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        // Create new relationship edge
        const newEdge: FamilyEdgeType = {
          id: `edge-${connection.source}-${connection.target}`,
          source: connection.source,
          target: connection.target,
          type: "parent-child", // Default relationship type
          animated: false,
          style: { stroke: "#4f46e5", strokeWidth: 2 },
        };
        setEdges((eds) => addEdge(newEdge, eds));

        // TODO: Save relationship to database
      }
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: PersonNodeType) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // 安全な配列チェック
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];

  // Auto-fit view when nodes change (improved)
  const { fitView } = useReactFlow();
  const nodesLengthRef = useRef(0);
  const fitViewTimeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    if (safeNodes.length > 0 && safeNodes.length !== nodesLengthRef.current) {
      nodesLengthRef.current = safeNodes.length;
      
      // Clear previous timeout
      if (fitViewTimeoutRef.current) {
        clearTimeout(fitViewTimeoutRef.current);
      }
      
      // Fit view with appropriate delay and padding
      fitViewTimeoutRef.current = setTimeout(() => {
        try {
          fitView({ 
            padding: 0.15,  // より多くのパディング
            duration: 1000,  // アニメーション時間を延長
            includeHiddenNodes: false,
            minZoom: 0.1,
            maxZoom: 1.2
          });
          console.log("🎯 FitView executed for", safeNodes.length, "nodes");
        } catch (error) {
          console.warn("FitView failed:", error);
        }
      }, 800); // より長い遅延でDOM更新を待機
    }
    
    return () => {
      if (fitViewTimeoutRef.current) {
        clearTimeout(fitViewTimeoutRef.current);
      }
    };
  }, [safeNodes.length, fitView]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={safeNodes}
        edges={safeEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-left"
        className="family-tree-canvas"
        minZoom={0.1}
        maxZoom={2}
      >
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const person = (node as PersonNodeType).data.person;
            return person.sex === "male" ? "#3b82f6" : 
                   person.sex === "female" ? "#ec4899" : "#6b7280";
          }}
          nodeStrokeWidth={3}
          pannable
          zoomable
        />
        <Background variant="dots" gap={20} size={1} />
        
        {/* SVG definitions for edge markers */}
        <svg className="react-flow__edges">
          <defs>
            <marker
              id="parent-child-arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#4f46e5"
              />
            </marker>
          </defs>
        </svg>
      </ReactFlow>
    </div>
  );
};

export default TreeCanvas;