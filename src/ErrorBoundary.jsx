import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#0A0A0A', color: '#FF5722', padding: 24, fontFamily: 'monospace', minHeight: '100vh' }}>
          <h2>App Error</h2>
          <pre style={{ color: '#fff', whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
