// src/components/BancoDados.jsx
import React, { useState, useEffect } from 'react';

const API = `${import.meta.env.VITE_API_URL_CRUD || 'http://localhost:3000'}/api/frota`;

export function BancoDados() {
  const [veiculos, setVeiculos] = useState([]);
  const [logs, setLogs] = useState([]);
  const [erroConexao, setErroConexao] = useState(false);
  const [form, setForm] = useState({ id: '', modelo: '', tipo: 'Carro', vel: '', latitude: '', longitude: '' });
  const [editando, setEditando] = useState(null); // veículo sendo editado no modal
  const [editForm, setEditForm] = useState({ novoId: '', modelo: '', tipo: 'Carro', vel: '', latitude: '', longitude: '' });

  function addLog(msg, isErr = false) {
    const hora = new Date().toLocaleTimeString();
    setLogs(prev => [{ hora, msg, isErr }, ...prev].slice(0, 30));
  }

  async function carregarLista() {
    try {
      const res = await fetch(API);
      const dados = await res.json();
      addLog(`GET /api/frota → ${res.status} OK (${dados.length} lidos)`);
      setVeiculos(dados);
      setErroConexao(false);
    } catch (e) {
      addLog(`Falha ao conectar em ${API} — o servidor do Lab 6 está rodando (npm start)?`, true);
      setErroConexao(true);
    }
  }

  useEffect(() => { carregarLista(); }, []);

  function abrirEdicao(v) {
    setEditando(v);
    setEditForm({ novoId: v.id, modelo: v.modelo, tipo: v.tipo, vel: v.vel, latitude: v.latitude, longitude: v.longitude });
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    const v = editando;
    try {
      const res = await fetch(`${API}/${v.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const dados = await res.json();
      addLog(`PUT /api/frota/${v.id} → ${res.status} (${dados.mensagem || dados.erro})`, !res.ok);
      if (res.ok) {
        setEditando(null);
        carregarLista();
      }
    } catch (e) {
      addLog(`Erro no PUT de ${v.id}`, true);
    }
  }

  async function deletarVeiculo(id) {
    if (!window.confirm(`Apagar o veículo ${id}?`)) return;
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
      addLog(`DELETE /api/frota/${id} → ${res.status}`, !res.ok);
      carregarLista();
    } catch (e) {
      addLog(`Erro no DELETE de ${id}`, true);
    }
  }

  async function criarVeiculo(e) {
    e.preventDefault();
    if (!form.id || !form.tipo) {
      alert('ID e Tipo são obrigatórios.');
      return;
    }
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const dados = await res.json();
      addLog(`POST /api/frota → ${res.status} (id: ${dados.id || dados.erro})`, !res.ok);
      if (res.ok) {
        setForm({ id: '', modelo: '', tipo: 'Carro', vel: '', latitude: '', longitude: '' });
        carregarLista();
      }
    } catch (e) {
      addLog('Erro no POST', true);
    }
  }

  return (
    <div className="container-fluid px-4 mt-4">
      <h4 className="fw-light text-info border-bottom border-secondary pb-2 mb-4">
        💾 Banco de Dados <span className="fw-bold text-white">(CRUD - Lab 6)</span>
      </h4>

      {erroConexao && (
        <div className="alert alert-danger">
          Não foi possível conectar em <code>{API}</code>. Rode <code>npm start</code> dentro de <code>lab6-bigdata-crud</code> primeiro.
        </div>
      )}

      <div className="row">
        <div className="col-12 col-lg-8 mb-4">
          <div className="card glass-card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold text-info m-0">Frota ({veiculos.length} exibidos, amostra dos 100.000)</h6>
                <button className="btn btn-sm btn-outline-info" onClick={carregarLista}>🔄 Atualizar lista</button>
              </div>
              <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                <table className="table table-dark table-sm align-middle">
                  <thead>
                    <tr className="text-secondary">
                      <th>ID</th><th>Ícone</th><th>Categoria</th><th>Vel</th><th>GPS</th><th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {veiculos.map(v => (
                      <tr key={v.id}>
                        <td className="text-info">{v.id}</td>
                        <td>{v.modelo}</td>
                        <td>{v.tipo}</td>
                        <td>{v.vel}</td>
                        <td className="font-monospace text-warning">{v.latitude}, {v.longitude}</td>
                        <td>
                          <button className="btn btn-sm btn-warning fw-bold me-2" onClick={() => abrirEdicao(v)}>PUT</button>
                          <button className="btn btn-sm btn-danger fw-bold" onClick={() => deletarVeiculo(v.id)}>DEL</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card glass-card mb-4">
            <div className="card-body">
              <h6 className="fw-bold text-info mb-3">➕ Novo Veículo (POST)</h6>
              <form onSubmit={criarVeiculo}>
                <input className="form-control form-control-sm mb-2" placeholder="ID (ex: V-100001)"
                  value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} />
                <input className="form-control form-control-sm mb-2" placeholder="Emoji (ex: 🚗)"
                  value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} />
                <select className="form-select form-select-sm mb-2"
                  value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  {["Ônibus", "Caminhão", "Moto", "Carro", "Caminhonete", "Van", "SUV", "Esportivo", "Trator", "Ambulância"].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <input className="form-control form-control-sm mb-2" placeholder="Velocidade"
                  value={form.vel} onChange={e => setForm({ ...form, vel: e.target.value })} />
                <input className="form-control form-control-sm mb-2" placeholder="Latitude"
                  value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} />
                <input className="form-control form-control-sm mb-3" placeholder="Longitude"
                  value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} />
                <button type="submit" className="btn btn-success w-100 fw-bold">POST — Criar</button>
              </form>
            </div>
          </div>

          <div className="card glass-card">
            <div className="card-body">
              <h6 className="fw-bold text-info mb-3">🖥️ Log de Requisições</h6>
              <div style={{ background: '#05080c', borderRadius: '8px', padding: '10px', fontFamily: 'Consolas, monospace', fontSize: '0.75rem', height: '180px', overflowY: 'auto' }}>
                {logs.map((l, i) => (
                  <div key={i} style={{ color: l.isErr ? '#ff8080' : '#7dffb0', marginBottom: '3px' }}>
                    [{l.hora}] {l.msg}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {editando && (
        <div
          onClick={() => setEditando(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.65)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1050
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="card glass-card border-info"
            style={{ width: '360px' }}
          >
            <div className="card-body">
              <h6 className="fw-bold text-info mb-1">Editar {editando.id}</h6>
              <small className="text-secondary d-block mb-3">{editando.modelo} — {editando.tipo}</small>
              <form onSubmit={salvarEdicao}>
                <label className="form-label small text-secondary mb-0">ID</label>
                <input className="form-control form-control-sm mb-2" value={editForm.novoId}
                  onChange={e => setEditForm({ ...editForm, novoId: e.target.value })} />
                <label className="form-label small text-secondary mb-0">Emoji</label>
                <input className="form-control form-control-sm mb-2" value={editForm.modelo}
                  onChange={e => setEditForm({ ...editForm, modelo: e.target.value })} />
                <label className="form-label small text-secondary mb-0">Categoria</label>
                <select className="form-select form-select-sm mb-2" value={editForm.tipo}
                  onChange={e => setEditForm({ ...editForm, tipo: e.target.value })}>
                  {["Ônibus", "Caminhão", "Moto", "Carro", "Caminhonete", "Van", "SUV", "Esportivo", "Trator", "Ambulância"].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <label className="form-label small text-secondary mb-0">Velocidade</label>
                <input className="form-control form-control-sm mb-2" value={editForm.vel}
                  onChange={e => setEditForm({ ...editForm, vel: e.target.value })} />
                <label className="form-label small text-secondary mb-0">Latitude</label>
                <input className="form-control form-control-sm mb-2" value={editForm.latitude}
                  onChange={e => setEditForm({ ...editForm, latitude: e.target.value })} />
                <label className="form-label small text-secondary mb-0">Longitude</label>
                <input className="form-control form-control-sm mb-3" value={editForm.longitude}
                  onChange={e => setEditForm({ ...editForm, longitude: e.target.value })} />
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-warning fw-bold flex-fill">Salvar (PUT)</button>
                  <button type="button" className="btn btn-outline-light flex-fill" onClick={() => setEditando(null)}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
