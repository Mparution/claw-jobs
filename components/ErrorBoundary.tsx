'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary for catching React component errors
 * Prevents entire page crashes from individual component failures
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      // Could send to Sentry, LogRocket, etc.
    }
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-4">
            We encountered an error loading this content.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Simple loading fallback component
 */
export function LoadingFallback({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="p-6 text-center">
      <div className="animate-spin text-4xl mb-4">⚡</div>
      <p className="text-gray-600">{message}</p>
    </div>
  );
}

/**
 * Error fallback for async data fetching
 */
export function DataErrorFallback({ 
  message = 'Failed to load data',
  onRetry 
}: { 
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
      <div className="text-4xl mb-4">📡</div>
      <p className="text-yellow-800 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorBoundary;
