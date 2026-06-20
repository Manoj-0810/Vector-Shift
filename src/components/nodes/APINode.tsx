/** APINode — CUSTOM: HTTP API call configuration */

import React, { memo, useCallback, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { Globe, Plus, Trash2 } from "lucide-react";
import BaseNode from "./BaseNode";
import type { APINodeData } from "@/types/node.types";
import { usePipelineStore } from "@/store/pipelineStore";

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

const APINode = memo((props: NodeProps) => {
  const { id, data } = props;
  const updateNode = usePipelineStore((s) => s.updateNode);
  const typedData = data as unknown as APINodeData;
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");

  const handleMethodChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNode(id, { method: e.target.value as APINodeData["method"] } as Partial<APINodeData>);
    },
    [updateNode, id]
  );

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNode(id, { url: e.target.value } as Partial<APINodeData>);
    },
    [updateNode, id]
  );

  const handleBodyChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNode(id, { body: e.target.value } as Partial<APINodeData>);
    },
    [updateNode, id]
  );

  const addHeader = useCallback(() => {
    if (newHeaderKey.trim()) {
      updateNode(id, {
        headers: { ...(typedData.headers || {}), [newHeaderKey]: newHeaderValue },
      } as Partial<APINodeData>);
      setNewHeaderKey("");
      setNewHeaderValue("");
    }
  }, [updateNode, id, typedData.headers, newHeaderKey, newHeaderValue]);

  const removeHeader = useCallback(
    (key: string) => {
      const newHeaders = { ...(typedData.headers || {}) };
      delete newHeaders[key];
      updateNode(id, { headers: newHeaders } as Partial<APINodeData>);
    },
    [updateNode, id, typedData.headers]
  );

  return (
    <BaseNode {...props}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Globe size={12} className="text-cyan-500" />
          <select
            value={typedData.method || "GET"}
            onChange={handleMethodChange}
            className="text-xs p-1 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 w-16 focus:outline-none"
          >
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={typedData.url || ""}
            onChange={handleUrlChange}
            placeholder="https://api.example.com"
            className="flex-1 text-xs p-1 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        {/* Headers */}
        <div className="border-t border-gray-100 dark:border-slate-700 pt-1.5">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Headers</span>
          {typedData.headers &&
            Object.entries(typedData.headers).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate flex-1">
                  {key}: {value}
                </span>
                <button
                  onClick={() => removeHeader(key)}
                  className="text-red-400 hover:text-red-500"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          <div className="flex items-center gap-1 mt-1">
            <input
              type="text"
              value={newHeaderKey}
              onChange={(e) => setNewHeaderKey(e.target.value)}
              placeholder="Key"
              className="w-16 text-[10px] p-1 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100"
            />
            <input
              type="text"
              value={newHeaderValue}
              onChange={(e) => setNewHeaderValue(e.target.value)}
              placeholder="Value"
              className="flex-1 text-[10px] p-1 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100"
            />
            <button onClick={addHeader} className="text-cyan-500 hover:text-cyan-600">
              <Plus size={12} />
            </button>
          </div>
        </div>

        {/* Conditional Request Body */}
        {["POST", "PUT", "PATCH"].includes(typedData.method) && (
          <div className="border-t border-gray-100 dark:border-slate-700 pt-1.5 flex flex-col gap-0.5">
            <label htmlFor={`api-body-${id}`} className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wide uppercase">
              Body (JSON)
            </label>
            <textarea
              id={`api-body-${id}`}
              value={typedData.body || ""}
              onChange={handleBodyChange}
              placeholder='{ "key": "value" }'
              className="w-full h-12 text-[10px] p-1.5 rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-cyan-400 nowheel nodrag"
            />
          </div>
        )}
      </div>
    </BaseNode>
  );
});

APINode.displayName = "APINode";

export default APINode;
