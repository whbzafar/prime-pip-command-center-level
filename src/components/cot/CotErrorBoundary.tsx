import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CotErrorBoundary extends React.Component<Props, State> {
  declare state: State;
  declare props: Props;
  declare setState: (update: Partial<State> | ((prev: State) => Partial<State>)) => void;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[COT ErrorBoundary] Caught exception in COT module:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 mx-auto max-w-2xl bg-slate-900/90 border border-red-500/40 rounded-2xl text-center shadow-2xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">CFTC COT Module Encountered an Issue</h3>
          <p className="text-xs text-slate-400 mb-4 font-mono-code">
            {this.state.error?.message || 'An unexpected rendering error occurred while computing commitments data.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono-code transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry COT Module</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
