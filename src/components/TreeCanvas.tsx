"use client";

import React, { useCallback, useRef, useEffect, useMemo } from "react";
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
  NodeMouseHandler,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import PersonNode from "./PersonNode";
import ParentChildEdge from "./edges/ParentChildEdge";
import PartnershipEdge from "./edges/PartnershipEdge";
import FamilyEdge from "./edges/FamilyEdge";
import { useFamilyTreeStore } from "@/stores/family-tree-store";
import { PersonNode as PersonNodeType, FamilyEdge as FamilyEdgeType } from "@/types";

// React Flow の型定義はレンダリング間で安定参照させるため、コンポーネント外で定義
const NODE_TYPES: NodeTypes = {
  person: PersonNode,
};

const EDGE_TYPES: EdgeTypes = {
  "parent-child": FamilyEdge,
  partnership: PartnershipEdge,
};

const TreeCanvas: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    selectNode,
    currentTree,
    loadTreeData,
    applyAutoLayout,
    updateNodePosition,
    nodesLocked,
  } = useFamilyTreeStore();

  // 型テーブルは外側の定数を使用（警告回避）
  const nodeTypes = useMemo(() => NODE_TYPES, []);
  const edgeTypes = useMemo(() => EDGE_TYPES, []);

  // Debug logging disabled to prevent console spam
  // React.useEffect(() => {
  //   console.log("🎨 TreeCanvas - Data counts:", {
  //     nodes: nodes.length,
  //     edges: edges.length
  //   });
  // }, [nodes.length, edges.length]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (nodesLocked) return; // ロック中はドラッグを無効化
      // ノードの位置変更を許可（手動調整用）
      const positionChanges = changes.filter(change => change.type === 'position');
      
      if (positionChanges.length > 0) {
        // 現在のノードを取得
        const currentNodes = nodes;
        
        // 配列チェックを追加
        if (!Array.isArray(currentNodes)) {
          console.warn("⚠️ Current nodes is not an array:", currentNodes);
          return;
        }
        
        // ノードの位置を更新
        const updatedNodes = currentNodes.map((node) => {
          const positionChange = positionChanges.find(change => change.id === node.id);
          if (positionChange && positionChange.type === 'position') {
            return {
              ...node,
              position: positionChange.position || node.position,
            };
          }
          return node;
        });
        
        // ZustandのsetNodesアクションに直接的な値を渡す
        setNodes(updatedNodes);
        
        // ドラッグ終了時（dragging: falseの変更）に位置を保存
        positionChanges.forEach(change => {
          if (change.type === 'position' && change.dragging === false && change.position) {
            updateNodePosition(change.id, change.position);
          }
        });
      }
    },
    [setNodes, nodes, updateNodePosition, nodesLocked]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      // For now, just log the changes - full edge management will be implemented later
      // console.log("Edge changes:", changes);
    },
    []
  );

  const onConnect: OnConnect = useCallback(
    async (connection: Connection) => {
      console.log('🔗 onConnect triggered:', {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        currentTreeId: currentTree?.id
      });

      if (!connection.source || !connection.target || !currentTree?.id) {
        console.warn('❌ Connection aborted: missing source/target/tree');
        return;
      }

      // ハンドルIDから関係種別を判定
      const sourceHandle = connection.sourceHandle;
      const targetHandle = connection.targetHandle;

      // 配偶者: spouse-right / spouse-left / spouse-left-source / spouse-right-target
      const isPartnership = (
        (sourceHandle === 'spouse-right' && targetHandle === 'spouse-left') ||
        (sourceHandle === 'spouse-left-source' && targetHandle === 'spouse-right-target') ||
        (sourceHandle === 'spouse-right' && targetHandle === 'spouse-right-target') ||
        (sourceHandle === 'spouse-left-source' && targetHandle === 'spouse-left')
      );

      console.log('🔍 Connection analysis:', {
        sourceHandle,
        targetHandle,
        isPartnership,
        edgesCount: Array.isArray(edges) ? edges.length : 'not-array'
      });

      // 全エッジの詳細を表示
      if (Array.isArray(edges)) {
        const partnershipEdges = edges.filter(e => e.type === 'partnership');
        const parentChildEdges = edges.filter(e => e.type === 'parent-child');
        console.log('📊 Current edges breakdown:', {
          total: edges.length,
          partnerships: partnershipEdges.length,
          parentChild: parentChildEdges.length,
          partnershipDetails: partnershipEdges.map(e => ({ id: e.id, source: e.source, target: e.target, type: e.type }))
        });
      }

      if (isPartnership) {
        try {
          const a = parseInt(connection.source);
          const b = parseInt(connection.target);
          
          console.log('💕 Processing partnership:', { personA: a, personB: b });
          
          const partnershipEdges = Array.isArray(edges) ? edges.filter(e => e.type === 'partnership') : [];
          console.log('📋 Current partnership edges:', partnershipEdges);
          
          const exists = partnershipEdges.some(e => 
            (e.source === connection.source && e.target === connection.target) || 
            (e.source === connection.target && e.target === connection.source)
          );
          
          if (exists) {
            console.log('⚠️ Partnership already exists, skipping');
            console.log('🔍 Existing partnership edge found:', partnershipEdges.find(e => 
              (e.source === connection.source && e.target === connection.target) || 
              (e.source === connection.target && e.target === connection.source)
            ));
            return;
          }

          console.log('📤 Sending partnership to API...');
          const isFlipped = sourceHandle === 'spouse-left-source' || targetHandle === 'spouse-right-target';
          const res = await fetch('/api/partnerships', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ treeId: String(currentTree.id), partnerAId: a, partnerBId: b, type: 'marriage', isFlipped }),
          });
          
          console.log('📥 API response:', { status: res.status, ok: res.ok });
          
          if (res.ok) {
            console.log('✅ Partnership saved, reloading data...');
            await loadTreeData(currentTree.id);
            console.log('✅ Data reloaded successfully');
            // 接続成功時は自動レイアウトを適用（夫婦を横並びに）
            try {
              await applyAutoLayout();
              console.log('✅ Auto layout applied');
            } catch (e) {
              console.warn('⚠️ Auto layout failed after partnership save', e);
            }
          } else {
            const errorText = await res.text();
            console.warn('❌ Failed to persist partnership:', { status: res.status, error: errorText });
          }
        } catch (e) {
          console.error('💥 Persist partnership failed', e);
        }
        return;
      }

      // それ以外は親子関係
      try {
        let parentId = connection.source;
        let childId = connection.target;
        if (sourceHandle === 'parent-connection' || targetHandle === 'child-connection') {
          parentId = connection.target!;
          childId = connection.source!;
        }
        const exists = Array.isArray(edges) && edges.some(e => e.type === 'parent-child' && e.source === parentId && e.target === childId);
        if (exists) return;
        const res = await fetch('/api/relationships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ treeId: String(currentTree.id), parentId: parseInt(parentId), childId: parseInt(childId) }),
        });
        if (res.ok) {
          await loadTreeData(currentTree.id);
        } else {
          console.warn('Failed to persist relationship');
        }
      } catch (e) {
        console.error('Persist relationship failed', e);
      }
    },
    [setEdges, currentTree?.id, loadTreeData, applyAutoLayout]
  );

  // 許可する接続のみ
  const isValidConnection = useCallback((c: Connection) => {
    const sh = c.sourceHandle || '';
    const th = c.targetHandle || '';
    
    // 配偶者: 右出し→左受け、または左出し→右受け
    const isSpouse = 
      (sh === 'spouse-right' && (th === 'spouse-left' || th === 'spouse-right-target')) ||
      (sh === 'spouse-left-source' && (th === 'spouse-right-target' || th === 'spouse-left'));
    
    // 親子: child-connection ↔ parent-connection
    const isParentChild = 
      (sh === 'child-connection' && th === 'parent-connection') || 
      (sh === 'parent-connection' && th === 'child-connection');
    
    return isSpouse || isParentChild;
  }, []);

  const onNodeClick = useCallback<NodeMouseHandler>((event, node) => {
    selectNode(node.id);
  }, [selectNode]);

  // 安全な配列チェック
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];

  // エッジの詳細をログ出力（デバッグ用）
  React.useEffect(() => {
    if (safeEdges.length > 0) {
      const partnershipEdges = safeEdges.filter(e => e.type === 'partnership');
      console.log('🎨 React Flow will render edges:', {
        totalEdges: safeEdges.length,
        partnerships: partnershipEdges.length,
         partnershipEdges: partnershipEdges.map(e => ({
           id: e.id,
           source: e.source,
           target: e.target,
           type: e.type,
           sourceHandle: e.sourceHandle,
           targetHandle: e.targetHandle,
           data: e.data
         }))
      });
    }
  }, [safeEdges]);

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
        } catch (error) {
          console.warn("❌ FitView failed:", error);
        }
      }, 300); // 過度な画面ジャンプを防ぐため短縮
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
        isValidConnection={isValidConnection}
        connectionMode={ConnectionMode.Strict}
        fitView
        attributionPosition="bottom-left"
        className="family-tree-canvas"
        minZoom={0.1}
        maxZoom={2}
      >
        <Controls 
          position="bottom-left"
          className="react-flow__controls"
        />
        <MiniMap 
          nodeColor={(node) => {
            const person = (node as PersonNodeType).data.person;
            return person.sex === "male" ? "#3b82f6" : 
                   person.sex === "female" ? "#ec4899" : "#6b7280";
          }}
          nodeStrokeWidth={3}
          pannable
          zoomable
          position="bottom-right"
          className="react-flow__minimap"
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        
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
                fill="#3b82f6"
                filter="drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1))"
              />
            </marker>
          </defs>
        </svg>
      </ReactFlow>
    </div>
  );
};

export default TreeCanvas;