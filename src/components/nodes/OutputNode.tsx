import { memo, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { Monitor } from "lucide-react";
import BaseNode from "./BaseNode";
import type { OutputNodeData } from "@/types/node.types";
import { usePipelineStore } from "@/store/pipelineStore";

const OutputNode = memo((props: NodeProps) => {
  const { id, data } = props;
  const updateNode = usePipelineStore((s) => s.updateNode);
  const typedData = data as unknown as OutputNodeData;

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNode(id, { outputName: e.target.value } as Partial<OutputNodeData>);
    },
    [updateNode, id]
  );

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNode(id, { outputType: e.target.value as "Text" | "Image" } as Partial<OutputNodeData>);
    },
    [updateNode, id]
  );

  return (
    <BaseNode {...props}>
      <div className="space-y-2 w-full flex-1 flex flex-col min-h-0">
        {/* Name Config */}
        <div className="flex flex-col gap-0.5 w-full">
          <label htmlFor={`output-name-${id}`} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Name
          </label>
          <input
            id={`output-name-${id}`}
            type="text"
            value={typedData.outputName || ""}
            onChange={handleNameChange}
            placeholder="output_name"
            className="w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-green-400 nowheel nodrag"
          />
        </div>

        {/* Type Config */}
        <div className="flex flex-col gap-0.5 w-full">
          <label htmlFor={`output-type-${id}`} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Type
          </label>
          <select
            id={`output-type-${id}`}
            value={typedData.outputType || "Text"}
            onChange={handleTypeChange}
            className="w-full text-xs p-1.5 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-green-400 nowheel nodrag"
          >
            <option value="Text">Text</option>
            <option value="Image">Image</option>
          </select>
        </div>

        {/* Output Value Display */}
        <div className="flex flex-col gap-0.5 flex-1 min-h-0 w-full">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase font-semibold flex-shrink-0 tracking-wide">
            <Monitor size={10} className="text-green-500" />
            <span>Value</span>
          </div>
          {typedData.outputValue ? (
            <textarea
              readOnly
              value={typedData.outputValue}
              className="w-full flex-1 text-[11px] p-2 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 resize-none focus:outline-none font-mono nowheel nodrag"
              style={{ minHeight: "50px" }}
            />
          ) : (
            <div className="text-[11px] italic text-gray-400 dark:text-gray-500 py-2 flex-1 flex items-center justify-center border border-dashed border-gray-200 dark:border-slate-700 rounded bg-gray-50/50 dark:bg-slate-900/30">
              Waiting for input...
            </div>
          )}
        </div>
      </div>
    </BaseNode>
  );
});

OutputNode.displayName = "OutputNode";

export default OutputNode;
