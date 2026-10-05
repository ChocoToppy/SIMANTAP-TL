import React from 'react';

// Menahan error render satu bagian halaman supaya tidak menghapus seluruh aplikasi
// (layar kosong) — menampilkan pesan errornya agar mudah dilaporkan.
export class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary:', error, info && info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="login-err" style={{ margin: '12px 0' }}>
        <strong>Bagian ini gagal ditampilkan.</strong>
        <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: '0.8rem' }}>{String(this.state.error && (this.state.error.stack || this.state.error.message || this.state.error))}</div>
        <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => this.setState({ error: null })}>Coba lagi</button>
      </div>
    );
  }
}
