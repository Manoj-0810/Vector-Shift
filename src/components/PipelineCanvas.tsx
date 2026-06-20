/** PipelineCanvas - Main ReactFlow canvas with drag-and-drop */

import React, { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  type Edge,
  type Node,
  BackgroundVariant,
  Panel,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Undo2,
  Redo2,
  Download,
  Upload,
  Play,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { nodeTypes } from "./nodes/nodeRegistry";
import { usePipelineStore } from "@/store/pipelineStore";
import type { NodeType } from "@/types/node.types";
import { API_BASE_URL, NODE_COLORS } from "@/utils/constants";
import { getTopologicalOrder, validateDag } from "@/utils/dagValidation";
import { SubmitButton } from "../submit";

const PipelineCanvas: React.FC = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    undo,
    redo,
    canUndo,
    canRedo,
    exportPipeline,
    importPipeline,
    resetPipeline,
    isDarkMode,
  } = usePipelineStore();

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow") as NodeType;
      if (type && reactFlowInstance) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        usePipelineStore.getState().addNode(type, position);
      }
    },
    [reactFlowInstance]
  );

  // Node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onDelete = useCallback(
    ({ nodes: deletedNodes, edges: deletedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      deletedNodes.forEach((node) => {
        usePipelineStore.getState().deleteNode(node.id);
      });
      deletedEdges.forEach((edge) => {
        usePipelineStore.getState().deleteEdge(edge.id);
      });
    },
    []
  );

  const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    usePipelineStore.getState().deleteEdge(edge.id);
  }, []);

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const onNodeDragStop = useCallback(() => {
    usePipelineStore.getState()._flushHistoryDebounce();
    usePipelineStore.getState()._saveToHistory();
  }, []);

  // Keydown handlers (Delete node & Ctrl+O import)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + O: Import JSON
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
        fileInputRef.current?.click();
        return;
      }

      // Delete / Backspace: Remove selected node
      if (e.key === "Delete" || e.key === "Backspace") {
        const state = usePipelineStore.getState();
        const activeTag = document.activeElement?.tagName;
        const isTyping =
          activeTag === "INPUT" ||
          activeTag === "TEXTAREA" ||
          activeTag === "SELECT" ||
          document.activeElement?.getAttribute("contenteditable") === "true";

        if (state.selectedNodeId && !isTyping) {
          state.deleteNode(state.selectedNodeId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Export
  const handleExport = useCallback(() => {
    const data = exportPipeline();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipeline-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportPipeline]);

  // Import
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = event.target?.result as string;
            importPipeline(json);
          } catch {
            setSubmitResult({ type: "error", message: "Invalid JSON file" });
          }
        };
        reader.readAsText(file);
      }
      e.target.value = "";
    },
    [importPipeline]
  );

  // Submit pipeline
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      const currentNodes = usePipelineStore.getState().nodes;
      const currentEdges = usePipelineStore.getState().edges;

      // Instant client-side check
      const clientValidation = validateDag(currentNodes, currentEdges);
      usePipelineStore.getState().setCycleNodes(clientValidation.cycleNodes);

      const response = await fetch(`${API_BASE_URL}/api/pipelines/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: currentNodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
          })),
          edges: currentEdges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
        }),
      });

      const data = await response.json();
      setSubmitResult({
        type: data.is_dag ? "success" : "error",
        message: `Nodes: ${data.num_nodes} | Edges: ${data.num_edges} | ${data.message}`,
      });
      usePipelineStore.getState().setCycleNodes(data.cycle_nodes || []);
    } catch {
      setSubmitResult({
        type: "error",
        message: "Connection error. Is the backend running?",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const [isRunning, setIsRunning] = useState(false);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setSubmitResult(null);
    const store = usePipelineStore.getState();
    store.clearExecutionStates();
    store.setCycleNodes([]);

    try {
      const currentNodes = store.nodes;
      const currentEdges = store.edges;

      const response = await fetch(`${API_BASE_URL}/api/pipelines/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: currentNodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
          })),
          edges: currentEdges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Execution failed.");
      }

      const data = await response.json();
      if (data.success && data.node_updates) {
        const executionOrder = getTopologicalOrder(currentNodes, currentEdges);

        for (const nodeId of executionOrder) {
          store.setNodeExecutionState(nodeId, "running");
          await new Promise((resolve) => setTimeout(resolve, 800));

          const updates = data.node_updates[nodeId];
          if (updates) {
            store.updateNode(nodeId, updates as Record<string, unknown>);
          }
          store.setNodeExecutionState(nodeId, "success");
        }

        setSubmitResult({
          type: "success",
          message: "Pipeline execution completed successfully!",
        });
      } else {
        setSubmitResult({
          type: "error",
          message: "Pipeline execution failed.",
        });
      }
    } catch (e: unknown) {
      const errMessage = e instanceof Error ? e.message : "Connection error. Is the backend running?";
      setSubmitResult({
        type: "error",
        message: errMessage,
      });
      store.nodes.forEach((n) => {
        store.setNodeExecutionState(n.id, "error");
      });
    } finally {
      setIsRunning(false);
    }
  }, []);


  const minimapNodeColor = useCallback((node: Node) => {
    return NODE_COLORS[node.type as NodeType] || "#94a3b8";
  }, []);

  return (
    <div className="flex-1 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDelete={onDelete}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeDragStop={onNodeDragStop}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
        selectionKeyCode="Shift"
        multiSelectionKeyCode={["Meta", "Ctrl"]}
        className={isDarkMode ? "dark" : ""}
        style={{ background: isDarkMode ? "#0f172a" : "#f8fafc" }}
        defaultEdgeOptions={{
          animated: true,
          style: { strokeWidth: 2 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={12}
          size={1}
          color={isDarkMode ? "#334155" : "#e2e8f0"}
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor={isDarkMode ? "rgba(15, 23, 42, 0.7)" : "rgba(248, 250, 252, 0.7)"}
          className="rounded-lg shadow-md border border-gray-200 dark:border-slate-700"
          style={{
            background: isDarkMode ? "#1e293b" : "#ffffff",
          }}
        />
        <Controls className="rounded-lg shadow-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800" />

        {/* Bottom action bar */}
        <Panel position="bottom-center" className="m-4">
          <div className="flex items-center gap-3 px-4 py-2.5 backdrop-blur-md bg-white/75 dark:bg-slate-900/75 rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-800/80 transition-colors duration-200">
            {/* Undo/Redo */}
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 size={16} />
            </button>

            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700/80" />

            {/* Export/Import */}
            <button
              onClick={handleExport}
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 transition-all duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]"
              title="Export (Ctrl+S)"
            >
              <Download size={16} />
            </button>
            <button
              onClick={handleImportClick}
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 transition-all duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]"
              title="Import (Ctrl+O)"
            >
              <Upload size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={resetPipeline}
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 transition-all duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]"
              title="Reset"
            >
              <RotateCcw size={16} />
            </button>

            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700/80" />

            {/* Validate */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isRunning}
              className="flex items-center gap-2 pl-3.5 pr-1.5 py-1 rounded-full border border-gray-200/80 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] active:scale-95 group shadow-xs cursor-pointer"
              title="Validate Pipeline DAG structure"
            >
              <span>Validate</span>
              <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                {isSubmitting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCircle size={12} />
                )}
              </div>
            </button>

            {/* Submit */}
            <SubmitButton />

            {/* Run */}
            <button
              onClick={handleRun}
              disabled={isSubmitting || isRunning}
              className="flex items-center gap-2.5 pl-4 pr-1.5 py-1 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 transition-all duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] active:scale-95 group shadow-sm cursor-pointer"
              title="Run topological workflow execution"
            >
              <span>Run Pipeline</span>
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                {isRunning ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Play size={12} fill="currentColor" className="text-white" />
                )}
              </div>
            </button>
          </div>
        </Panel>

        {/* Submit result toast */}
        {submitResult && (
          <Panel position="top-center" className="m-4">
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${
                submitResult.type === "success"
                  ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                  : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
              }`}
            >
              {submitResult.type === "success" ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span className="text-sm font-medium">{submitResult.message}</span>
              <button
                onClick={() => setSubmitResult(null)}
                className="ml-2 text-xs opacity-60 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Empty Canvas State Overlay */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10 p-4">
          <div className="max-w-md w-full p-8 rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-lg border border-gray-200/50 dark:border-slate-800/80 shadow-2xl flex flex-col items-center text-center transition-all duration-300 transform scale-100">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 flex items-center justify-center mb-6 border border-blue-500/20 dark:border-purple-500/30 shadow-inner">
              <Sparkles className="w-8 h-8 text-blue-600 dark:text-purple-400 animate-pulse" />
            </div>
            
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2 tracking-tight">
              Build your AI Pipeline
            </h3>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-sm leading-relaxed">
              Drag nodes from the left panel onto this canvas, connect their handles, and click <strong className="text-gray-700 dark:text-gray-200">Run Pipeline</strong> to execute.
            </p>

            <div className="w-full space-y-3.5 text-left bg-white/20 dark:bg-slate-950/20 p-5 rounded-2xl border border-gray-100/50 dark:border-slate-800/40">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Drag Nodes</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Choose LLM, Text, Input, Transform or other nodes from the sidebar.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Connect Handles</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Link output ports to input ports to establish data flow.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Run and Validate</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Verify cycles, execute nodes sequentially, and inspect results.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineCanvas;
