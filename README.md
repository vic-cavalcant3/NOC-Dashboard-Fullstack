# 📡 NOC Dashboard – Command Center Full-Stack

Painel de monitoramento estilo NOC (Network Operations Center), simulando o controle de infraestrutura de rede e rastreamento de uma frota de 10 veículos em tempo real, com dados servidos por uma API REST própria conectada a um banco SQLite.

---

## 📚 Objetivo do Projeto

Evoluir um dashboard front-end simples para uma arquitetura profissional: migração de CDN para NPM, roteamento com React Router, segregação de componentes com Props, e depois a adição de uma camada Back-End (Node/Express) com banco de dados relacional (SQLite) consumido via fetch.

---

## 🗺️ Funcionalidades

* **Monitoramento de Conectividade** — 5 links de infraestrutura (VSAT, OSPF, BGP, LTE) com toggle de queda/restauração
* **Telemetria da Frota** — 10 categorias de veículos com velocidade, combustível e status de sinal
* **Falha em Cascata** — cada categoria de veículo depende de um link de infraestrutura específico; se o link cai, a frota fica offline
* **Rotas dinâmicas** — troca automática de tela a cada 5s via `useNavigate`, refletindo na URL
* **Geolocalização real** — cada veículo e a Base NOC apontam para o Google Maps com coordenadas vindas do banco
* **Telemetria via API** — endpoint `PUT` para simular rastreadores atualizando posição/velocidade em tempo real
* **Áudio sintetizado** — sirene gerada via Web Audio API quando a categoria Ambulância está ativa
* **Design responsivo** — grid Mobile-First com Bootstrap

---

## 🛠️ Tecnologias Utilizadas

* React + Vite
* React Router DOM
* Bootstrap 5
* Node.js + Express
* SQLite (`node:sqlite` nativo)
* Web Audio API

---

## 🌐 Como Rodar o Projeto

```bash
npm install
npm run migrate   # cria e popula o banco SQLite
npm run server    # sobe a API na porta 3000
npm run dev       # sobe o front-end na porta 5173 (em outro terminal)
```

> ⚠️ Os dois servidores (API e front-end) precisam estar rodando ao mesmo tempo.

---

## 🎓 Contexto Acadêmico

Projeto desenvolvido como atividade da disciplina de Fundamentos de Tecnologias Front-end (FFE), Laboratório 5 (Partes A, B e C).

---

## 🚀 Status do Projeto

🟢 Em andamento
