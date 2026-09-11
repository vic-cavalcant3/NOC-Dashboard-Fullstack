// src/config/seed.js
const db = require('./database');

const categorias = [
  { tipo: "Ônibus", modelo: "🚌" }, { tipo: "Caminhão", modelo: "🚚" },
  { tipo: "Moto", modelo: "🏍" }, { tipo: "Carro", modelo: "🚗" },
  { tipo: "Caminhonete", modelo: "🛻" }, { tipo: "Van", modelo: "🚐" },
  { tipo: "SUV", modelo: "🚙" }, { tipo: "Esportivo", modelo: "🏎" },
  { tipo: "Trator", modelo: "🚜" }, { tipo: "Ambulância", modelo: "🚑" }
];

// Função para gerar coordenadas espalhadas pelo território nacional
function gerarCoordenada(base, variancia) {
  return (base + (Math.random() * variancia - variancia / 2)).toFixed(4);
}

console.log("Iniciando geração de carga de Big Data. Aguarde...");

// Transação em lote (alta performance) — node:sqlite é síncrono
db.exec("BEGIN TRANSACTION");
const stmt = db.prepare(`INSERT OR REPLACE INTO frota (id, modelo, tipo, vel, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)`);

let count = 1;
const volumePorCategoria = 10000; // 10.000 veículos por categoria = 100.000 no total

categorias.forEach(cat => {
  for (let i = 0; i < volumePorCategoria; i++) {
    const id = `V-${count.toString().padStart(6, '0')}`;
    const vel = Math.floor(Math.random() * 120).toString();
    const lat = gerarCoordenada(-14.23, 30); // Base: Centro do Brasil
    const lng = gerarCoordenada(-51.92, 30);
    stmt.run(id, cat.modelo, cat.tipo, vel, lat, lng);
    count++;
  }
});

db.exec("COMMIT");
console.log(`Sucesso! ${count - 1} veículos foram inseridos no banco de dados.`);
db.close();
