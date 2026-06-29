import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('App error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="loading-page">
          <h2>Something went wrong</h2>
          <p>Please refresh the page to try again.</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
