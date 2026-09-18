// src/components/ErrorBoundary.jsx
import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { comErro: false };
  }

  static getDerivedStateFromError() {
    return { comErro: true };
  }

  componentDidCatch(error, info) {
    console.error('Erro capturado pelo Error Boundary:', error, info);
  }

  render() {
    if (this.state.comErro) {
      return (
        <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-black text-info text-center px-3">
          <h3>⚠ Falha em um componente</h3>
          <p className="text-secondary">O resto do sistema continua no ar. Recarregue a página para tentar de novo.</p>
          <button className="btn btn-outline-info mt-2" onClick={() => window.location.reload()}>Recarregar</button>
        </div>
      );
    }
    return this.props.children;
  }
}
