/** Zustand store for pipeline state management with undo/redo and localStorage persistence */

import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import type { NodeData, NodeType } from "@/types/node.types";
import { NODE_CONFIGS } from "@/types/node.types";
import { NODE_COLORS } from "@/utils/constants";

// Helper for managing debounced history commits
function debounceWithFlush<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: any = null;
  let lastArgs: any[] = [];
  
  const debounced = function(this: any, ...args: any[]) {
    lastArgs = args;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      func.apply(this, lastArgs);
    }, wait);
  };
  
  debounced.flush = function(this: any) {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
      func.apply(this, lastArgs);
    }
  };
  
  debounced.cancel = function() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debounced;
}

const STORAGE_KEY = "vectorshift-pipeline";
const MAX_HISTORY = 50;

interface PipelineState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  isDarkMode: boolean;
  hasOnboarded: boolean;
  lastSaved: number | null;
  cycleNodes: string[];
  nodeExecutionStates: Record<string, "idle" | "running" | "success" | "error">;
}

interface PipelineActions {
  // Node actions
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  setNodes: (nodes: Node<NodeData>[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;

  // Edge actions
  addEdge: (edge: Edge) => void;
  deleteEdge: (id: string) => void;
  setEdges: (edges: Edge[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Theme
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;

  // Onboarding
  completeOnboarding: () => void;

  // Import/export
  exportPipeline: () => string;
  importPipeline: (json: string) => void;
  resetPipeline: () => void;

  // Visual highlights
  setCycleNodes: (nodeIds: string[]) => void;
  setNodeExecutionState: (nodeId: string, state: "idle" | "running" | "success" | "error") => void;
  clearExecutionStates: () => void;

  // Getters
  getSelectedNode: () => Node<NodeData> | undefined;
}

interface HistoryEntry {
  nodes: Node<NodeData>[];
  edges: Edge[];
}

interface PipelineStore extends PipelineState, PipelineActions {
  _history: HistoryEntry[];
  _historyIndex: number;
  _saveToHistory: () => void;
  _saveToHistoryDebounced: () => void;
  _flushHistoryDebounce: () => void;
}

function loadInitialState(): Partial<PipelineState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        nodes: parsed.nodes || [],
        edges: parsed.edges || [],
        isDarkMode: parsed.isDarkMode ?? true,
        hasOnboarded: parsed.hasOnboarded ?? false,
      };
    }
  } catch {
    // Ignore load errors
  }
  return {
    nodes: [],
    edges: [],
    isDarkMode: true,
    hasOnboarded: false,
  };
}

function persistState(state: PipelineState) {
  try {
    const toSave = {
      nodes: state.nodes,
      edges: state.edges,
      isDarkMode: state.isDarkMode,
      hasOnboarded: state.hasOnboarded,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Ignore persist errors
  }
}

let nextIdCounter = 0;
function generateId(): string {
  nextIdCounter += 1;
  return `node_${Date.now()}_${nextIdCounter}`;
}

export const usePipelineStore = create<PipelineStore>((set, get) => {
  const initial = loadInitialState();

  const debouncedSave = debounceWithFlush(() => {
    get()._saveToHistory();
  }, 800);

  return {
    // State
    nodes: initial.nodes || [],
    edges: initial.edges || [],
    selectedNodeId: null,
    isDarkMode: initial.isDarkMode ?? true,
    hasOnboarded: initial.hasOnboarded ?? false,
    lastSaved: null,
    cycleNodes: [],
    nodeExecutionStates: {},
    _history: [
      {
        nodes: JSON.parse(JSON.stringify(initial.nodes || [])),
        edges: JSON.parse(JSON.stringify(initial.edges || [])),
      },
    ],
    _historyIndex: 0,

    // Internal: save current state to history
    _saveToHistory: () => {
      const { nodes, edges, _history, _historyIndex } = get();
      const entry: HistoryEntry = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      };

      // Remove any future history entries if we're not at the end
      const newHistory = _history.slice(0, _historyIndex + 1);
      newHistory.push(entry);

      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }

      set({
        _history: newHistory,
        _historyIndex: newHistory.length - 1,
      });
    },

    _saveToHistoryDebounced: () => {
      debouncedSave();
    },

    _flushHistoryDebounce: () => {
      debouncedSave.flush();
    },

    // Node actions
    addNode: (type, position) => {
      get()._flushHistoryDebounce();
      const config = NODE_CONFIGS[type];
      const id = generateId();
      const newNode: Node<NodeData> = {
        id,
        type: type as string,
        position,
        data: {
          label: config.label,
          ...config.defaultData,
        } as NodeData,
        measured: { width: 200, height: 80 },
      };
      set((state) => ({
        nodes: [...state.nodes, newNode],
        selectedNodeId: id,
        lastSaved: Date.now(),
        cycleNodes: [],
        nodeExecutionStates: {},
      }));
      persistState(get());
      get()._saveToHistory();
    },

    updateNode: (id, data) => {
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...data } } : node
        ),
        lastSaved: Date.now(),
      }));
      persistState(get());
      get()._saveToHistoryDebounced();
    },

    deleteNode: (id) => {
      get()._flushHistoryDebounce();
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        lastSaved: Date.now(),
        cycleNodes: [],
        nodeExecutionStates: {},
      }));
      persistState(get());
      get()._saveToHistory();
    },

    selectNode: (id) => {
      get()._flushHistoryDebounce();
      set({ selectedNodeId: id });
    },

    setNodes: (nodes) => {
      set({ nodes, lastSaved: Date.now() });
      persistState({ ...get(), nodes });
    },

    onNodesChange: (changes) => {
      set((state) => {
        const nextNodes = applyNodeChanges(changes, state.nodes) as Node<NodeData>[];
        
        // Find if selection changed to update selectedNodeId
        let nextSelectedNodeId = state.selectedNodeId;
        for (const change of changes) {
          if (change.type === "select") {
            nextSelectedNodeId = change.selected ? change.id : (nextSelectedNodeId === change.id ? null : nextSelectedNodeId);
          } else if (change.type === "remove" && change.id === state.selectedNodeId) {
            nextSelectedNodeId = null;
          }
        }

        return {
          nodes: nextNodes,
          selectedNodeId: nextSelectedNodeId,
          lastSaved: Date.now(),
        };
      });
      persistState(get());
    },

    // Edge actions
    addEdge: (edge) => {
      get()._flushHistoryDebounce();
      let added = false;
      set((state) => {
        const exists = state.edges.some(
          (e) => e.source === edge.source &&
                 e.target === edge.target &&
                 e.sourceHandle === edge.sourceHandle &&
                 e.targetHandle === edge.targetHandle
        );
        if (exists) return state;
        added = true;
        return {
          edges: [...state.edges, edge],
          lastSaved: Date.now(),
          cycleNodes: [],
          nodeExecutionStates: {},
        };
      });
      persistState(get());
      if (added) {
        get()._saveToHistory();
      }
    },

    deleteEdge: (id) => {
      get()._flushHistoryDebounce();
      set((state) => ({
        edges: state.edges.filter((e) => e.id !== id),
        lastSaved: Date.now(),
        cycleNodes: [],
        nodeExecutionStates: {},
      }));
      persistState(get());
      get()._saveToHistory();
    },

    setEdges: (edges) => {
      set({ edges, lastSaved: Date.now() });
      persistState({ ...get(), edges });
    },

    onEdgesChange: (changes) => {
      set((state) => {
        const nextEdges = applyEdgeChanges(changes, state.edges);
        return {
          edges: nextEdges,
          lastSaved: Date.now(),
        };
      });
      persistState(get());
    },

    onConnect: (connection) => {
      get()._flushHistoryDebounce();
      if (connection.source && connection.target) {
        const sourceNode = get().nodes.find((n) => n.id === connection.source);
        const edgeColor = NODE_COLORS[sourceNode?.type as NodeType] || "#94a3b8";
        const newEdge: Edge = {
          id: `edge_${Date.now()}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle || undefined,
          targetHandle: connection.targetHandle || undefined,
          animated: true,
          style: { stroke: edgeColor },
        };

        let added = false;
        set((state) => {
          const exists = state.edges.some(
            (e) => e.source === newEdge.source &&
                   e.target === newEdge.target &&
                   e.sourceHandle === newEdge.sourceHandle &&
                   e.targetHandle === newEdge.targetHandle
          );
          if (exists) return state;
          added = true;
          return {
            edges: [...state.edges, newEdge],
            lastSaved: Date.now(),
            cycleNodes: [],
            nodeExecutionStates: {},
          };
        });
        persistState(get());
        if (added) {
          get()._saveToHistory();
        }
      }
    },

    // Undo/redo
    undo: () => {
      get()._flushHistoryDebounce();
      const { _history, _historyIndex } = get();
      if (_historyIndex > 0) {
        const newIndex = _historyIndex - 1;
        const entry = _history[newIndex];
        set({
          nodes: JSON.parse(JSON.stringify(entry.nodes)),
          edges: JSON.parse(JSON.stringify(entry.edges)),
          _historyIndex: newIndex,
          lastSaved: Date.now(),
        });
        persistState(get());
      }
    },

    redo: () => {
      get()._flushHistoryDebounce();
      const { _history, _historyIndex } = get();
      if (_historyIndex < _history.length - 1) {
        const newIndex = _historyIndex + 1;
        const entry = _history[newIndex];
        set({
          nodes: JSON.parse(JSON.stringify(entry.nodes)),
          edges: JSON.parse(JSON.stringify(entry.edges)),
          _historyIndex: newIndex,
          lastSaved: Date.now(),
        });
        persistState(get());
      }
    },

    canUndo: () => get()._historyIndex > 0,
    canRedo: () => get()._historyIndex < get()._history.length - 1,

    // Theme
    toggleTheme: () => {
      set((state) => {
        const newTheme = !state.isDarkMode;
        persistState({ ...state, isDarkMode: newTheme });
        return { isDarkMode: newTheme };
      });
    },

    setTheme: (isDark) => {
      set({ isDarkMode: isDark });
      persistState({ ...get(), isDarkMode: isDark });
    },

    // Onboarding
    completeOnboarding: () => {
      set({ hasOnboarded: true });
      persistState({ ...get(), hasOnboarded: true });
    },

    // Export/import
    exportPipeline: () => {
      const { nodes, edges } = get();
      return JSON.stringify(
        {
          nodes,
          edges,
          exportedAt: new Date().toISOString(),
          version: "1.0",
        },
        null,
        2
      );
    },

    importPipeline: (json) => {
      get()._flushHistoryDebounce();
      const parsed = JSON.parse(json);
      set({
        nodes: parsed.nodes || [],
        edges: parsed.edges || [],
        selectedNodeId: null,
        lastSaved: Date.now(),
        cycleNodes: [],
        nodeExecutionStates: {},
      });
      persistState(get());
      get()._saveToHistory();
    },

    resetPipeline: () => {
      get()._flushHistoryDebounce();
      set({ nodes: [], edges: [], selectedNodeId: null, lastSaved: Date.now(), cycleNodes: [], nodeExecutionStates: {} });
      persistState({ ...get(), nodes: [], edges: [] });
      get()._saveToHistory();
    },

    setCycleNodes: (nodeIds) => {
      set({ cycleNodes: nodeIds });
    },

    setNodeExecutionState: (nodeId, state) => {
      set((prev) => ({
        nodeExecutionStates: {
          ...prev.nodeExecutionStates,
          [nodeId]: state,
        },
      }));
    },

    clearExecutionStates: () => {
      set({ nodeExecutionStates: {} });
    },

    // Getters
    getSelectedNode: () => {
      const { nodes, selectedNodeId } = get();
      return nodes.find((n) => n.id === selectedNodeId);
    },
  };
});
