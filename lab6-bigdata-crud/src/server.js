// src/server.js
const express = require('express');
const cors = require('cors');
const frotaRoutes = require('./routes/frotaRoutes');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/api/frota', frotaRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor operando em http://localhost:${PORT}`);
});
