/** PropertiesPanel — Selected node editor sidebar */

import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileInput, Monitor, Brain, Type, Shuffle, Merge, Filter, Globe, Clock, MousePointer } from "lucide-react";
import { NODE_CONFIGS, type NodeType, type NodeData } from "@/types/node.types";
import { usePipelineStore } from "@/store/pipelineStore";

const NODE_ICONS: Record<NodeType, React.ReactNode> = {
  input: <FileInput size={16} />,
  output: <Monitor size={16} />,
  llm: <Brain size={16} />,
  text: <Type size={16} />,
  transform: <Shuffle size={16} />,
  merge: <Merge size={16} />,
  filter: <Filter size={16} />,
  api: <Globe size={16} />,
  delay: <Clock size={16} />,
};

const PropertiesPanel = memo(() => {
  const { selectedNodeId, nodes, updateNode, selectNode } = usePipelineStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-64 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-3">
          <MousePointer size={20} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Select a node
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Click on any node to edit its properties
        </p>
      </div>
    );
  }

  const nodeType = selectedNode.type as NodeType;
  const config = NODE_CONFIGS[nodeType];
  const data = selectedNode.data as NodeData;

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNode(selectedNode.id, { label: e.target.value } as Partial<NodeData>);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNode(selectedNode.id, { description: e.target.value } as Partial<NodeData>);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 20, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-72 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-l border-gray-200/50 dark:border-slate-800/80 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span style={{ color: config.color }}>{NODE_ICONS[nodeType]}</span>
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {config.label}
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {config.description}
              </p>
            </div>
          </div>
          <button
            onClick={() => selectNode(null)}
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Properties */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Node ID */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Node ID
            </label>
            <code className="text-[11px] px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-mono">
              {selectedNode.id.slice(0, 12)}...
            </code>
          </div>

          {/* Label */}
          <div>
            <label htmlFor="node-label" className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Label
            </label>
            <input
              id="node-label"
              type="text"
              value={data.label || ""}
              onChange={handleLabelChange}
              className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="node-description" className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Description
            </label>
            <input
              id="node-description"
              type="text"
              value={data.description || ""}
              onChange={handleDescriptionChange}
              placeholder="Optional description..."
              className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all"
            />
          </div>

          {/* Position */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Position
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <span className="text-[10px] text-gray-400">X</span>
                <div className="text-xs px-2 py-1.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-mono">
                  {Math.round(selectedNode.position.x)}
                </div>
              </div>
              <div className="flex-1">
                <span className="text-[10px] text-gray-400">Y</span>
                <div className="text-xs px-2 py-1.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-mono">
                  {Math.round(selectedNode.position.y)}
                </div>
              </div>
            </div>
          </div>

          {/* Type-specific info */}
          <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
            <label className="block text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-2">
              System Specifications
            </label>
            <div className="p-1 rounded-[1.25rem] bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80">
              <div className="px-3 py-2.5 rounded-[calc(1.25rem-4px)] bg-white dark:bg-slate-800 border border-gray-200/20 dark:border-slate-700/20 text-xs text-gray-500 dark:text-gray-400 space-y-1.5 shadow-xs">
                <div className="flex justify-between">
                  <span>Type</span>
                  <span className="font-semibold" style={{ color: config.color }}>
                    {config.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Inputs</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {config.inputs}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Outputs</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {config.outputs}
                  </span>
                </div>
                {config.variableInputs && (
                  <div className="flex justify-between">
                    <span>Dynamic Handles</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      Yes
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

PropertiesPanel.displayName = "PropertiesPanel";

export default PropertiesPanel;
