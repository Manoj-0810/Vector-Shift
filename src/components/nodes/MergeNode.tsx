import React, { memo, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { Merge } from "lucide-react";
import BaseNode from "./BaseNode";
import type { MergeNodeData, MergeStrategy } from "@/types/node.types";
import { NODE_CONFIGS, NodeType } from "@/types/node.types";
import { usePipelineStore } from "@/store/pipelineStore";

const MERGE_OPTIONS: { value: MergeStrategy; label: string }[] = [
  { value: "concat", label: "Concatenate" },
  { value: "object_merge", label: "Object Merge" },
  { value: "array_merge", label: "Array Merge" },
  { value: "join_comma", label: "Join (Comma)" },
  { value: "join_newline", label: "Join (Newline)" },
];

const MergeNode = memo((props: NodeProps) => {
  const { id, data } = props;
  const updateNode = usePipelineStore((s) => s.updateNode);
  const typedData = data as unknown as MergeNodeData;
  const config = NODE_CONFIGS[NodeType.MERGE];

  const handleStrategyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNode(id, { strategy: e.target.value as MergeStrategy } as Partial<MergeNodeData>);
    },
    [updateNode, id]
  );

  return (
    <BaseNode {...props}>
      <div className="flex items-center gap-1.5">
        <Merge size={12} className="text-pink-500" />
        <select
          value={typedData.strategy || "concat"}
          onChange={handleStrategyChange}
          className="flex-1 text-xs p-1 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-pink-400"
        >
          {MERGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
        <Merge size={10} />
        <span>{config.inputs} inputs supported</span>
      </div>
    </BaseNode>
  );
});

MergeNode.displayName = "MergeNode";

export default MergeNode;
