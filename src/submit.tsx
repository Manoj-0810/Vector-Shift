import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, X, AlertCircle } from "lucide-react";
import { usePipelineStore } from "./store/pipelineStore";
import { API_BASE_URL } from "./utils/constants";
import { validateDag } from "./utils/dagValidation";

export const SubmitButton: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    num_nodes: number;
    num_edges: number;
    is_dag: boolean;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setResult(null);
    try {
      const nodes = usePipelineStore.getState().nodes;
      const edges = usePipelineStore.getState().edges;

      // Pre-submit client-side validation
      const clientValidation = validateDag(nodes, edges);
      usePipelineStore.getState().setCycleNodes(clientValidation.cycleNodes);

      const payload = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type || "input",
          position: n.position || { x: 0, y: 0 },
          data: n.data || {},
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || null,
          targetHandle: e.targetHandle || null,
        })),
      };

      const response = await fetch(`${API_BASE_URL}/pipelines/parse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (error: unknown) {
      console.error("Pipeline submission error:", error);
      const message = error instanceof Error ? error.message : "An unknown submission error occurred.";
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="flex items-center gap-2.5 pl-4 pr-1.5 py-1 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-900 dark:hover:bg-zinc-100 disabled:opacity-50 transition-all duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] active:scale-95 group shadow-sm cursor-pointer text-xs font-semibold"
        title="Submit pipeline configuration to /pipelines/parse"
      >
        <span>Submit Pipeline</span>
        <div className="w-7 h-7 rounded-full bg-white/20 dark:bg-zinc-950/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
          {isSubmitting ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <CheckCircle2 size={12} className="text-white dark:text-zinc-950" />
          )}
        </div>
      </button>

      {/* Modal results window via React Portal for true viewport centering */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {result && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setResult(null)}>
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-sm mx-4 overflow-hidden relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close Button */}
                  <button
                    onClick={() => setResult(null)}
                    className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X size={16} />
                  </button>

                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${result.is_dag ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-red-100 dark:bg-red-900/30 text-red-600"}`}>
                      {result.is_dag ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Pipeline Submission Analysis
                    </h3>
                  </div>

                  <div className="space-y-3 py-1">
                    <div className="flex justify-between text-xs py-1 border-b border-gray-100 dark:border-slate-700">
                      <span className="text-gray-500 dark:text-gray-400">Total Nodes</span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{result.num_nodes}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-gray-100 dark:border-slate-700">
                      <span className="text-gray-500 dark:text-gray-400">Total Edges</span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{result.num_edges}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-gray-100 dark:border-slate-700">
                      <span className="text-gray-500 dark:text-gray-400">Valid DAG structure</span>
                      <span className={`font-semibold ${result.is_dag ? "text-green-600" : "text-red-500"}`}>
                        {result.is_dag ? "Yes, valid flow" : "No, cycles detected"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setResult(null)}
                    className="mt-6 w-full py-2 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-900 dark:hover:bg-zinc-100 text-xs font-semibold transition-all duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] active:scale-95"
                  >
                    Close Analysis
                  </button>
                </motion.div>
              </div>
            )}

            {errorMsg && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setErrorMsg(null)}>
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl border border-red-200 dark:border-red-900/30 w-full max-w-sm mx-4 overflow-hidden relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setErrorMsg(null)}
                    className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <X size={16} />
                  </button>

                  <div className="flex items-center gap-2 mb-4 text-red-600">
                    <AlertCircle size={18} />
                    <h3 className="text-sm font-semibold">
                      Submission Failure
                    </h3>
                  </div>
                  <p className="text-xs text-red-500 mb-6">{errorMsg}</p>
                  <button
                    onClick={() => setErrorMsg(null)}
                    className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-750 text-white text-xs font-semibold transition-colors"
                  >
                    Dismiss
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};

export default SubmitButton;
