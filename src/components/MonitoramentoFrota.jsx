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

// Metadados de backhaul exibidos na seção de Conectividade & Links
const META_LINKS = [
  { id: 1, nome: "Link VSAT (Hub Principal)", alvo: "Satélite Star One D2", latenciaBase: 582, trafegoBase: 78 },
  { id: 2, nome: "Link VSAT (BGAN Backup)", alvo: "Satélite Inmarsat", latenciaBase: 851, trafegoBase: 12 },
  { id: 3, nome: "Roteamento OSPF", alvo: "Core Interno (10.0.0.1)", latenciaBase: 3, trafegoBase: 91 },
  { id: 4, nome: "Sessão BGP", alvo: "Operadora AS-1042", latenciaBase: 12, trafegoBase: 84 },
  { id: 5, nome: "Link LTE-Móvel", alvo: "APN Corporativa 4G", latenciaBase: 47, trafegoBase: 63 },
];

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
  const [historico, setHistorico] = useState([]);   // % online ao longo do tempo (sparkline)
  const [anomalias, setAnomalias] = useState(160);  // falhas de sinal pontuais na frota
  const [jitter, setJitter] = useState(0);          // variação de latência/tráfego dos links
  const prevStatusRef = useRef(statusLinks);
  const logIdRef = useRef(0);
  const incIdRef = useRef(1);

  const totalLinks = Object.keys(statusLinks).length;
  const linksOnline = Object.values(statusLinks).filter(Boolean).length;
  const linksEmQueda = totalLinks - linksOnline;
  const percentLinks = Math.round((linksOnline / totalLinks) * 100);
  const sistemaOperacional = linksEmQueda === 0;

  const veiculosRastreados = 100000; // dataset Big Data (Lab 6: 10 categorias x 10.000)
  const categoriasForaDoAr = CATEGORIAS.filter(cat => !statusLinks[linkDaCategoria(cat)]).length;
  const veiculosSemLink = categoriasForaDoAr * 10000;
  const alertasFrota = veiculosSemLink + anomalias;
  const veiculosOnline = veiculosRastreados - alertasFrota;
  const percentFrota = (veiculosOnline / veiculosRastreados) * 100;

  // Relógio ao vivo
  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Anomalias de sinal + jitter dos links
  useEffect(() => {
    const t = setInterval(() => {
      setAnomalias(Math.floor(Math.random() * 130) + 120); // 120 a 250
      setJitter(Math.floor(Math.random() * 21) - 10);      // -10 a +10
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // Histórico do gráfico de uptime
  useEffect(() => {
    setHistorico(prev => [...prev, percentLinks].slice(-24));
  }, [percentLinks]);

  // Log de tráfego simulado (ilustra o volume de chamadas da API)
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
  // Inverte o estado dos links ímpares (1, 3, 5) — falha em cascata alternada
  function alternarLinksAlternados() {
    [1, 3, 5].forEach(id => {
      if (statusLinks[id] !== undefined) toggleLink(id);
    });
  }

  const corTopo = { azul: '#0d6efd', verde: '#28a745', laranja: '#fd7e14', vermelho: '#dc3545' };

  return (
    <div className="container-fluid px-4 mt-4">

      {/* Cabeçalho */}
      <div className="d-flex flex-wrap justify-content-between align-items-start border-bottom border-secondary pb-3 mb-4">
        <div className="d-flex align-items-start gap-2">
          <span style={{
            width: '14px', height: '14px', borderRadius: '50%', display: 'inline-block', marginTop: '8px',
            background: sistemaOperacional ? '#28a745' : '#ffc107',
            boxShadow: sistemaOperacional ? '0 0 10px #28a745' : '0 0 10px #ffc107',
          }}></span>
          <div>
            <h4 className="fw-light text-info m-0" style={{ letterSpacing: '1px' }}>
              NOC COMMAND CENTER <span className="text-secondary">|</span> <span className="fw-bold text-white">MONITORAMENTO DE FROTA</span>
            </h4>
            <div className="text-secondary" style={{ fontSize: '0.7rem', letterSpacing: '2px', marginTop: '2px' }}>
              BIG DATA TELEMETRY CLUSTER &nbsp;•&nbsp; {sistemaOperacional ? 'ONLINE' : 'DEGRADADO'}
            </div>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="badge bg-transparent border border-info text-info px-3 py-2" style={{ letterSpacing: '1px' }}>
            🚚 {veiculosRastreados.toLocaleString('pt-BR')} VEÍCULOS RASTREADOS
          </span>
          <span className={`badge px-3 py-2 ${sistemaOperacional ? 'bg-success' : 'bg-warning text-dark'}`}>
            ● {sistemaOperacional ? 'SISTEMA OPERACIONAL (100%)' : `DEGRADADO / CONTINGÊNCIA (${percentLinks}%)`}
          </span>
          <div className="text-end">
            <div className="font-monospace text-white" style={{ fontSize: '1.1rem', letterSpacing: '1px' }}>
              {hora.toLocaleTimeString('pt-BR')} <span className="text-secondary">UTC-3</span>
            </div>
            <div className="text-secondary font-monospace" style={{ fontSize: '0.7rem' }}>
              {hora.toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      {/* Controles de simulação */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        <span className="small text-secondary me-2" style={{ letterSpacing: '1px' }}>
          CONTROLE DE SIMULAÇÃO: <span className="opacity-75">Dispare falhas em cascata para demonstração de resiliência</span>
        </span>
        <button className="btn btn-sm btn-outline-light fw-bold" onClick={alternarLinksAlternados}>
          Alternar Links Alternados
        </button>
        <button className="btn btn-sm btn-outline-danger" onClick={() => derrubarLink(3)}>
          Derrubar Core OSPF (Link 3)
        </button>
        <button className="btn btn-sm btn-outline-danger" onClick={() => derrubarLink(1)}>
          Derrubar VSAT D2 (Link 1)
        </button>
        <button className="btn btn-sm btn-success" onClick={restaurarTodos}>
          Restaurar Todos (100%)
        </button>
      </div>

      {/* Cards de métricas */}
      <div className="row mb-4">
        <div className="col-6 col-lg-3 mb-3">
          <div className="card glass-card h-100" style={{ borderTop: `3px solid ${corTopo.azul}` }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div className="small text-secondary" style={{ letterSpacing: '1px' }}>VEÍCULOS RASTREADOS</div>
                <span style={{ fontSize: '1.1rem' }}>🚚</span>
              </div>
              <div className="fw-bold text-white font-monospace" style={{ fontSize: '2rem', letterSpacing: '2px' }}>
                {veiculosRastreados.toLocaleString('pt-BR')}
              </div>
              <div className="small text-secondary">
                <span className="text-info fw-bold">10 categorias</span> integradas em tempo real
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3 mb-3">
          <div className="card glass-card h-100" style={{ borderTop: `3px solid ${corTopo.verde}` }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div className="small text-secondary" style={{ letterSpacing: '1px' }}>VEÍCULOS ONLINE</div>
                <span className={`badge ${percentFrota > 95 ? 'bg-success' : 'bg-warning text-dark'}`} style={{ fontSize: '0.6rem' }}>
                  {percentFrota > 95 ? 'STATUS SUCCESS' : 'STATUS DEGRADED'}
                </span>
              </div>
              <div className="fw-bold text-success font-monospace" style={{ fontSize: '2rem', letterSpacing: '2px' }}>
                {veiculosOnline.toLocaleString('pt-BR')}
              </div>
              <div className="small text-secondary">
                <span className="text-success fw-bold">{percentFrota.toFixed(1).replace('.', ',')}%</span> da frota com telemetria ativa
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3 mb-3">
          <div className="card glass-card h-100" style={{ borderTop: `3px solid ${corTopo.laranja}` }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div className="small text-secondary" style={{ letterSpacing: '1px' }}>LINKS DE<br />TELECOM</div>
                <span className="badge bg-transparent border border-secondary text-secondary" style={{ fontSize: '0.6rem' }}>
                  {linksOnline} ATIVOS / {linksEmQueda} FALHAS
                </span>
              </div>
              <div className={`fw-bold font-monospace ${linksEmQueda === 0 ? 'text-success' : 'text-warning'}`} style={{ fontSize: '2rem', letterSpacing: '2px' }}>
                {linksOnline} / {totalLinks}
              </div>
              <div className="small text-secondary">
                <span className="text-warning fw-bold">{linksEmQueda}</span> link(s) em contingência/queda
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3 mb-3">
          <div className="card glass-card h-100" style={{ borderTop: `3px solid ${corTopo.vermelho}` }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div className="small text-secondary" style={{ letterSpacing: '1px' }}>ALERTAS DE FROTA</div>
                <span className="badge bg-transparent border border-danger text-danger" style={{ fontSize: '0.6rem' }}>
                  {alertasFrota > 5000 ? 'CRÍTICO / MASSIVO' : 'CRÍTICO / ALTO'}
                </span>
              </div>
              <div className="fw-bold text-danger font-monospace" style={{ fontSize: '2rem', letterSpacing: '2px' }}>
                {alertasFrota.toLocaleString('pt-BR')}
              </div>
              <div className="small text-danger opacity-75">Falhas de sinal &amp; anomalias</div>
            </div>
          </div>
        </div>
      </div>

      {/* Monitoramento de Conectividade & Links */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="m-0 text-white d-flex align-items-center" style={{ letterSpacing: '1px' }}>
          <span style={{ display: 'inline-block', width: '4px', height: '22px', background: '#0dcaf0', marginRight: '12px', borderRadius: '2px' }}></span>
          📶 MONITORAMENTO DE CONECTIVIDADE &amp; LINKS
        </h5>
        <span className="text-secondary" style={{ fontSize: '0.7rem', letterSpacing: '2px' }}>TELEMETRY BACKHAUL STATUS</span>
      </div>

      <div className="row mb-4">
        {META_LINKS.filter(l => statusLinks[l.id] !== undefined).map(link => {
          const online = statusLinks[link.id];
          const latencia = Math.max(1, link.latenciaBase + jitter);
          const trafego = online ? Math.min(99, Math.max(1, link.trafegoBase + jitter)) : 0;
          const latAlta = latencia > 300;
          return (
            <div key={link.id} className="col-12 col-md-6 col-xl-3 mb-3">
              <div className="card glass-card h-100" style={{ borderLeft: `3px solid ${online ? '#0dcaf0' : '#dc3545'}` }}>
                <div className="card-body d-flex flex-column justify-content-between">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-secondary" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>LINK #{link.id}</span>
                        <span className="fw-bold text-white">{link.nome}</span>
                      </div>
                      <small className="text-secondary d-block mt-1">{link.alvo}</small>
                    </div>
                    <span className={`led-indicator ${online ? 'led-up' : 'led-down'}`} style={{ marginRight: 0 }}></span>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-secondary">Latência:</span>
                      <span className={`fw-bold font-monospace ${!online ? 'text-danger' : latAlta ? 'text-warning' : 'text-info'}`}>
                        {online ? `${latencia}ms` : 'TIMEOUT'}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span className="text-secondary">Tráfego Telemetria:</span>
                      <span className={`fw-bold font-monospace ${online ? 'text-info' : 'text-danger'}`}>{trafego}%</span>
                    </div>
                    <div className="progress-tech">
                      <div className="progress-tech-bar" style={{ width: `${trafego}%`, background: online ? '#0d6efd' : '#dc3545' }}></div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleLink(link.id)}
                    className={`btn btn-sm w-100 fw-bold ${online ? 'btn-outline-light' : 'btn-success'}`}
                  >
                    {online ? '🚫 Simular Queda' : '🔄 Restaurar Conexão'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
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