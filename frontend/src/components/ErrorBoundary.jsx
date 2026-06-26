import { Component } from 'react';

/**
 * Catches render-time errors in any screen and shows a recoverable fallback
 * instead of white-screening the whole app. Resets when the route changes
 * (keyed by location in Layout).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ui] screen error:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-xl mx-auto px-6 py-20 text-center">
          <div className="font-display text-4xl tracking-tightest text-ash">Something went wrong on this screen</div>
          <p className="mt-3 text-sm text-graphite">An unexpected error occurred. You can retry or head back.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={() => this.setState({ error: null })} className="btn-primary text-sm">Retry</button>
            <a href="/" className="btn-secondary text-sm">Go home</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
