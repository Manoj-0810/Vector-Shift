/** TextNode — Built-in text template with {{variable}} support */

import React, { memo, useCallback, useEffect, useRef } from "react";
import type { NodeProps } from "@xyflow/react";
import { Type } from "lucide-react";
import BaseNode from "./BaseNode";
import type { TextNodeData } from "@/types/node.types";
import { extractVariables } from "@/utils/variableParser";
import { usePipelineStore } from "@/store/pipelineStore";

const TextNode = memo((props: NodeProps) => {
  const { id, data } = props;
  const updateNode = usePipelineStore((s) => s.updateNode);
  const typedData = data as unknown as TextNodeData;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Extract variables from text with useMemo to keep reference stability
  const variables = React.useMemo(
    () => extractVariables(typedData.text || ""),
    [typedData.text]
  );

  // Update variables in node data
  useEffect(() => {
    updateNode(id, { variables } as Partial<TextNodeData>);
  }, [id, variables, updateNode]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [typedData.text]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNode(id, { text: e.target.value } as Partial<TextNodeData>);
    },
    [updateNode, id]
  );

  // Build variable handles for the base node
  const variableHandles = variables.map((v) => ({ id: v, label: v }));

  // Calculate dynamic width based on the longest line length to adapt size to user input
  const lines = (typedData.text || "").split("\n");
  const longestLine = Math.max(...lines.map((l) => l.length), 0);
  const calculatedWidth = Math.min(Math.max(200, longestLine * 7.5 + 40), 450);

  return (
    <BaseNode {...props} variableHandles={variableHandles} style={{ width: `${calculatedWidth}px` }}>
      <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Type size={12} className="text-orange-500" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Use {"{{variable}}"} syntax</span>
        </div>
        <textarea
          ref={textareaRef}
          value={typedData.text || ""}
          onChange={handleChange}
          placeholder="Enter text with {{variables}}..."
          className="w-full flex-1 text-xs p-2 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-orange-400 transition-all duration-200 nowheel nodrag"
          style={{ minHeight: "40px", overflow: "auto" }}
        />
        {variables.length > 0 && (
          <div className="flex flex-wrap gap-1 flex-shrink-0">
            {variables.map((v) => (
              <span
                key={v}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800"
              >
                {"{{"}{v}{"}}"}
              </span>
            ))}
          </div>
        )}
      </div>
    </BaseNode>
  );
});

TextNode.displayName = "TextNode";

export default TextNode;
