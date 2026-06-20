/** Toolbar — Node type buttons with drag-to-create */

import React, { useCallback } from "react";
import {
  FileInput,
  Monitor,
  Brain,
  Type,
  Shuffle,
  Merge,
  Filter,
  Globe,
  Clock,
  Search,
  Moon,
  Sun,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NODE_CONFIGS, NodeType } from "@/types/node.types";
import { usePipelineStore } from "@/store/pipelineStore";

const NODE_ICONS: Record<string, React.ReactNode> = {
  input: <FileInput size={16} />,
  output: <Monitor size={16} />,
  llm: <Brain size={16} />,
  text: <Type size={16} />,
  transform: <Shuffle size={16} />,
  merge: <Merge size={16} />,
  filter: <Filter size={16} />,
  api: <Globe size={16} />,
  delay: <Clock size={16} />,
};

const NODE_ORDER: string[] = [
  "input",
  "output",
  "llm",
  "text",
  "transform",
  "merge",
  "filter",
  "api",
  "delay",
];

interface ToolbarProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  onHelpClick?: () => void;
  isSearchOpen: boolean;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onSearch,
  searchQuery,
  onHelpClick,
  isSearchOpen,
  setIsSearchOpen,
}) => {
  const { isDarkMode, toggleTheme } = usePipelineStore();
  const addNode = usePipelineStore((s) => s.addNode);

  const handleDragStart = useCallback(
    (event: React.DragEvent, nodeType: string) => {
      event.dataTransfer.setData("application/reactflow", nodeType);
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleClick = useCallback(
    (nodeType: string) => {
      const x = 300 + Math.random() * 100;
      const y = 200 + Math.random() * 100;
      addNode(nodeType as NodeType, { x, y });
    },
    [addNode]
  );

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-gray-200/50 dark:border-slate-800/80 shadow-sm sticky top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3">
        <div className="w-7 h-7 rounded-lg bg-zinc-950 dark:bg-white flex items-center justify-center border border-zinc-800 dark:border-zinc-200">
          <Merge size={15} className="text-white dark:text-zinc-950" />
        </div>
        <span className="text-sm font-bold text-zinc-950 dark:text-white hidden sm:inline tracking-tight">
          VectorShift
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200 dark:bg-slate-600 mr-1" />

      {/* Node palette */}
      <div className="flex items-center gap-1 flex-wrap">
        {NODE_ORDER.map((nodeType) => {
          const config = NODE_CONFIGS[nodeType as NodeType];
          const isMatch =
            !searchQuery ||
            config.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            config.description.toLowerCase().includes(searchQuery.toLowerCase());

          return (
            <motion.button
              key={nodeType}
              draggable
              onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, nodeType)}
              onClick={() => handleClick(nodeType)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                transition-all duration-150 cursor-grab active:cursor-grabbing
                border hover:shadow-sm
                ${
                  isMatch
                    ? "bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-600"
                    : "opacity-30 pointer-events-none"
                }
              `}
              title={`${config.label}: ${config.description}`}
            >
              <span style={{ color: config.color }}>{NODE_ICONS[nodeType]}</span>
              <span className="hidden md:inline">{config.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 180, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Filter nodes..."
              autoFocus
              className="w-full text-xs px-3 py-1.5 rounded-full border border-gray-200/80 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsSearchOpen(!isSearchOpen)}
        className={`p-2 rounded-lg transition-colors ${
          isSearchOpen
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
        }`}
        title="Search (Ctrl+K)"
      >
        <Search size={16} />
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        title="Toggle theme (D)"
      >
        {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Help */}
      <button
        onClick={onHelpClick}
        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        title="Keyboard shortcuts (?)"
      >
        <HelpCircle size={16} />
      </button>
    </div>
  );
};

export default Toolbar;
