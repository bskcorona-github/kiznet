import React from "react";
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from "reactflow";

const ParentChildEdge: React.FC<EdgeProps> = ({
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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        id={`parent-child-edge-${id}`}
        style={{
          ...style,
          stroke: "#4f46e5", // 親子関係は紫色
          strokeWidth: 2,
          fill: "none",
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd="url(#parent-child-arrowhead)"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 10,
            color: "#4f46e5",
            background: "white",
            padding: "2px 4px",
            borderRadius: "2px",
            border: "1px solid #e5e7eb",
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          親子
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default ParentChildEdge;
