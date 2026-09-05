// backend/server.js
import express from 'express';
import cors from 'cors';
import { DatabaseSync } from 'node:sqlite';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json()); // Permite ler o Payload (body) das requisições

const db = new DatabaseSync('./backend/noc_database.sqlite');

// Endpoint de Leitura (GET)
app.get('/api/dados', (req, res) => {
  try {
    const infraestrutura = db.prepare("SELECT * FROM infraestrutura WHERE id > 0").all();
    const noc = db.prepare("SELECT latitude, longitude FROM infraestrutura WHERE id = 0").get() || {};
    const frota = db.prepare("SELECT * FROM frota").all();
    res.json({ infraestrutura, frota, noc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint de Recebimento de Telemetria (Rastreadores enviam para cá)
app.put('/api/telemetria/:id', (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, vel } = req.body;
  try {
    const stmt = db.prepare(`
      UPDATE frota
      SET latitude = ?, longitude = ?, vel = ?, ultima_atualizacao = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const info = stmt.run(latitude, longitude, vel, id);
    res.json({ message: "Coordenadas do veículo atualizadas no SQL!", linhasAfetadas: info.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => console.log(`API do NOC rodando na porta ${port}`));
