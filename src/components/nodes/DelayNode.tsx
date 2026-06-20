/** DelayNode — CUSTOM: Delay/wait node with configurable duration */

import React, { memo, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";
import BaseNode from "./BaseNode";
import type { DelayNodeData } from "@/types/node.types";
import { usePipelineStore } from "@/store/pipelineStore";

const TIME_UNITS: Array<{ value: DelayNodeData["unit"]; label: string }> = [
  { value: "ms", label: "ms" },
  { value: "seconds", label: "sec" },
  { value: "minutes", label: "min" },
];

const DelayNode = memo((props: NodeProps) => {
  const { id, data } = props;
  const updateNode = usePipelineStore((s) => s.updateNode);
  const typedData = data as unknown as DelayNodeData;

  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      updateNode(id, { duration: isNaN(value) ? 0 : value } as Partial<DelayNodeData>);
    },
    [updateNode, id]
  );

  const handleUnitChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNode(id, { unit: e.target.value as DelayNodeData["unit"] } as Partial<DelayNodeData>);
    },
    [updateNode, id]
  );

  return (
    <BaseNode {...props}>
      <div className="flex items-center gap-1.5">
        <Clock size={12} className="text-yellow-500" />
        <input
          type="number"
          min="0"
          step={typedData.unit === "ms" ? 100 : typedData.unit === "seconds" ? 1 : 0.5}
          value={typedData.duration ?? 1}
          onChange={handleDurationChange}
          className="w-16 text-xs p-1 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-yellow-400"
        />
        <select
          value={typedData.unit || "seconds"}
          onChange={handleUnitChange}
          className="text-xs p-1 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none"
        >
          {TIME_UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
    </BaseNode>
  );
});

DelayNode.displayName = "DelayNode";

export default DelayNode;
