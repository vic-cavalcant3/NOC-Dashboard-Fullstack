// src/config/database.js
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../noc_bigdata.sqlite');
const db = new DatabaseSync(dbPath);
console.log('Conexão estabelecida com o SQLite.');

// Criação da tabela otimizada
db.exec(`CREATE TABLE IF NOT EXISTS frota (
  id TEXT PRIMARY KEY,
  modelo TEXT,
  tipo TEXT,
  vel TEXT,
  latitude TEXT,
  longitude TEXT,
  ultima_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

module.exports = db;
