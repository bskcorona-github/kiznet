import React from "react";
import { EdgeProps, getStraightPath, EdgeLabelRenderer } from "reactflow";
import { useFamilyTreeStore } from "@/stores/family-tree-store";
import { LAYOUT } from "@/shared/config/layout";

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

  // この親子エッジに対応する「配偶者ノード」と「配偶者エッジ（isFlipped取得用）」を特定
  const { partnerNode, coupleEdge } = React.useMemo(() => {
    if (!sourceNode || !Array.isArray(nodes) || !Array.isArray(edges)) return null;

    // 1) この子の親たちを取得
    const parentsOfChild = edges
      .filter(e => e.type === "parent-child" && e.target === target)
      .map(e => e.source);

    // 2) もう一方の親（自分以外）
    const otherParentId = parentsOfChild.find(pid => pid !== source);

    if (otherParentId) {
      // 3) 2人の間に partnership があるか
      const couple = edges.find(e => 
        e.type === "partnership" && (
          (e.source === source && e.target === otherParentId) ||
          (e.source === otherParentId && e.target === source)
        )
      );
      if (couple) {
        return {
          partnerNode: nodes.find(n => n.id === otherParentId) || null,
          coupleEdge: couple,
        };
      }
    }

    // フォールバック: source に紐づく最初の partnership（従来挙動）
    const fallback = edges.find(e => e.type === "partnership" && (e.source === source || e.target === source));
    if (!fallback) return { partnerNode: null, coupleEdge: null } as any;
    const partnerId = fallback.source === source ? fallback.target : fallback.source;
    return {
      partnerNode: nodes.find(n => n.id === partnerId) || null,
      coupleEdge: fallback,
    };
  }, [nodes, edges, source, target, sourceNode]) as any;

  // この子どもを持つ他の親子エッジがないかチェック（重複回避）
  const isMainParent = React.useMemo(() => {
    if (!partnerNode || !Array.isArray(edges)) {
      return true;
    }

    // パートナーからも同じ子どもへのエッジがあるか
    const partnerEdge = edges.find(e =>
      e.type === "parent-child" && e.source === partnerNode.id && e.target === target
    );
    
    // sourceのIDが小さい方をメインに（1本だけ描画）
    return !partnerEdge || parseInt(source) < parseInt(partnerNode.id);
  }, [partnerNode, edges, target, source]);

  // 改善された家系図の線描画計算（ノードのハンドル座標に厳密に合わせる）
  const paths = React.useMemo(() => {
    if (!sourceNode || !targetNode || !isMainParent) {
      return null;
    }
    

    // PersonNode.tsx の描画に依存するデフォルト値（実測が無い場合のフォールバック）
    const DEFAULT_WIDTH = LAYOUT.card.width;
    const DEFAULT_HEIGHT = LAYOUT.card.height;
    
    let pathElements = [];

    if (partnerNode) {
      // 配偶者がいる場合：正確な接続点で家系図の線を描画

      // 左右の配偶者を判定（X座標で比較）
      const leftNode = sourceNode.position.x < partnerNode.position.x ? sourceNode : partnerNode;
      const rightNode = sourceNode.position.x < partnerNode.position.x ? partnerNode : sourceNode;

      // 正確な接続点を計算（spouse-right / spouse-left の中心）
      const lWidth = (leftNode as any).width ?? DEFAULT_WIDTH;
      const lHeight = (leftNode as any).height ?? DEFAULT_HEIGHT;
      const rWidth = (rightNode as any).width ?? DEFAULT_WIDTH;
      const rHeight = (rightNode as any).height ?? DEFAULT_HEIGHT;

      // 夫婦エッジのsource/targetの向きに応じた接続点（isFlippedを考慮）
      const flipped = coupleEdge?.data?.partnership?.isFlipped;
      const leftNodeRightEdge = {
        x: leftNode.position.x + (flipped ? 0 : lWidth),
        y: leftNode.position.y + lHeight / 2,
      };
      const rightNodeLeftEdge = {
        x: rightNode.position.x + (flipped ? rWidth : 0),
        y: rightNode.position.y + rHeight / 2,
      };

      // 夫婦線の実際のY座標（PartnershipEdgeに合わせて、ハンドルtop%を使う）
      const CARD_HEIGHT = LAYOUT.card.height;
      const LINE_OFFSET = LAYOUT.spouse.lineOffset;
      const percentForHandle = (h?: string) => (h === 'spouse-left-source' || h === 'spouse-right-target') ? 0.6 : 0.4;
      const srcCoupleNode = Array.isArray(nodes) ? nodes.find(n => n.id === coupleEdge?.source) : null;
      const tgtCoupleNode = Array.isArray(nodes) ? nodes.find(n => n.id === coupleEdge?.target) : null;
      const srcH = percentForHandle((coupleEdge as any)?.sourceHandle);
      const tgtH = percentForHandle((coupleEdge as any)?.targetHandle);
      const sY = (srcCoupleNode?.position.y ?? leftNode.position.y) + ((srcCoupleNode as any)?.height ?? lHeight) * srcH;
      const tY = (tgtCoupleNode?.position.y ?? rightNode.position.y) + ((tgtCoupleNode as any)?.height ?? rHeight) * tgtH;
      const coupleLineY = Math.min(sY, tY) + CARD_HEIGHT/2 + LINE_OFFSET;

      // 左右反転に対応（パートナーシップの isFlipped で左右入れ替え）
      let leftX = leftNodeRightEdge.x;
      let rightX = rightNodeLeftEdge.x;
      if (flipped) {
        leftX = rightNodeLeftEdge.x;
        rightX = leftNodeRightEdge.x;
      }

      const coupleConnectionCenter = {
        x: (leftX + rightX) / 2,
        y: coupleLineY,
      };

      // 子どもノードの上端中央（parent-connectionの中心）
      const cWidth = (targetNode as any).width ?? DEFAULT_WIDTH;
      const childTopCenter = {
        x: targetNode.position.x + cWidth / 2,
        y: targetNode.position.y, // 上端（Position.Top）
      };

      // coupleLine は上で生成済み

      // 2. 夫婦の中点から下への縦線（夫婦線のすぐ下から水平に広げる）
      //    夫婦のピンク線（coupleLineY）に視覚的に接続するため、わずかに下げる
      const familyDropY = coupleConnectionCenter.y + 12;
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
          { path: verticalLine, type: 'family-drop' },
          { path: directToChild, type: 'to-child-direct' }
        ];
      }

    } else {
      // 単身親の場合：階層的な線を描画（2枚目の画像のスタイル）
      const sWidth = (sourceNode as any).width ?? DEFAULT_WIDTH;
      const sHeight = (sourceNode as any).height ?? DEFAULT_HEIGHT;
      const cWidth = (targetNode as any).width ?? DEFAULT_WIDTH;

      const parentBottomCenter = {
        x: sourceNode.position.x + sWidth / 2,
        y: sourceNode.position.y + sHeight, // 下端（Position.Bottom）
      };
      
      const childTopCenter = {
        x: targetNode.position.x + cWidth / 2,
        y: targetNode.position.y,
      };

      // 階層的な線の描画：親の下 → 中間点 → 子の上
      const intermediateY = parentBottomCenter.y + LAYOUT.parent.intermediateDrop;

      // 1. 親の下端から中間点への縦線
      const [verticalFromParent] = getStraightPath({
        sourceX: parentBottomCenter.x,
        sourceY: parentBottomCenter.y,
        targetX: parentBottomCenter.x,
        targetY: intermediateY,
      });

      if (Math.abs(parentBottomCenter.x - childTopCenter.x) > 10) {
        // 2. 中間点から子のX座標への横線
        const [horizontalToChild] = getStraightPath({
          sourceX: parentBottomCenter.x,
          sourceY: intermediateY,
          targetX: childTopCenter.x,
          targetY: intermediateY,
        });

        // 3. 子のX座標から子の上端への縦線
        const [verticalToChild] = getStraightPath({
          sourceX: childTopCenter.x,
          sourceY: intermediateY,
          targetX: childTopCenter.x,
          targetY: childTopCenter.y,
        });

        pathElements = [
          { path: verticalFromParent, type: 'single-parent-drop' },
          { path: horizontalToChild, type: 'single-parent-horizontal' },
          { path: verticalToChild, type: 'single-parent-final' }
        ];
      } else {
        // 親と子が垂直に並んでいる場合：直線
        const [directToChild] = getStraightPath({
          sourceX: parentBottomCenter.x,
          sourceY: intermediateY,
          targetX: childTopCenter.x,
          targetY: childTopCenter.y,
        });

        pathElements = [
          { path: verticalFromParent, type: 'single-parent-drop' },
          { path: directToChild, type: 'single-parent-final' }
        ];
      }
    }

    return pathElements;
  }, [sourceNode, targetNode, partnerNode, coupleEdge, isMainParent]);

  if (!paths) return null;

  return (
    <>
      {paths.map((pathElement, index) => (
        <path
          key={`${id}-${pathElement.type}-${index}`}
          d={pathElement.path}
          style={{
            stroke: (pathElement.type === 'couple' || pathElement.type === 'couple-stub') ? "#dc2626" : "#3b82f6", // 夫婦線は深い赤、親子線は青
            strokeWidth: pathElement.type === 'couple' ? 2.5 : 2, // 夫婦線を少し太く
            fill: "none",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            filter: "drop-shadow(0 1px 1px rgba(0, 0, 0, 0.05))", // 軽いシャドウ
          }}
          className="react-flow__edge-path"
          markerEnd={(
            pathElement.type === 'to-child-final' ||
            pathElement.type === 'to-child-direct' ||
            pathElement.type === 'single-parent-final'
          ) ? "url(#parent-child-arrowhead)" : undefined}
        />
      ))}

      {/* ラベルは表示しない（シンプルに） */}
    </>
  );
};

export default FamilyEdge;
