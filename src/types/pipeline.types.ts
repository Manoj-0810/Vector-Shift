/** Pipeline and canvas-related type definitions */

import type { Node, Edge } from "@xyflow/react";
import type { NodeData, NodeType } from "./node.types";

// Extend NodeData to satisfy Record<string, unknown>
export interface PipelineNode extends Node {
  type: NodeType;
  data: NodeData;
}

export interface PipelineEdge extends Edge {
  animated?: boolean;
}

export interface PipelineState {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export interface UndoRedoState {
  past: PipelineState[];
  present: PipelineState;
  future: PipelineState[];
}
