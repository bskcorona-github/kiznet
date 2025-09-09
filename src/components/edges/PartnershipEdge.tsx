import React from "react";
import { LAYOUT } from "@/shared/config/layout";
import { EdgeProps, EdgeLabelRenderer, Position } from "reactflow";

const PartnershipEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}) => {

  // 配偶者線をピンクハンドルの外側から描画し、カードに隠れないようにする
  const STUB = LAYOUT.spouse.stub;
  const EXTRA = LAYOUT.spouse.extra;
  const CARD_HEIGHT = LAYOUT.card.height;
  const LINE_OFFSET = LAYOUT.spouse.lineOffset;

  const flipped = !!data?.partnership?.isFlipped;
  // ハンドルの向きはReactFlowから渡されるsourcePosition/targetPositionに依存する。
  // isFlipped=trueのとき、左右の処理を逆にする。
  const sxOut = sourceX + (
    ((!flipped && sourcePosition === Position.Right) || (flipped && sourcePosition === Position.Left))
      ? STUB + EXTRA/2
      : -(STUB + EXTRA/2)
  );
  const txOut = targetX + (
    ((!flipped && targetPosition === Position.Left) || (flipped && targetPosition === Position.Right))
      ? -(STUB + EXTRA/2)
      : STUB + EXTRA/2
  );

  // 夫婦線をカードの下側に配置（カードと重ならないようにする）
  const yMid = Math.min(sourceY, targetY) + CARD_HEIGHT/2 + LINE_OFFSET;
  const pathSegments = [
    `M ${sourceX},${sourceY}`,
    `L ${sxOut},${sourceY}`,
    `L ${sxOut},${yMid}`,
    `L ${txOut},${yMid}`,
    `L ${txOut},${targetY}`,
    `L ${targetX},${targetY}`,
  ];
  const edgePath = pathSegments.join(" ");


  return (
    <path
      id={id}
      style={{
        stroke: "#dc2626", // より深い赤色（配偶者関係）
        strokeWidth: 2.5,
        fill: "none",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))", // 軽いシャドウ
        ...style,
      }}
      className="react-flow__edge-path"
      d={edgePath}
    />
  );
};

export default PartnershipEdge;
