/** Frontend DAG validation (pre-submit check) */

import type { Edge } from "@xyflow/react";

interface DagValidationResult {
  isDag: boolean;
  cycleNodes: string[];
}

export function validateDag(nodes: { id: string }[], edges: Edge[]): DagValidationResult {
  const adjacency: Map<string, string[]> = new Map();

  nodes.forEach((n) => adjacency.set(n.id, []));
  edges.forEach((e) => {
    const neighbors = adjacency.get(e.source) || [];
    neighbors.push(e.target);
    adjacency.set(e.source, neighbors);
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycleNodes: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          if (!cycleNodes.includes(nodeId)) cycleNodes.push(nodeId);
          return true;
        }
      } else if (recStack.has(neighbor)) {
        if (!cycleNodes.includes(neighbor)) cycleNodes.push(neighbor);
        if (!cycleNodes.includes(nodeId)) cycleNodes.push(nodeId);
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        // Found cycle
      }
    }
  }

  return {
    isDag: cycleNodes.length === 0,
    cycleNodes,
  };
}

export function getTopologicalOrder(nodes: { id: string }[], edges: Edge[]): string[] {
  const inDegree: Map<string, number> = new Map();
  const adjacency: Map<string, string[]> = new Map();

  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  });

  edges.forEach((e) => {
    if (adjacency.has(e.source) && adjacency.has(e.target)) {
      adjacency.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  });

  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  const order: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);

    const neighbors = adjacency.get(u) || [];
    neighbors.forEach((v) => {
      const newDegree = (inDegree.get(v) || 0) - 1;
      inDegree.set(v, newDegree);
      if (newDegree === 0) {
        queue.push(v);
      }
    });
  }

  return order;
}
