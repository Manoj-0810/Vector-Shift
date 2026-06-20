/** Constants for the pipeline builder */

import { NodeType } from "@/types/node.types";

export const NODE_COLORS: Record<NodeType, string> = {
  [NodeType.INPUT]: "#3b82f6",
  [NodeType.OUTPUT]: "#22c55e",
  [NodeType.LLM]: "#a855f7",
  [NodeType.TEXT]: "#f97316",
  [NodeType.TRANSFORM]: "#6366f1",
  [NodeType.MERGE]: "#ec4899",
  [NodeType.FILTER]: "#ef4444",
  [NodeType.API]: "#06b6d4",
  [NodeType.DELAY]: "#eab308",
};

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";
