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
        console.error("Uncaught application error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    textAlign: 'center'
                }}>
                    <div style={{
                        maxWidth: '480px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px',
                        padding: '32px',
                        backdropFilter: 'blur(16px)'
                    }}>
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Something went wrong</h2>
                        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
                            {this.state.error?.message || 'An unexpected error occurred during startup.'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '10px 24px',
                                background: '#6366f1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '600',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
