import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  tabName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TabErrorBoundary extends React.Component<Props, State> {
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
    console.error(`[TabErrorBoundary] Caught exception in ${this.props.tabName || 'module'}:`, error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('primepipfx_tv_chart_full_state_v2');
    } catch {}
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-8 mx-auto max-w-2xl bg-[#0B0F19] border border-amber-500/40 rounded-2xl text-center shadow-2xl space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-wide uppercase font-military">
            {this.props.tabName || 'TradingView Terminal'} Notice
          </h3>
          <p className="text-xs text-slate-400 font-mono-code max-w-md mx-auto">
            {this.state.error?.message || 'An unexpected rendering error occurred. You can restore default state and reload the workspace.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono-code transition cursor-pointer shadow-lg active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset & Reload Terminal</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
