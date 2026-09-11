// src/repositories/frotaRepository.js
const db = require('../config/database');

class FrotaRepository {
  // READ com limite de segurança para proteger a interface gráfica
  async listarTodos(limite = 500) {
    return db.prepare(`SELECT * FROM frota ORDER BY RANDOM() LIMIT ?`).all(limite);
  }

  async buscarPorId(id) {
    return db.prepare(`SELECT * FROM frota WHERE id = ?`).get(id);
  }

  async criar(veiculo) {
    const { id, modelo, tipo, vel, latitude, longitude } = veiculo;
    const query = `INSERT INTO frota (id, modelo, tipo, vel, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)`;
    db.prepare(query).run(id, modelo, tipo, vel, latitude, longitude);
    return { id, modelo, tipo, vel, latitude, longitude };
  }

  async atualizar(id, dados) {
    const { vel, latitude, longitude } = dados;
    const query = `UPDATE frota SET vel = ?, latitude = ?, longitude = ?, ultima_atualizacao = CURRENT_TIMESTAMP WHERE id = ?`;
    const info = db.prepare(query).run(vel, latitude, longitude, id);
    return info.changes;
  }

  async deletar(id) {
    const info = db.prepare(`DELETE FROM frota WHERE id = ?`).run(id);
    return info.changes;
  }
}

module.exports = new FrotaRepository();
