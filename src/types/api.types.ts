/** Backend API request/response types */

export interface PipelineNodeDTO {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface PipelineEdgeDTO {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface PipelineValidateRequest {
  nodes: PipelineNodeDTO[];
  edges: PipelineEdgeDTO[];
}

export interface PipelineValidateResponse {
  num_nodes: number;
  num_edges: number;
  is_dag: boolean;
  cycle_nodes: string[];
  message: string;
}

export interface HealthResponse {
  status: string;
  version: string;
}
