/** OnboardingTutorial — First-time guided tour */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, MousePointer, GitBranch, Zap, Rocket } from "lucide-react";

interface OnboardingTutorialProps {
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Welcome to VectorShift",
    description: "A visual pipeline builder for AI workflows. Let's take a quick tour of the key features.",
    icon: <Rocket size={32} className="text-blue-500" />,
  },
  {
    title: "Create Nodes",
    description: "Drag node types from the toolbar onto the canvas, or click to add them at a default position.",
    icon: <MousePointer size={32} className="text-purple-500" />,
  },
  {
    title: "Connect Nodes",
    description: "Drag from an output handle (right side) to an input handle (left side) to connect nodes.",
    icon: <GitBranch size={32} className="text-green-500" />,
  },
  {
    title: "Submit Pipeline",
    description: "Click 'Validate Pipeline' to send your workflow to the backend for DAG validation.",
    icon: <Zap size={32} className="text-orange-500" />,
  },
];

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6">
              <div className="flex items-center gap-1">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === step
                        ? "w-6 bg-blue-500"
                        : i < step
                        ? "w-2 bg-blue-300"
                        : "w-2 bg-gray-200 dark:bg-slate-600"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-8 text-center">
              <motion.div
                key={step}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-slate-700 flex items-center justify-center mb-4">
                  {STEPS[step].icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {STEPS[step].title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {STEPS[step].description}
                </p>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 pb-6">
              <button
                onClick={handlePrev}
                disabled={step === 0}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-900 dark:hover:bg-zinc-100 transition-all duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] active:scale-95 shadow-sm"
              >
                {step === STEPS.length - 1 ? "Get Started" : "Next"}
                {step < STEPS.length - 1 && <ChevronRight size={16} />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingTutorial;
