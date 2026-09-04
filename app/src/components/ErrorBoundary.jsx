import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Captured by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '40px auto', background: '#fff', borderRadius: '16px', border: '1px solid #ffd1d1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#e53e3e', margin: '0 0 12px 0', fontSize: '18px', fontWeight: 'bold' }}>
            Ada Kendala Tampilan (Error Caught)
          </h2>
          <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.5' }}>
            {this.state.error && this.state.error.toString()}
          </p>
          <pre style={{ background: '#f7fafc', padding: '12px', borderRadius: '8px', fontSize: '11px', overflowX: 'auto', marginTop: '12px', color: '#718096' }}>
            {this.state.errorInfo?.componentStack || 'No stack available'}
          </pre>
          <div style={{ marginTop: '16px' }}>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{ background: '#6367FF', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              Reset Data Lokal & Muat Ulang
            </button>
            <button 
              onClick={() => window.location.reload()}
              style={{ marginLeft: '8px', background: '#edf2f7', color: '#2d3748', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              Muat Ulang Saja
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
