/** App — Main layout: toolbar + canvas + sidebar */

import React, { useState, useEffect, useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { AnimatePresence } from "framer-motion";
import { usePipelineStore } from "@/store/pipelineStore";
import Toolbar from "@/components/Toolbar";
import PipelineCanvas from "@/components/PipelineCanvas";
import PropertiesPanel from "@/components/PropertiesPanel";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import "./App.css";

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isDarkMode = usePipelineStore((s) => s.isDarkMode);
  const hasOnboarded = usePipelineStore((s) => s.hasOnboarded);
  const completeOnboarding = usePipelineStore((s) => s.completeOnboarding);

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const isTyping =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        activeTag === "SELECT" ||
        document.activeElement?.getAttribute("contenteditable") === "true";

      // 1. Global escape handler (works even when typing)
      if (e.key === "Escape") {
        setShowShortcuts(false);
        return;
      }

      // 2. Export and Search handlers (global for convenience)
      // Ctrl/Cmd + S: Export
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const json = usePipelineStore.getState().exportPipeline();
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pipeline-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // Ctrl/Cmd + K: Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      // Ctrl/Cmd + Z: Undo canvas/text action (works even when typing!)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        usePipelineStore.getState().undo();
        return;
      }
      // Ctrl/Cmd + Shift + Z / Ctrl + Y: Redo canvas/text action (works even when typing!)
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        usePipelineStore.getState().redo();
        return;
      }

      // 3. Shortcuts that must be disabled when typing to protect native browser inputs
      if (isTyping) {
        return;
      }

      // D: Toggle theme
      if (e.key.toLowerCase() === "d" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        usePipelineStore.getState().toggleTheme();
        return;
      }
      // ?: Show shortcuts
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        setShowShortcuts((prev) => !prev);
        return;
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-200">
      {/* Toolbar */}
      <Toolbar
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        onHelpClick={() => setShowShortcuts(true)}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <ReactFlowProvider>
          <PipelineCanvas />
        </ReactFlowProvider>

        {/* Properties panel */}
        <AnimatePresence mode="wait">
          <PropertiesPanel key="properties" />
        </AnimatePresence>
      </div>

      {/* Onboarding tutorial */}
      <AnimatePresence>
        {!hasOnboarded && <OnboardingTutorial onComplete={completeOnboarding} />}
      </AnimatePresence>

      {/* Keyboard shortcuts modal */}
      <AnimatePresence>
        {showShortcuts && (
          <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
