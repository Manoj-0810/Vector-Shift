/** Node type registry for ReactFlow */

import InputNode from "./InputNode";
import OutputNode from "./OutputNode";
import LLMNode from "./LLMNode";
import TextNode from "./TextNode";
import TransformNode from "./TransformNode";
import MergeNode from "./MergeNode";
import FilterNode from "./FilterNode";
import APINode from "./APINode";
import DelayNode from "./DelayNode";

export const nodeTypes = {
  input: InputNode,
  output: OutputNode,
  llm: LLMNode,
  text: TextNode,
  transform: TransformNode,
  merge: MergeNode,
  filter: FilterNode,
  api: APINode,
  delay: DelayNode,
};

export type NodeTypes = typeof nodeTypes;
