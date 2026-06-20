/** FilterNode — CUSTOM: Conditional pass-through */

import React, { memo, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { Filter } from "lucide-react";
import BaseNode from "./BaseNode";
import type { FilterNodeData, FilterCondition } from "@/types/node.types";
import { usePipelineStore } from "@/store/pipelineStore";

const FILTER_OPTIONS: { value: FilterCondition; label: string }[] = [
  { value: "contains", label: "Contains" },
  { value: "equals", label: "Equals" },
  { value: "greater_than", label: "> Greater Than" },
  { value: "less_than", label: "< Less Than" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "regex", label: "Regex Match" },
];

const FilterNode = memo((props: NodeProps) => {
  const { id, data } = props;
  const updateNode = usePipelineStore((s) => s.updateNode);
  const typedData = data as unknown as FilterNodeData;

  const handleConditionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNode(id, { condition: e.target.value as FilterCondition } as Partial<FilterNodeData>);
    },
    [updateNode, id]
  );

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNode(id, { value: e.target.value } as Partial<FilterNodeData>);
    },
    [updateNode, id]
  );

  return (
    <BaseNode {...props}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-red-500" />
          <select
            value={typedData.condition || "contains"}
            onChange={handleConditionChange}
            className="flex-1 text-xs p-1 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-400"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          value={typedData.value || ""}
          onChange={handleValueChange}
          placeholder="Filter value..."
          className="w-full text-xs p-1.5 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-400"
        />
      </div>
    </BaseNode>
  );
});

FilterNode.displayName = "FilterNode";

export default FilterNode;
