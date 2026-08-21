import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    const msg = error?.message || error?.toString() || '';

    // If it's a dynamic module import failure (from a new build deployment), auto-reload to get the latest chunk
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Importing a module script failed')
    ) {
      const hasReloaded = sessionStorage.getItem('chunk_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload', 'true');
        window.location.reload();
        return { hasError: false, error: null };
      }
    }

    // If it's a Suspense promise or transition suspension, let Suspense handle it
    if (error && typeof error.then === 'function') {
      return { hasError: false, error: null };
    }
    if (msg.includes('suspended while responding to synchronous input')) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidMount() {
    sessionStorage.removeItem('chunk_reload');
  }

  componentDidCatch(error, errorInfo) {
    const msg = error?.message || error?.toString() || '';
    if (!msg.includes('suspended while responding to synchronous input')) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '24px' }}>
          <div className="clay-card card-animate" style={{ maxWidth: '560px', width: '100%', borderLeft: '4px solid var(--danger)', padding: '32px' }}>
            <h2 style={{ fontFamily: "'Baloo 2', sans-serif", color: 'var(--danger)', margin: '0 0 8px', fontSize: '24px' }}>
              Control Center Notice
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-soft)', marginBottom: '16px', lineHeight: 1.5 }}>
              An unexpected render error occurred while loading this view.
            </p>
            <pre style={{ background: 'var(--danger-light)', border: '1px solid rgba(198,86,75,0.25)', padding: '12px 16px', borderRadius: 'var(--radius-inner)', fontSize: '12px', color: 'var(--danger)', overflowX: 'auto', marginBottom: '20px', fontFamily: 'monospace' }}>
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
              className="clay-button-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Reload Control Center Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
