/** KeyboardShortcutsModal — Show available keyboard shortcuts */

import React from "react";
import { motion } from "framer-motion";
import { X, Keyboard } from "lucide-react";

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { key: "Ctrl + Z", description: "Undo" },
  { key: "Ctrl + Shift + Z", description: "Redo" },
  { key: "Ctrl + S", description: "Export pipeline" },
  { key: "Ctrl + O", description: "Import pipeline" },
  { key: "Ctrl + K", description: "Search nodes" },
  { key: "Delete", description: "Delete selected node" },
  { key: "D", description: "Toggle dark mode" },
  { key: "?", description: "Show this help" },
  { key: "Esc", description: "Close modal / deselect" },
];

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-3">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {shortcut.description}
              </span>
              <kbd className="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-xs font-mono text-gray-700 dark:text-gray-300">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
            Press <kbd className="px-1 rounded bg-gray-200 dark:bg-slate-600 text-[10px]">?</kbd> to toggle this help
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default KeyboardShortcutsModal;
