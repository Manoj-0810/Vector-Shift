/** Node type definitions for the pipeline builder */

// Node types as const object (enum alternative for erasableSyntaxOnly)
export const NodeType = {
  INPUT: "input",
  OUTPUT: "output",
  LLM: "llm",
  TEXT: "text",
  TRANSFORM: "transform",
  MERGE: "merge",
  FILTER: "filter",
  API: "api",
  DELAY: "delay",
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];

export interface Position {
  x: number;
  y: number;
}

// Base node data with index signature for ReactFlow compatibility
export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
}

export interface InputNodeData extends BaseNodeData {
  inputValue: string;
  inputName: string;
  inputType: "Text" | "File";
  instructions?: string;
}

export interface OutputNodeData extends BaseNodeData {
  outputValue?: string;
  outputName: string;
  outputType: "Text" | "Image";
}

export interface LLMNodeData extends BaseNodeData {
  model: string;
  temperature: number;
  systemPrompt: string;
  maxTokens: number;
}

export interface TextNodeData extends BaseNodeData {
  text: string;
  variables: string[];
}

export type TransformType = "uppercase" | "lowercase" | "trim" | "json_parse" | "json_stringify" | "reverse" | "slugify";

export interface TransformNodeData extends BaseNodeData {
  transformType: TransformType;
}

export type MergeStrategy = "concat" | "object_merge" | "array_merge" | "join_comma" | "join_newline";

export interface MergeNodeData extends BaseNodeData {
  strategy: MergeStrategy;
}

export type FilterCondition = "contains" | "equals" | "greater_than" | "less_than" | "starts_with" | "ends_with" | "regex";

export interface FilterNodeData extends BaseNodeData {
  condition: FilterCondition;
  value: string;
}

export interface APINodeData extends BaseNodeData {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export type DelayUnit = "ms" | "seconds" | "minutes";

export interface DelayNodeData extends BaseNodeData {
  duration: number;
  unit: DelayUnit;
}

export type NodeData =
  | InputNodeData
  | OutputNodeData
  | LLMNodeData
  | TextNodeData
  | TransformNodeData
  | MergeNodeData
  | FilterNodeData
  | APINodeData
  | DelayNodeData;

export interface NodeConfig {
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  color: string;
  inputs: number;
  outputs: number;
  variableInputs?: boolean;
  inputNames?: string[];
  defaultData: Partial<NodeData>;
}

export const NODE_CONFIGS: Record<NodeType, NodeConfig> = {
  [NodeType.INPUT]: {
    type: NodeType.INPUT,
    label: "Input",
    description: "Text input source",
    icon: "FileInput",
    color: "#3b82f6",
    inputs: 0,
    outputs: 1,
    defaultData: { inputValue: "", inputName: "input_name", inputType: "Text" },
  },
  [NodeType.OUTPUT]: {
    type: NodeType.OUTPUT,
    label: "Output",
    description: "Display output",
    icon: "Monitor",
    color: "#22c55e",
    inputs: 1,
    outputs: 0,
    defaultData: { outputValue: "", outputName: "output_name", outputType: "Text" },
  },
  [NodeType.LLM]: {
    type: NodeType.LLM,
    label: "LLM",
    description: "Language model configuration",
    icon: "Brain",
    color: "#a855f7",
    inputs: 2,
    outputs: 1,
    inputNames: ["system", "prompt"],
    defaultData: { model: "gpt-4o", temperature: 0.7, systemPrompt: "", maxTokens: 2048 },
  },
  [NodeType.TEXT]: {
    type: NodeType.TEXT,
    label: "Text",
    description: "Text template with {{variables}}",
    icon: "Type",
    color: "#f97316",
    inputs: 0,
    outputs: 1,
    variableInputs: true,
    defaultData: { text: "Hello {{name}}!", variables: [] },
  },
  [NodeType.TRANSFORM]: {
    type: NodeType.TRANSFORM,
    label: "Transform",
    description: "Apply function to input data",
    icon: "Shuffle",
    color: "#6366f1",
    inputs: 1,
    outputs: 1,
    defaultData: { transformType: "uppercase" },
  },
  [NodeType.MERGE]: {
    type: NodeType.MERGE,
    label: "Merge",
    description: "Combine multiple inputs",
    icon: "Merge",
    color: "#ec4899",
    inputs: 3,
    outputs: 1,
    defaultData: { strategy: "concat" },
  },
  [NodeType.FILTER]: {
    type: NodeType.FILTER,
    label: "Filter",
    description: "Conditional pass-through",
    icon: "Filter",
    color: "#ef4444",
    inputs: 1,
    outputs: 1,
    defaultData: { condition: "contains", value: "" },
  },
  [NodeType.API]: {
    type: NodeType.API,
    label: "API",
    description: "HTTP API call",
    icon: "Globe",
    color: "#06b6d4",
    inputs: 1,
    outputs: 1,
    defaultData: { method: "GET", url: "", headers: {} },
  },
  [NodeType.DELAY]: {
    type: NodeType.DELAY,
    label: "Delay",
    description: "Wait for specified duration",
    icon: "Clock",
    color: "#eab308",
    inputs: 1,
    outputs: 1,
    defaultData: { duration: 1, unit: "seconds" },
  },
};
