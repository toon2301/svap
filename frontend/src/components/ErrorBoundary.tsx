'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  captureErrorDebugReport,
  clearErrorDebugData,
  formatErrorDebugReport,
  getErrorDebugReport,
  initializeErrorDebug,
  isErrorDebugEnabled,
  isErrorDebugOptInEnabled,
} from '@/utils/debug/errorDebug';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  debugCopyFeedback?: 'copied' | 'fallback' | null;
  errorDebugReportText?: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidMount() {
    initializeErrorDebug();
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    const debugReport = captureErrorDebugReport(error, errorInfo);

    this.setState({
      error,
      errorInfo,
      debugCopyFeedback: null,
      errorDebugReportText: formatErrorDebugReport(debugReport),
    });

    // Tu by sa mohol pridat error reporting service (napr. Sentry)
    // reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.children !== this.props.children && this.state.hasError) {
      clearErrorDebugData();
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        debugCopyFeedback: null,
        errorDebugReportText: undefined,
      });
    }
  }

  handleRetry = () => {
    clearErrorDebugData();
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      debugCopyFeedback: null,
      errorDebugReportText: undefined,
    });
  };

  handleGoHome = () => {
    clearErrorDebugData();
    window.location.href = '/';
  };

  handleCopyDebugDetails = async () => {
    const reportText =
      this.state.errorDebugReportText || formatErrorDebugReport(getErrorDebugReport());
    if (!reportText) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reportText);
        this.setState({ debugCopyFeedback: 'copied', errorDebugReportText: reportText });
        return;
      }
    } catch {
      // fall through to keep text visible for manual copy
    }

    this.setState({ debugCopyFeedback: 'fallback', errorDebugReportText: reportText });
  };

  renderDebugDetails() {
    const isOptInDebugEnabled = isErrorDebugOptInEnabled();
    const shouldShowDebugDetails =
      (process.env.NODE_ENV === 'development' && this.state.error) ||
      (isOptInDebugEnabled && Boolean(this.state.errorDebugReportText));

    if (!shouldShowDebugDetails || !this.state.error) {
      return null;
    }

    return (
      <details className="mb-6 text-left">
        <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
          {isOptInDebugEnabled
            ? 'Technicke detaily pre diagnostiku'
            : 'TechnickÃ© detaily (len pre vÃ½vojÃ¡rov)'}
        </summary>
        <div className="mt-2 rounded-lg bg-gray-100 p-4 text-xs font-mono text-gray-700 overflow-auto">
          {isOptInDebugEnabled && this.state.errorDebugReportText ? (
            <textarea
              readOnly
              value={this.state.errorDebugReportText}
              className="min-h-[14rem] w-full rounded-lg border border-gray-300 bg-white p-3 text-[11px] leading-5 text-gray-700"
              spellCheck={false}
            />
          ) : (
            <>
              <div className="mb-2">
                <strong>Error:</strong> {this.state.error.message}
              </div>
              <div className="mb-2">
                <strong>Stack:</strong>
                <pre className="mt-1 whitespace-pre-wrap">{this.state.error.stack}</pre>
              </div>
              {this.state.errorInfo ? (
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="mt-1 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              ) : null}
            </>
          )}
        </div>
      </details>
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isOptInDebugEnabled = isErrorDebugOptInEnabled();
      const debugCopyFeedback =
        this.state.debugCopyFeedback === 'copied'
          ? 'Technicke detaily skopirovane'
          : this.state.debugCopyFeedback === 'fallback'
            ? 'Technicke detaily si mozes skopirovat rucne nizsie'
            : null;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <motion.div
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </motion.div>

              <h2 className="mb-4 text-3xl font-bold text-gray-900">Oops! NieÄo sa pokazilo</h2>

              <p className="mb-6 text-gray-600">
                DoÅ¡lo k neoÄakÃ¡vanej chybe. SkÃºste obnoviÅ¥ strÃ¡nku alebo sa vrÃ¡Å¥te na
                hlavnÃº strÃ¡nku.
              </p>

              {this.renderDebugDetails()}

              {debugCopyFeedback ? (
                <p className="mb-4 text-sm text-gray-500">{debugCopyFeedback}</p>
              ) : null}

              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                {isOptInDebugEnabled && this.state.errorDebugReportText ? (
                  <motion.button
                    onClick={this.handleCopyDebugDetails}
                    className="rounded-lg bg-slate-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-800"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Kopirovat technicke detaily
                  </motion.button>
                ) : null}

                <motion.button
                  onClick={this.handleRetry}
                  className="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  SkÃºsiÅ¥ znovu
                </motion.button>

                <motion.button
                  onClick={this.handleGoHome}
                  className="rounded-lg bg-gray-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-700"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Domov
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
