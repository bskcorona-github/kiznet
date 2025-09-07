import React from "react";
import { EdgeProps, getStraightPath, EdgeLabelRenderer } from "reactflow";
import { useFamilyTreeStore } from "@/stores/family-tree-store";

// 家族専用エッジ（配偶者間の横線→中点から縦線→子どもへの分岐）
const FamilyEdge: React.FC<EdgeProps> = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}) => {
  const { nodes, edges } = useFamilyTreeStore();

  // ソースノードとターゲットノードを取得（安全な配列チェック）
  const sourceNode = Array.isArray(nodes) ? nodes.find(n => n.id === source) : null;
  const targetNode = Array.isArray(nodes) ? nodes.find(n => n.id === target) : null;

  // ソースノードの配偶者を探す
  const partnership = React.useMemo(() => {
    if (!sourceNode || !Array.isArray(nodes) || !Array.isArray(edges)) return null;
    
    const partnershipEdge = edges.find(e => 
      e.type === "partnership" && (e.source === source || e.target === source)
    );
    
    if (!partnershipEdge) return null;
    
    const partnerId = partnershipEdge.source === source ? partnershipEdge.target : partnershipEdge.source;
    return nodes.find(n => n.id === partnerId);
  }, [nodes, edges, source, sourceNode]);

  // この子どもを持つ他の親子エッジがないかチェック（重複回避）
  const isMainParent = React.useMemo(() => {
    if (!partnership || !Array.isArray(edges)) return true;
    
    // パートナーからも同じ子どもへのエッジがあるかチェック
    const partnerEdge = edges.find(e => 
      e.type === "parent-child" && 
      e.source === partnership.id && 
      e.target === target
    );
    
    // sourceのIDが小さい方を主要な親として扱う（重複回避）
    return !partnerEdge || parseInt(source) < parseInt(partnership.id);
  }, [partnership, edges, target, source]);

  // 改善された家系図の線描画計算
  const paths = React.useMemo(() => {
    if (!sourceNode || !targetNode || !isMainParent) return null;

    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 120;
    
    let pathElements = [];

    if (partnership) {
      // 配偶者がいる場合：正確な接続点で家系図の線を描画

      // 左右の配偶者を判定（X座標で比較）
      const leftNode = sourceNode.position.x < partnership.position.x ? sourceNode : partnership;
      const rightNode = sourceNode.position.x < partnership.position.x ? partnership : sourceNode;

      // 正確な接続点を計算
      const leftNodeRightEdge = {
        x: leftNode.position.x + NODE_WIDTH,
        y: leftNode.position.y + NODE_HEIGHT / 2
      };
      
      const rightNodeLeftEdge = {
        x: rightNode.position.x,
        y: rightNode.position.y + NODE_HEIGHT / 2
      };

      // 1. 夫婦間の横線（より自然な長さと位置）
      // 夫婦間の距離に応じて線の長さを調整
      const coupleDistance = rightNodeLeftEdge.x - leftNodeRightEdge.x;
      const lineExtension = Math.min(coupleDistance * 0.1, 20); // 最大20pxの延長
      
      const coupleLineStart = {
        x: leftNodeRightEdge.x + lineExtension,
        y: leftNodeRightEdge.y
      };
      
      const coupleLineEnd = {
        x: rightNodeLeftEdge.x - lineExtension,
        y: rightNodeLeftEdge.y
      };

      // 夫婦の中点を計算（調整された線の中点）
      const coupleConnectionCenter = {
        x: (coupleLineStart.x + coupleLineEnd.x) / 2,
        y: (coupleLineStart.y + coupleLineEnd.y) / 2
      };

      // 子どもノードの上端中央（Handleの位置に合わせる）
      const childTopCenter = {
        x: targetNode.position.x + NODE_WIDTH / 2,
        y: targetNode.position.y
      };

      const [coupleLine] = getStraightPath({
        sourceX: coupleLineStart.x,
        sourceY: coupleLineStart.y,
        targetX: coupleLineEnd.x,
        targetY: coupleLineEnd.y,
      });

      // 2. 夫婦の中点から下への縦線（より自然な長さ）
      const familyDropY = Math.max(leftNode.position.y, rightNode.position.y) + NODE_HEIGHT + 50;
      const [verticalLine] = getStraightPath({
        sourceX: coupleConnectionCenter.x,
        sourceY: coupleConnectionCenter.y,
        targetX: coupleConnectionCenter.x,
        targetY: familyDropY,
      });

      // 3. 縦線の底から子どもの上端への線（L字または直線）
      if (Math.abs(coupleConnectionCenter.x - childTopCenter.x) > 10) {
        // L字の線（横→縦）
        const [horizontalToChild] = getStraightPath({
          sourceX: coupleConnectionCenter.x,
          sourceY: familyDropY,
          targetX: childTopCenter.x,
          targetY: familyDropY,
        });

        const [verticalToChild] = getStraightPath({
          sourceX: childTopCenter.x,
          sourceY: familyDropY,
          targetX: childTopCenter.x,
          targetY: childTopCenter.y,
        });

        pathElements = [
          { path: coupleLine, type: 'couple' },
          { path: verticalLine, type: 'family-drop' },
          { path: horizontalToChild, type: 'to-child-horizontal' },
          { path: verticalToChild, type: 'to-child-final' }
        ];
      } else {
        // 直線（夫婦の中点と子どもが垂直）
        const [directToChild] = getStraightPath({
          sourceX: coupleConnectionCenter.x,
          sourceY: familyDropY,
          targetX: childTopCenter.x,
          targetY: childTopCenter.y,
        });

        pathElements = [
          { path: coupleLine, type: 'couple' },
          { path: verticalLine, type: 'family-drop' },
          { path: directToChild, type: 'to-child-direct' }
        ];
      }

    } else {
      // 単身親の場合：ノードの底部中央から子どもの上端中央へ直線
      const parentBottomCenter = {
        x: sourceNode.position.x + NODE_WIDTH / 2,
        y: sourceNode.position.y + NODE_HEIGHT
      };
      
      const childTopCenter = {
        x: targetNode.position.x + NODE_WIDTH / 2,
        y: targetNode.position.y
      };

      const [directLine] = getStraightPath({
        sourceX: parentBottomCenter.x,
        sourceY: parentBottomCenter.y,
        targetX: childTopCenter.x,
        targetY: childTopCenter.y,
      });

      pathElements = [
        { path: directLine, type: 'single-parent-direct' }
      ];
    }

    return pathElements;
  }, [sourceNode, targetNode, partnership, isMainParent]);

  if (!paths) return null;

  return (
    <>
      {paths.map((pathElement, index) => (
        <path
          key={`${id}-${pathElement.type}-${index}`}
          d={pathElement.path}
          style={{
            stroke: pathElement.type === 'couple' ? "#e11d48" : "#4f46e5", // 夫婦線は赤、親子線は青
            strokeWidth: pathElement.type === 'couple' ? 3 : 2, // 夫婦線を少し太く
            fill: "none",
            strokeLinecap: "round",
            strokeLinejoin: "round",
          }}
          className="react-flow__edge-path"
          markerEnd={pathElement.type === 'final' || pathElement.type === 'direct' ? 
            "url(#parent-child-arrowhead)" : undefined}
        />
      ))}

      {/* ラベルは表示しない（シンプルに） */}
    </>
  );
};

export default FamilyEdge;
