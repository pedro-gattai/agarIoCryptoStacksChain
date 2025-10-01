# 🚀 Deployment Guide - AgarCoin Stacks

## Quick Start para Hackathon

### Pré-requisitos
```bash
# Instalar dependências
npm install -g @stacks/cli clarinet
node --version  # >= 18.0.0
```

### 1. Setup Local
```bash
# Clone e instale
git clone <repo-url>
cd agarcoin-stacks
npm install

# Configure environment
cp .env.example .env
# Edite .env com suas chaves
```

### 2. Database Setup
```bash
# Inicie PostgreSQL
# Configure DATABASE_URL em .env

# Execute migrações
npm run db:migrate
npm run db:seed
```

### 3. Deploy Contratos Stacks
```bash
# Testnet deployment
cd contracts
clarinet integrate

# Ou devnet local
clarinet console
(contract-call? .game-pool initialize-game-pool u1000000 u20)
```

### 4. Start Application
```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend  
npm run dev:client

# Terminal 3 - Shared (watch mode)
npm run dev:shared
```

## 🎯 Demo URLs

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **Database Studio**: `npm run db:studio`

## 🏗 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Node.js Server │    │ Stacks Contract │
│   (Port 5173)   │◄──►│   (Port 3000)   │◄──►│  (Testnet/Dev)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Stacks Connect │    │   PostgreSQL    │    │   Hiro API      │
│   (Wallet UI)   │    │   (Database)    │    │  (Blockchain)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎮 Game Flow

1. **Player connects Stacks wallet**
2. **Joins game lobby (pays STX entry fee)**
3. **Real-time multiplayer agar.io gameplay**
4. **Winners automatically receive STX prizes**

## 📱 Features Implementadas

- ✅ Stacks wallet integration
- ✅ Real-time multiplayer
- ✅ STX betting & prizes
- ✅ Smart contract automation
- ✅ Live leaderboards
- ✅ Tournament system
- ✅ NFT skins marketplace

## 🔧 Development Commands

```bash
# Build everything
npm run build

# Run tests
npm run test

# Deploy contracts
npm run clarinet:deploy

# Database management
npm run db:migrate    # Run migrations
npm run db:studio     # Open Prisma Studio
npm run db:reset      # Reset database

# Linting
npm run lint
```

## 🚨 Troubleshooting

### Contract Issues
```bash
# Check contract deployment
clarinet console
::get_contracts

# Test contract functions
(contract-call? .game-pool get-next-game-id)
```

### Database Issues
```bash
# Reset and rebuild
npm run db:reset
npm run db:migrate
npm run db:seed
```

### Wallet Issues
- Ensure Hiro Wallet is installed
- Switch to Stacks testnet
- Have test STX in wallet

## 📊 Monitoring

### Health Checks
- **Frontend**: http://localhost:5173/health
- **Backend**: http://localhost:3000/health  
- **Database**: `npm run db:studio`

### Logs
```bash
# Server logs
npm run dev:server

# Contract events
clarinet console
::get_events
```

## 🎯 Hackathon Submission

### Demo Script
1. **Show wallet connection**
2. **Create/join game with STX**
3. **Play live multiplayer**
4. **Win and receive STX payout**
5. **Show leaderboards/stats**

### Key Metrics
- **Transaction throughput**: ~1-2 TPS
- **Game capacity**: 20 players/game
- **Prize distribution**: 50%/30%/20%
- **House fee**: 20%

## 🔐 Security Notes

- Private keys in `.env` (never commit!)
- Smart contracts audited for basic security
- User funds held in escrow during games
- Automatic prize distribution prevents manipulation

## 📝 Next Steps (Post-Hackathon)

- [ ] Mainnet deployment
- [ ] Advanced anti-cheat
- [ ] Mobile app
- [ ] DAO governance
- [ ] Additional game modes