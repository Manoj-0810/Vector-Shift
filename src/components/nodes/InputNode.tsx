/** InputNode — Built-in text or file input node */

import React, { memo, useCallback, useRef } from "react";
import type { NodeProps } from "@xyflow/react";
import { UploadCloud, FileText, X } from "lucide-react";
import BaseNode from "./BaseNode";
import type { InputNodeData } from "@/types/node.types";
import { usePipelineStore } from "@/store/pipelineStore";

const InputNode = memo((props: NodeProps) => {
  const { id, data } = props;
  const updateNode = usePipelineStore((s) => s.updateNode);
  const typedData = data as unknown as InputNodeData;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNode(id, { inputValue: e.target.value } as Partial<InputNodeData>);
    },
    [updateNode, id]
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNode(id, { inputName: e.target.value } as Partial<InputNodeData>);
    },
    [updateNode, id]
  );

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNode(id, { inputType: e.target.value as "Text" | "File" } as Partial<InputNodeData>);
    },
    [updateNode, id]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        updateNode(id, { inputValue: file.name } as Partial<InputNodeData>);
      }
    },
    [updateNode, id]
  );

  const handleClearFile = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      updateNode(id, { inputValue: "" } as Partial<InputNodeData>);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [updateNode, id]
  );

  const handleInstructionsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNode(id, { instructions: e.target.value } as Partial<InputNodeData>);
    },
    [updateNode, id]
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <BaseNode {...props}>
      <div className="space-y-2 flex-1 flex flex-col min-h-0 w-full">
        {/* Name Config */}
        <div className="flex flex-col gap-0.5">
          <label htmlFor={`input-name-${id}`} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Name
          </label>
          <input
            id={`input-name-${id}`}
            type="text"
            value={typedData.inputName || ""}
            onChange={handleNameChange}
            placeholder="input_name"
            className="w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 nowheel nodrag"
          />
        </div>

        {/* Type Config */}
        <div className="flex flex-col gap-0.5">
          <label htmlFor={`input-type-${id}`} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Type
          </label>
          <select
            id={`input-type-${id}`}
            value={typedData.inputType || "Text"}
            onChange={handleTypeChange}
            className="w-full text-xs p-1.5 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 nowheel nodrag"
          >
            <option value="Text">Text</option>
            <option value="File">File</option>
          </select>
        </div>

        {/* Conditional Value or Upload + Instructions */}
        {typedData.inputType === "File" ? (
          <div className="space-y-2 flex-1 flex flex-col min-h-0">
            {/* File upload zone */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                File Upload
              </label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              {typedData.inputValue ? (
                <div className="flex items-center gap-2 p-2 rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/20 text-green-800 dark:text-green-200 text-xs relative overflow-hidden">
                  <FileText size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate leading-tight">
                      {typedData.inputValue}
                    </p>
                    <p className="text-[9px] text-green-600 dark:text-green-400">Ready for execution</p>
                  </div>
                  <button
                    onClick={handleClearFile}
                    className="p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 text-green-600 hover:text-green-800 dark:text-green-400 transition-colors flex-shrink-0"
                    title="Remove file"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={handleUploadClick}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 bg-gray-50/40 dark:bg-slate-800/20 hover:bg-gray-50 dark:hover:bg-slate-800/40 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all text-center group"
                >
                  <UploadCloud size={20} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" />
                  <div>
                    <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                      Click to upload file
                    </p>
                    <p className="text-[8px] text-gray-400 dark:text-gray-500">
                      PDF, TXT, CSV up to 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions box */}
            <div className="flex flex-col gap-0.5 flex-1 min-h-0">
              <label htmlFor={`input-inst-${id}`} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Instructions to follow on file
              </label>
              <textarea
                id={`input-inst-${id}`}
                value={typedData.instructions || ""}
                onChange={handleInstructionsChange}
                placeholder="e.g. Summarize findings..."
                className="w-full flex-1 text-xs p-2 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 nowheel nodrag"
                style={{ minHeight: "40px" }}
              />
            </div>
          </div>
        ) : (
          /* Text Value Config */
          <div className="flex flex-col gap-0.5 flex-1 min-h-0">
            <label htmlFor={`input-val-${id}`} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Value
            </label>
            <textarea
              id={`input-val-${id}`}
              value={typedData.inputValue || ""}
              onChange={handleChange}
              placeholder="Enter default value..."
              className="w-full flex-1 text-xs p-2 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 nowheel nodrag"
              style={{ minHeight: "40px" }}
            />
          </div>
        )}
      </div>
    </BaseNode>
  );
});

InputNode.displayName = "InputNode";

export default InputNode;
