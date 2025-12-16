import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-400 bg-[#1C1C1E] h-screen w-screen overflow-auto font-mono text-sm">
          <h1 className="text-xl font-bold mb-4 text-red-500">Something went wrong.</h1>
          <div className="mb-4 p-4 bg-black/30 rounded border border-red-900/50">
            <p className="font-bold">{this.state.error && this.state.error.toString()}</p>
          </div>
          <pre className="whitespace-pre-wrap text-xs opacity-70">
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button 
            onClick={() => {
                localStorage.removeItem('fiip-notes');
                localStorage.removeItem('fiip-settings');
                window.location.reload();
            }}
            className="mt-8 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Reset App Data (Fix Crash)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
