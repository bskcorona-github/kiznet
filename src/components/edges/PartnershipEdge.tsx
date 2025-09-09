import React from "react";
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
  const STUB = 12; // ハンドル外へ出す長さを短縮
  const EXTRA = 20; // 夫婦間の水平線の追加延長を短縮（左右に+10pxずつ）
  const CARD_HEIGHT = 80; // PersonNodeの高さ（h-[80px]）
  const LINE_OFFSET = 35; // カードの下端からの線の位置オフセットを短縮

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
