/** LLMNode — Built-in LLM configuration node */

import React, { memo, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { Brain, Thermometer } from "lucide-react";
import BaseNode from "./BaseNode";
import type { LLMNodeData } from "@/types/node.types";
import { usePipelineStore } from "@/store/pipelineStore";

const LLM_MODELS = ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet-20241022", "gemini-1.5-flash", "gemini-1.5-pro"];

const LLMNode = memo((props: NodeProps) => {
  const { id, data } = props;
  const updateNode = usePipelineStore((s) => s.updateNode);
  const typedData = data as unknown as LLMNodeData;

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNode(id, { model: e.target.value } as Partial<LLMNodeData>);
    },
    [updateNode, id]
  );

  const handleTempChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNode(id, { temperature: parseFloat(e.target.value) } as Partial<LLMNodeData>);
    },
    [updateNode, id]
  );

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNode(id, { systemPrompt: e.target.value } as Partial<LLMNodeData>);
    },
    [updateNode, id]
  );

  return (
    <BaseNode {...props}>
      <div className="space-y-2 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Brain size={12} className="text-purple-500" />
          <select
            value={typedData.model || "gpt-4o"}
            onChange={handleModelChange}
            className="flex-1 text-xs p-1 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400"
          >
            {LLM_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Thermometer size={12} className="text-orange-500" />
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={typedData.temperature ?? 0.7}
            onChange={handleTempChange}
            className="flex-1 h-1 accent-purple-500"
          />
          <span className="text-[10px] w-8 text-right text-gray-600 dark:text-gray-300">
            {typedData.temperature ?? 0.7}
          </span>
        </div>

        <textarea
          value={typedData.systemPrompt || ""}
          onChange={handlePromptChange}
          placeholder="System prompt..."
          className="w-full flex-1 min-h-[40px] text-[11px] p-1.5 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-purple-400 nowheel nodrag"
        />
      </div>
    </BaseNode>
  );
});

LLMNode.displayName = "LLMNode";

export default LLMNode;
