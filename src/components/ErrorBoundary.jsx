import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unexpected render error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-white p-8 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DB2777]/10 text-[#BE185D]">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <h1 className="mt-4 font-heading text-xl font-bold tracking-tight">Something went wrong</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
            This screen hit an unexpected error. Nothing was lost — reload to pick up where you left
            off.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reload
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }
}