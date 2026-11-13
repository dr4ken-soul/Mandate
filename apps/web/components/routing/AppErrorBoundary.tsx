"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * The error boundary.
 *
 * It contains a runtime failure inside one view and never renders a stack
 * trace.
 */
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; code: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false, code: "" };
  }

  static getDerivedStateFromError(error: unknown): { failed: boolean; code: string } {
    const code =
      error instanceof Error && typeof error.message === "string"
        ? error.message.slice(0, 80)
        : "unknown";
    return { failed: true, code };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV !== "production") {
      console.error("Mandate console failure", error, info.componentStack);
    }
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="flex min-h-[60dvh] items-center justify-center bg-paper px-5">
        <div className="w-full max-w-[32rem] border border-rule-hair bg-paper p-6 lg:p-8">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-tertiary">
            Something failed in this view
          </p>
          <p className="mt-3 font-mono text-[0.8125rem] text-ink">{this.state.code}</p>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ failed: false, code: "" })}
              className="h-11 border border-rule-strong px-4 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ink transition-colors duration-[220ms] hover:bg-paper-band"
            >
              Retry
            </button>
            <a
              href="/"
              className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ink-tertiary transition-colors duration-[220ms] hover:text-ink"
            >
              Return to landing
            </a>
          </div>
        </div>
      </div>
    );
  }
}
