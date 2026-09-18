// src/components/MonitoramentoFrota.jsx
import React, { useState, useEffect, useRef } from 'react';

const CATEGORIAS = ["Ônibus", "Caminhão", "Moto", "Carro", "Caminhonete", "Van", "SUV", "Esportivo", "Trator", "Ambulância"];

function linkDaCategoria(categoria) {
  if (categoria === "Carro" || categoria === "Caminhonete") return 1;
  if (categoria === "Caminhão") return 2;
  if (categoria === "Ônibus") return 4;
  if (categoria === "Moto") return 5;
  return 3; // Van, SUV, Esportivo, Trator, Ambulância -> OSPF
}

const NOMES_LINK = {
  1: "Link VSAT (Hub Principal)",
  2: "Link VSAT (BGAN Backup)",
  3: "Roteamento OSPF",
  4: "Sessão BGP",
  5: "Link LTE-Móvel",
};

const ENDPOINTS_SIMULADOS = [
  ['GET', '/api/dados'],
  ['GET', '/api/frota'],
  ['POST', '/api/frota/analytics/speed-cluster'],
  ['PUT', '/api/frota/V-{id}'],
  ['GET', '/api/frota/V-{id}'],
];

function idAleatorio() {
  return String(Math.floor(Math.random() * 100000)).padStart(6, '0');
}

export function MonitoramentoFrota({ infraestrutura, frota, statusLinks, toggleLink }) {
  const [hora, setHora] = useState(new Date());
  const [logs, setLogs] = useState([]);
  const [incidentes, setIncidentes] = useState([
    { tipo: 'INFO', texto: 'Painel de monitoramento inicializado — todos os links checados.' }
  ]);
  const [historico, setHistorico] = useState([]); // % online ao longo do tempo, pro sparkline
  const prevStatusRef = useRef(statusLinks);
  const logIdRef = useRef(0);
  const incIdRef = useRef(1);

  const totalLinks = Object.keys(statusLinks).length;
  const linksOnline = Object.values(statusLinks).filter(Boolean).length;
  const percentOnline = Math.round((linksOnline / totalLinks) * 100);
  const sistemaOperacional = linksOnline === totalLinks;
  const veiculosRastreados = 100000; // total simulado do dataset de Big Data (Lab 6: 10 categorias x 10.000)
  const veiculosOnline = Math.round(veiculosRastreados * (percentOnline / 100));

  // Relógio ao vivo
  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Histórico do gráfico de uptime
  useEffect(() => {
    setHistorico(prev => [...prev, percentOnline].slice(-24));
  }, [percentOnline]);

  // Log de tráfego simulado (visual, ilustra o volume de chamadas da API)
  useEffect(() => {
    const t = setInterval(() => {
      const [metodo, caminho] = ENDPOINTS_SIMULADOS[Math.floor(Math.random() * ENDPOINTS_SIMULADOS.length)];
      const linha = {
        id: logIdRef.current++,
        hora: new Date().toLocaleTimeString(),
        metodo,
        caminho: caminho.replace('{id}', idAleatorio()),
        ms: Math.floor(Math.random() * 40) + 3,
      };
      setLogs(prev => [linha, ...prev].slice(0, 40));
    }, 1400);
    return () => clearInterval(t);
  }, []);

  // Gera incidentes reais quando um link muda de estado
  useEffect(() => {
    const anterior = prevStatusRef.current;
    Object.keys(statusLinks).forEach(id => {
      if (anterior[id] !== statusLinks[id]) {
        const nome = NOMES_LINK[id];
        if (!statusLinks[id]) {
          setIncidentes(prev => [{ id: incIdRef.current++, tipo: 'CRITICAL', texto: `Queda simulada: ${nome} (Link #${id}) perdeu conexão.` }, ...prev].slice(0, 20));
        } else {
          setIncidentes(prev => [{ id: incIdRef.current++, tipo: 'INFO', texto: `Restauração: ${nome} (Link #${id}) voltou a operar normalmente.` }, ...prev].slice(0, 20));
        }
      }
    });
    prevStatusRef.current = statusLinks;
  }, [statusLinks]);

  function derrubarLink(id) {
    if (statusLinks[id]) toggleLink(id);
  }
  function restaurarTodos() {
    Object.keys(statusLinks).forEach(id => {
      if (!statusLinks[id]) toggleLink(id);
    });
  }

  return (
    <div className="container-fluid px-4 mt-4">

      {/* Cabeçalho */}
      <div className="d-flex flex-wrap justify-content-between align-items-center border-bottom border-secondary pb-3 mb-4">
        <div className="d-flex align-items-center gap-2">
          <span style={{
            width: '14px', height: '14px', borderRadius: '50%', display: 'inline-block',
            background: sistemaOperacional ? '#28a745' : '#ffc107',
            boxShadow: sistemaOperacional ? '0 0 10px #28a745' : '0 0 10px #ffc107',
          }}></span>
          <h4 className="fw-light text-info m-0">
            NOC COMMAND CENTER <span className="text-secondary">|</span> <span className="fw-bold text-white">Monitoramento de Frota</span>
          </h4>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-transparent border border-info text-info px-3 py-2">
            🚚 {veiculosRastreados.toLocaleString('pt-BR')} veículos rastreados
          </span>
          <span className={`badge px-3 py-2 ${sistemaOperacional ? 'bg-success' : 'bg-warning text-dark'}`}>
            {sistemaOperacional ? 'SISTEMA OPERACIONAL (100%)' : 'DEGRADADO / CONTINGÊNCIA'}
          </span>
          <span className="badge bg-dark border border-secondary text-secondary px-3 py-2 font-monospace">
            {hora.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Controles de simulação */}
      <div className="card glass-card mb-4">
        <div className="card-body">
          <div className="small text-secondary mb-2">CONTROLE DE SIMULAÇÃO — dispare falhas para demonstrar resiliência</div>
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-sm btn-outline-danger" onClick={() => derrubarLink(3)}>Derrubar Core OSPF (Link 3)</button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => derrubarLink(1)}>Derrubar VSAT Principal (Link 1)</button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => derrubarLink(2)}>Derrubar VSAT BGAN (Link 2)</button>
            <button className="btn btn-sm btn-success ms-auto" onClick={restaurarTodos}>Restaurar Todos (100%)</button>
          </div>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="row mb-4">
        <div className="col-6 col-lg-3 mb-3">
          <div className="card glass-card h-100"><div className="card-body">
            <div className="small text-secondary">VEÍCULOS RASTREADOS</div>
            <div className="fs-3 fw-bold text-info">{veiculosRastreados.toLocaleString('pt-BR')}</div>
            <div className="small text-secondary">10 categorias integradas</div>
          </div></div>
        </div>
        <div className="col-6 col-lg-3 mb-3">
          <div className="card glass-card h-100"><div className="card-body">
            <div className="small text-secondary">VEÍCULOS ONLINE</div>
            <div className="fs-3 fw-bold text-success">{veiculosOnline.toLocaleString('pt-BR')}</div>
            <div className="small text-secondary">{percentOnline}% da frota com telemetria ativa</div>
          </div></div>
        </div>
        <div className="col-6 col-lg-3 mb-3">
          <div className="card glass-card h-100"><div className="card-body">
            <div className="small text-secondary">LINKS DE TELECOM</div>
            <div className="fs-3 fw-bold text-info">{linksOnline} / {totalLinks}</div>
            <div className="small text-secondary">{totalLinks - linksOnline} link(s) em queda</div>
          </div></div>
        </div>
        <div className="col-6 col-lg-3 mb-3">
          <div className="card glass-card h-100"><div className="card-body">
            <div className="small text-secondary">ALERTAS DE FROTA</div>
            <div className="fs-3 fw-bold text-danger">{incidentes.filter(i => i.tipo === 'CRITICAL').length}</div>
            <div className="small text-secondary">críticos registrados na sessão</div>
          </div></div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="row mb-4">
        <div className="col-12 col-lg-6 mb-3">
          <div className="card glass-card h-100"><div className="card-body">
            <div className="small text-secondary mb-2">TENDÊNCIA DE DISPONIBILIDADE (%)</div>
            <svg viewBox="0 0 300 80" width="100%" height="80">
              <polyline
                fill="none" stroke="#0dcaf0" strokeWidth="2"
                points={historico.map((v, i) => `${(i / Math.max(historico.length - 1, 1)) * 300},${80 - (v / 100) * 70}`).join(' ')}
              />
            </svg>
          </div></div>
        </div>
        <div className="col-12 col-lg-6 mb-3">
          <div className="card glass-card h-100"><div className="card-body">
            <div className="small text-secondary mb-2">DISTRIBUIÇÃO POR CATEGORIA (10.000 cada — seed Lab 6)</div>
            <div className="d-flex align-items-end gap-2" style={{ height: '80px' }}>
              {CATEGORIAS.map(cat => {
                const online = statusLinks[linkDaCategoria(cat)];
                return (
                  <div key={cat} title={cat} style={{
                    flex: 1, height: online ? '100%' : '15%',
                    background: online ? '#0dcaf0' : '#dc3545',
                    borderRadius: '3px 3px 0 0', transition: 'height .3s',
                  }}></div>
                );
              })}
            </div>
            <div className="d-flex gap-2 mt-1">
              {CATEGORIAS.map(cat => (
                <div key={cat} style={{ flex: 1, fontSize: '0.55rem' }} className="text-secondary text-center">{cat.slice(0, 3)}</div>
              ))}
            </div>
          </div></div>
        </div>
      </div>

      {/* Log + Incidentes */}
      <div className="row">
        <div className="col-12 col-lg-6 mb-4">
          <div className="card glass-card h-100"><div className="card-body">
            <div className="small text-secondary mb-2">🖥️ LOGS DE SISTEMA (tráfego simulado)</div>
            <div style={{ background: '#05080c', borderRadius: '8px', padding: '10px', fontFamily: 'Consolas, monospace', fontSize: '0.72rem', height: '260px', overflowY: 'auto' }}>
              {logs.map(l => (
                <div key={l.id} style={{ color: '#7dffb0', marginBottom: '3px' }}>
                  [{l.hora}] <span style={{ color: '#0dcaf0' }}>{l.metodo}</span> {l.caminho} → 200 ({l.ms}ms)
                </div>
              ))}
            </div>
          </div></div>
        </div>
        <div className="col-12 col-lg-6 mb-4">
          <div className="card glass-card h-100"><div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="small text-secondary">INCIDENTES RECENTES DE FROTA</div>
              <span className="badge bg-danger">{incidentes.length} registrados</span>
            </div>
            <div style={{ height: '260px', overflowY: 'auto' }}>
              {incidentes.map(inc => (
                <div key={inc.id} className="d-flex gap-2 mb-2 pb-2 border-bottom border-secondary">
                  <span className={`badge ${inc.tipo === 'CRITICAL' ? 'bg-danger' : inc.tipo === 'WARNING' ? 'bg-warning text-dark' : 'bg-info text-dark'}`} style={{ height: 'fit-content' }}>
                    {inc.tipo}
                  </span>
                  <span className="small text-secondary">{inc.texto}</span>
                </div>
              ))}
            </div>
          </div></div>
        </div>
      </div>
    </div>
  );
}
