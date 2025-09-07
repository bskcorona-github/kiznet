import React from "react";
import { EdgeProps, getStraightPath, EdgeLabelRenderer } from "reactflow";

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
  // 家系図では配偶者間の線はFamilyEdgeで描画するため、このエッジは非表示
  // （結婚情報などは将来的にはツールチップやサイドパネルで表示）
  return null;
};

export default PartnershipEdge;
