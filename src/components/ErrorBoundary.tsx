import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-gray-800 dark:text-gray-100 font-sans">
          <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-red-200/50 dark:border-red-900/30 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h3>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              An unexpected error occurred in the application. You can try resetting the state or reloading the page.
            </p>

            {this.state.error && (
              <div className="w-full text-left bg-red-50/50 dark:bg-red-950/10 p-4 rounded-2xl mb-6 border border-red-100/50 dark:border-red-950/20 max-h-32 overflow-auto font-mono text-[10px] text-red-600 dark:text-red-400">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-900 dark:hover:bg-zinc-100 text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer shadow-sm"
            >
              <RotateCcw size={14} />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
