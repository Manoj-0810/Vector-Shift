/** BaseNode — Abstract base component that all nodes extend */

import React, { memo, useState, useCallback } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, GripVertical, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { NODE_CONFIGS, NodeType } from "@/types/node.types";
import { usePipelineStore } from "@/store/pipelineStore";

interface BaseNodeProps extends NodeProps {
  children?: React.ReactNode;
  variableHandles?: Array<{ id: string; label: string }>;
  style?: React.CSSProperties;
}

const BaseNode = memo(({ id, data, selected, type, children, variableHandles, style }: BaseNodeProps) => {
  const nodeType = type as NodeType;
  const config = NODE_CONFIGS[nodeType] || NODE_CONFIGS[NodeType.INPUT];
  const color = config.color;
  const deleteNode = usePipelineStore((s) => s.deleteNode);
  const [isHovered, setIsHovered] = useState(false);

  const cycleNodes = usePipelineStore((s) => s.cycleNodes);
  const executionState = usePipelineStore((s) => s.nodeExecutionStates[id] || "idle");
  const isCycleNode = cycleNodes.includes(id);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteNode(id);
    },
    [deleteNode, id]
  );

  const inputCount = config.variableInputs
    ? (variableHandles?.length ?? 0)
    : config.inputs;
  const outputCount = config.outputs;

  // Generate input handles
  const renderInputHandles = () => {
    if (config.variableInputs && variableHandles) {
      return variableHandles.map((vh, index) => (
        <Handle
          key={`input-${vh.id}`}
          type="target"
          position={Position.Left}
          id={`input-${vh.id}`}
          className="group"
          style={{
            top: `${((index + 1) / (variableHandles.length + 1)) * 100}%`,
            left: -10,
            width: 20,
            height: 20,
            background: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
        >
          {/* Visible Circular Node Handle */}
          <div
            className="w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm transition-transform duration-150 group-hover:scale-125 flex-shrink-0"
            style={{ backgroundColor: color }}
          />

          {/* Premium Hover Tooltip (Outside) */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 scale-95 translate-x-1 origin-right transition-all duration-200 ease-out group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 dark:bg-slate-950/95 border border-slate-700/60 dark:border-slate-800/80 shadow-lg shadow-black/25 backdrop-blur-xs whitespace-nowrap z-50">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-sans font-bold tracking-wider text-slate-200 dark:text-slate-100 uppercase">
              {vh.label}
            </span>
            <div className="absolute top-1/2 -translate-y-1/2 left-full w-1.5 h-1.5 bg-slate-900 dark:bg-slate-950 border-t border-r border-slate-700/60 dark:border-slate-800/85 rotate-45 -ml-[4px] pointer-events-none" />
          </div>
        </Handle>
      ));
    }

    const inputNames = config.inputNames;

    return Array.from({ length: inputCount }).map((_, index) => {
      const handleId = inputNames ? inputNames[index] : `input-${index}`;
      const label = inputNames ? inputNames[index] : (inputCount > 1 ? `Input ${index + 1}` : "Input");
      return (
        <Handle
          key={`input-${index}`}
          type="target"
          position={Position.Left}
          id={handleId}
          className="group"
          style={{
            top: `${((index + 1) / (inputCount + 1)) * 100}%`,
            left: -10,
            width: 20,
            height: 20,
            background: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
        >
          {/* Visible Circular Node Handle */}
          <div
            className="w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm transition-transform duration-150 group-hover:scale-125 flex-shrink-0"
            style={{ backgroundColor: color }}
          />

          {/* Premium Hover Tooltip (Outside) */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 scale-95 translate-x-1 origin-right transition-all duration-200 ease-out group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 dark:bg-slate-950/95 border border-slate-700/60 dark:border-slate-800/80 shadow-lg shadow-black/25 backdrop-blur-xs whitespace-nowrap z-50">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-sans font-bold tracking-wider text-slate-200 dark:text-slate-100 uppercase">
              {label}
            </span>
            <div className="absolute top-1/2 -translate-y-1/2 left-full w-1.5 h-1.5 bg-slate-900 dark:bg-slate-950 border-t border-r border-slate-700/60 dark:border-slate-800/85 rotate-45 -ml-[4px] pointer-events-none" />
          </div>
        </Handle>
      );
    });
  };

  // Generate output handles
  const renderOutputHandles = () => {
    return Array.from({ length: outputCount }).map((_, index) => {
      const label = outputCount > 1 ? `Output ${index + 1}` : "Output";
      return (
        <Handle
          key={`output-${index}`}
          type="source"
          position={Position.Right}
          id={`output-${index}`}
          className="group"
          style={{
            top: `${((index + 1) / (outputCount + 1)) * 100}%`,
            right: -10,
            width: 20,
            height: 20,
            background: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
        >
          {/* Premium Hover Tooltip (Outside) */}
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 scale-95 -translate-x-1 origin-left transition-all duration-200 ease-out group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 dark:bg-slate-950/95 border border-slate-700/60 dark:border-slate-800/80 shadow-lg shadow-black/25 backdrop-blur-xs whitespace-nowrap z-50">
            <span className="text-[10px] font-sans font-bold tracking-wider text-slate-200 dark:text-slate-100 uppercase">
              {label}
            </span>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <div className="absolute top-1/2 -translate-y-1/2 right-full w-1.5 h-1.5 bg-slate-900 dark:bg-slate-950 border-b border-l border-slate-700/60 dark:border-slate-800/85 rotate-45 -mr-[4px] pointer-events-none" />
          </div>

          {/* Visible Circular Node Handle */}
          <div
            className="w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm transition-transform duration-150 group-hover:scale-125 flex-shrink-0"
            style={{ backgroundColor: color }}
          />
        </Handle>
      );
    });
  };

  // Styles based on cycle and execution state
  let stateBorderClass = "";
  let stateShadowClass = "";
  let indicatorIcon: React.ReactNode = null;

  if (isCycleNode) {
    stateBorderClass = "border-red-500 border-2";
    stateShadowClass = "shadow-[0_0_15px_rgba(239,68,68,0.65)] animate-pulse";
    indicatorIcon = <span title="Involved in a cycle!"><AlertCircle size={14} className="text-red-500 animate-bounce" /></span>;
  } else if (executionState === "running") {
    stateBorderClass = "border-yellow-500 border-2";
    stateShadowClass = "shadow-[0_0_15px_rgba(234,179,8,0.65)] animate-pulse";
    indicatorIcon = <Loader2 size={14} className="text-yellow-500 animate-spin" />;
  } else if (executionState === "success") {
    stateBorderClass = "border-green-500 border-2";
    stateShadowClass = "shadow-[0_0_15px_rgba(34,197,94,0.5)]";
    indicatorIcon = <CheckCircle2 size={14} className="text-green-500" />;
  } else if (executionState === "error") {
    stateBorderClass = "border-red-500 border-2";
    stateShadowClass = "shadow-[0_0_15px_rgba(239,68,68,0.65)]";
    indicatorIcon = <AlertCircle size={14} className="text-red-500" />;
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative rounded-2xl min-w-[200px]
        bg-slate-50/90 dark:bg-slate-900/40
        border border-gray-200/50 dark:border-slate-800/80
        p-1 transition-all duration-150 ease-out
        flex flex-col h-full w-full
        ${selected ? "ring-2 ring-offset-1 dark:ring-offset-slate-950" : ""}
        ${stateShadowClass ? stateShadowClass : isHovered ? "shadow-md -translate-y-0.5" : "shadow-sm"}
      `}
      style={{
        ...(selected ? { ringColor: color } : {}),
        ...style,
      }}
    >
      <NodeResizer
        minWidth={200}
        minHeight={100}
        isVisible={true}
        lineStyle={{
          borderColor: "transparent",
          background: "transparent",
        }}
        handleStyle={{
          backgroundColor: "transparent",
          borderColor: "transparent",
          width: 14,
          height: 14,
        }}
      />
      {/* Delete button */}
      <AnimatePresence>
        {isHovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={handleDelete}
            className="absolute -top-2 -right-2 z-10 p-1 rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
            title="Delete node"
          >
            <Trash2 size={12} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Inner Core (Concentric Bezel) */}
      <div
        className={`
          flex-1 flex flex-col min-h-0 w-full bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-xs border border-gray-200/40 dark:border-slate-700/50
          ${stateBorderClass ? stateBorderClass : "border-l-[3px]"}
        `}
        style={{
          ...(!stateBorderClass ? { borderLeftColor: color } : {}),
        }}
      >
        {/* Node header */}
        <div
          className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30"
          style={{ background: `${color}0D` }}
        >
          <GripVertical size={14} className="text-gray-400 cursor-grab" />
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 flex-1 truncate font-sans">
            {(data.label as string) || config.label}
          </span>
          {indicatorIcon && <div className="flex items-center">{indicatorIcon}</div>}
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white uppercase tracking-wider"
            style={{ backgroundColor: color }}
          >
            {config.label}
          </span>
        </div>

        {/* Node body */}
        <div className="px-3 py-2 flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800">
          {children}
        </div>
      </div>

      {/* Input handles */}
      {renderInputHandles()}

      {/* Output handles */}
      {renderOutputHandles()}
    </motion.div>
  );
});

BaseNode.displayName = "BaseNode";

export default BaseNode;
