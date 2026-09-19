// src/components/MonitoramentoFrota.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';

const CATEGORIAS = ["Ônibus", "Caminhão", "Moto", "Carro", "Caminhonete", "Van", "SUV", "Esportivo", "Trator", "Ambulância"];

// Ícone e nível médio de combustível/bateria por grupo (mesmo seed visual do Lab 6)
const PERFIL_CATEGORIA = {
  "Ônibus": { icone: "🚌", energiaBase: 68 },
  "Caminhão": { icone: "🚚", energiaBase: 54 },
  "Moto": { icone: "🏍", energiaBase: 81 },
  "Carro": { icone: "🚗", energiaBase: 73 },
  "Caminhonete": { icone: "🛻", energiaBase: 62 },
  "Van": { icone: "🚐", energiaBase: 70 },
  "SUV": { icone: "🚙", energiaBase: 77 },
  "Esportivo": { icone: "🏎", energiaBase: 49 },
  "Trator": { icone: "🚜", energiaBase: 41 },
  "Ambulância": { icone: "🚑", energiaBase: 88 },
};

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

  // Velocidade média real por categoria, calculada em cima do dataset vindo do SQLite
  const mediasPorCategoria = useMemo(() => {
    const acumulador = {};
    CATEGORIAS.forEach(cat => { acumulador[cat] = { soma: 0, qtd: 0 }; });
    (frota || []).forEach(v => {
      if (acumulador[v.tipo]) {
        acumulador[v.tipo].soma += Number(v.vel) || 0;
        acumulador[v.tipo].qtd += 1;
      }
    });
    const resultado = {};
    CATEGORIAS.forEach(cat => {
      const { soma, qtd } = acumulador[cat];
      resultado[cat] = { velMedia: qtd ? Math.round(soma / qtd) : 0, total: qtd };
    });
    return resultado;
  }, [frota]);

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

      {/* Gráficos + Status por Categoria */}
      <div className="row mb-4">
        <div className="col-12 col-lg-4 mb-3">
          <div className="card glass-card h-100"><div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="small text-secondary" style={{ letterSpacing: '1px' }}>TENDÊNCIA DE DISPONIBILIDADE (%)</div>
              <span className={`fw-bold font-monospace ${percentLinks === 100 ? 'text-success' : 'text-warning'}`}>
                {percentLinks}%
              </span>
            </div>
            <svg viewBox="0 0 600 140" width="100%" style={{ height: 'auto', display: 'block' }}>
              <defs>
                <linearGradient id="gradDisponibilidade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0dcaf0" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0dcaf0" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grade + escala do eixo Y */}
              {[100, 75, 50, 25, 0].map(v => {
                const y = 118 - (v / 100) * 100;
                return (
                  <g key={v}>
                    <line x1="42" y1={y} x2="590" y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />
                    <text x="34" y={y + 4} textAnchor="end" fill="#6c757d" fontSize="11" fontFamily="monospace">{v}</text>
                  </g>
                );
              })}
              <line x1="42" y1="18" x2="42" y2="118" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

              {/* Série */}
              {(() => {
                const serie = historico.length >= 2 ? historico : [percentLinks, percentLinks];
                const px = i => 42 + (i / (serie.length - 1)) * 548;
                const py = v => 118 - (v / 100) * 100;
                const pontos = serie.map((v, i) => `${px(i)},${py(v)}`).join(' ');
                const cor = percentLinks === 100 ? '#0dcaf0' : '#ffc107';
                return (
                  <g>
                    <polygon points={`42,118 ${pontos} 590,118`} fill="url(#gradDisponibilidade)" />
                    <polyline points={pontos} fill="none" stroke={cor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                    <circle cx={px(serie.length - 1)} cy={py(serie[serie.length - 1])} r="4" fill={cor} />
                    <circle cx={px(serie.length - 1)} cy={py(serie[serie.length - 1])} r="8" fill={cor} opacity="0.25" />
                  </g>
                );
              })()}

              <text x="42" y="136" fill="#6c757d" fontSize="10" fontFamily="monospace">-24 ciclos</text>
              <text x="590" y="136" textAnchor="end" fill="#6c757d" fontSize="10" fontFamily="monospace">agora</text>
            </svg>
          </div></div>
        </div>
        <div className="col-12 col-lg-4 mb-3">
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

        {/* Status por Categoria — lista de 10 grupos com regra de dependência */}
        <div className="col-12 col-lg-4 mb-3">
          <div className="card glass-card h-100"><div className="card-body">
            <div className="text-center text-secondary mb-3" style={{ fontSize: '0.65rem', letterSpacing: '2px' }}>
              10 CATEGORIAS • REGRA DE DEPENDÊNCIA ATIVA
            </div>
            <div className="d-flex justify-content-between align-items-baseline mb-3">
              <h6 className="m-0 fw-bold text-white" style={{ letterSpacing: '1px' }}>STATUS POR CATEGORIA</h6>
              <span className="text-secondary" style={{ fontSize: '0.65rem' }}>10 Grupos Monitorados</span>
            </div>

            <div style={{ maxHeight: '340px', overflowY: 'auto', paddingRight: '6px' }}>
              {CATEGORIAS.map((cat, idx) => {
                const perfil = PERFIL_CATEGORIA[cat];
                const idLink = linkDaCategoria(cat);
                const sinalOk = statusLinks[idLink];
                const velMedia = Math.max(0, (mediasPorCategoria[cat]?.velMedia || 0) + Math.round(jitter / 2));
                const energia = Math.min(99, Math.max(5, perfil.energiaBase + jitter));
                const energiaBaixa = energia < 30;

                return (
                  <div
                    key={cat}
                    className="py-3"
                    style={{
                      borderBottom: idx < CATEGORIAS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                      opacity: sinalOk ? 1 : 0.6,
                    }}
                  >
                    {/* Linha 1: identificação + status do sinal */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: '1.3rem', filter: sinalOk ? 'none' : 'grayscale(100%)' }}>{perfil.icone}</span>
                        <span className="fw-bold text-white">{cat}</span>
                      </div>
                      <span
                        className={`badge bg-transparent border ${sinalOk ? 'border-success text-success' : 'border-danger text-danger'}`}
                        style={{ fontSize: '0.6rem', letterSpacing: '1px' }}
                      >
                        {sinalOk ? 'SINAL OK' : 'SEM SINAL'}
                      </span>
                    </div>

                    {/* Linha 2: métricas de telemetria */}
                    <div className="d-flex justify-content-between align-items-end">
                      <div>
                        <div className="text-secondary" style={{ fontSize: '0.6rem', letterSpacing: '1px' }}>VEL. MÉDIA</div>
                        <div className={`font-monospace fw-bold ${sinalOk ? 'text-info' : 'text-secondary'}`} style={{ fontSize: '1.3rem', lineHeight: 1.2 }}>
                          {sinalOk ? velMedia : '--'}
                          <span className="text-secondary fw-normal ms-1" style={{ fontSize: '0.7rem' }}>km/h</span>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="text-secondary" style={{ fontSize: '0.6rem', letterSpacing: '1px' }}>COMB./BAT. MÉDIO</div>
                        <div
                          className={`font-monospace fw-bold ${!sinalOk ? 'text-secondary' : energiaBaixa ? 'text-warning' : 'text-success'}`}
                          style={{ fontSize: '1.05rem', lineHeight: 1.4 }}
                        >
                          {sinalOk ? `${energia}%` : '--'}
                        </div>
                      </div>
                    </div>

                    {/* Linha 3: link do qual a categoria depende */}
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <span className="text-secondary" style={{ fontSize: '0.6rem' }}>Dependência</span>
                      <span className={`font-monospace ${sinalOk ? 'text-secondary' : 'text-danger'}`} style={{ fontSize: '0.65rem' }}>
                        Link #{idLink}
                      </span>
                    </div>
                  </div>
                );
              })}
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