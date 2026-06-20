/** TransformNode — CUSTOM: Apply a function to input data */

import React, { memo, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { Shuffle } from "lucide-react";
import BaseNode from "./BaseNode";
import type { TransformNodeData, TransformType } from "@/types/node.types";
import { usePipelineStore } from "@/store/pipelineStore";

const TRANSFORM_OPTIONS: { value: TransformType; label: string }[] = [
  { value: "uppercase", label: "UPPERCASE" },
  { value: "lowercase", label: "lowercase" },
  { value: "trim", label: "Trim" },
  { value: "json_parse", label: "JSON Parse" },
  { value: "json_stringify", label: "JSON Stringify" },
  { value: "reverse", label: "Reverse" },
  { value: "slugify", label: "Slugify" },
];

const TransformNode = memo((props: NodeProps) => {
  const { id, data } = props;
  const updateNode = usePipelineStore((s) => s.updateNode);
  const typedData = data as unknown as TransformNodeData;

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNode(id, { transformType: e.target.value as TransformType } as Partial<TransformNodeData>);
    },
    [updateNode, id]
  );

  return (
    <BaseNode {...props}>
      <div className="flex items-center gap-1.5">
        <Shuffle size={12} className="text-indigo-500" />
        <select
          value={typedData.transformType || "uppercase"}
          onChange={handleTypeChange}
          className="flex-1 text-xs p-1 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          {TRANSFORM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </BaseNode>
  );
});

TransformNode.displayName = "TransformNode";

export default TransformNode;
