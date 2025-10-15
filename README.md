# AgarCoin - Proof of Concept: Decentralized Gaming Wagers 🎮⚡

**A proof-of-concept infrastructure for secure, verifiable betting in competitive multiplayer games.**

This project demonstrates how blockchain technology can enable trustless wagering between players in any competitive game (League of Legends, CS:GO, Dota 2, etc.). We use Agar.io as a simple demonstration, but the architecture is designed to scale to complex esports titles.

## 🎯 The Problem We're Solving

Friends who game together often want to bet on matches for fun, but face challenges:
- **Trust Issues**: How do you ensure payouts happen fairly?
- **Online Friends**: You might only know your friends online - no in-person cash exchange
- **Game Integrity**: How do you prove the game wasn't rigged or cheated?
- **Dispute Resolution**: What happens when someone claims unfair play?

**This POC solves all of these problems using blockchain technology.**

## 🚀 Core Features (Infrastructure)

### 1. Smart Contract Escrow
- Entry fees locked in smart contract
- Automatic prize distribution to winners
- No trusted intermediary needed
- Transparent, auditable transactions

### 2. Cryptographic Game Verification
- **Session Recording**: Every game action timestamped and logged
- **SHA-256 Hashing**: Game session converted to cryptographic hash
- **On-Chain Verification**: Hash stored on Stacks blockchain
- **Tamper-Proof**: Any modification to game data changes the hash

### 3. Anti-Cheat & Validation
- Server-side validation before prize distribution
- Detects impossible movements, suspicious patterns
- Prevents prize payouts for tampered games
- Audit logs for dispute resolution

### 4. Replay System
- Full game replay available via API
- Players can review game for fairness
- Supports dispute resolution
- Exportable for evidence

## 🎮 Demo Implementation (Agar.io)

We chose Agar.io as a simple demonstration, but this works for ANY competitive game:
- ✅ League of Legends
- ✅ Counter-Strike
- ✅ Dota 2
- ✅ Fighting games
- ✅ Racing games
- ✅ Any multiplayer competition

## 🏗 Architecture

```
├── client/          # React frontend with TypeScript
├── server/          # Node.js backend with Socket.io
├── contracts/       # Stacks smart contracts (Clarity)
├── shared/          # Shared TypeScript types
└── database/        # PostgreSQL schemas and migrations
```

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Stacks Connect
- **Backend**: Node.js, Express, Socket.io, Prisma
- **Blockchain**: Stacks, Clarity Smart Contracts, STX Tokens
- **Database**: PostgreSQL
- **Real-time**: WebSockets for multiplayer gameplay

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Clarinet CLI for Stacks development

### Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd agarIoCrypto
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configurations
   ```

3. **Database setup**
   ```bash
   cd database
   npx prisma migrate dev
   npx prisma db seed
   ```

4. **Stacks contract deployment**
   ```bash
   cd contracts
   clarinet contracts deploy
   ```

## 🎮 Running the Application

### Development Mode
```bash
# Start all services
npm run dev

# Or start individually
npm run dev:client    # Frontend on http://localhost:5173
npm run dev:server    # Backend on http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
```

## 🎯 How to Play

1. **Connect Wallet**: Connect your Stacks wallet via Stacks Connect
2. **Join/Create Game**: Pay entry fee to join a game or create your own
3. **Play**: Use mouse to move, eat smaller players and pellets
4. **Win Prizes**: Top 3 players share the prize pool (50%/30%/20%)

## 💰 Prize Distribution

- **1st Place**: 50% of prize pool
- **2nd Place**: 30% of prize pool  
- **3rd Place**: 20% of prize pool
- **House Fee**: 20% of entry fees

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development servers
- `npm run build` - Build all packages
- `npm run test` - Run tests
- `npm run lint` - Lint codebase
- `npm run clarinet:build` - Build Stacks contracts
- `npm run clarinet:test` - Test Stacks contracts

### Database Commands
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database
- `npm run db:seed` - Seed sample data

## 🔐 Security

- Entry fees are held in escrow by smart contracts
- Automatic prize distribution prevents manual intervention
- Transaction signatures verified on-chain
- No custody of user funds - direct wallet-to-wallet transfers

## 📝 Smart Contract (Deployed on Testnet)

**Contract Address**: `ST1ZFTT97Z1BBTD5Y2JK7N1Y3MJ9SYCDN1F4803GZ.game-pool`
**Network**: Stacks Testnet
**Transaction ID**: `ac9e71ec88751a9b84d1ade8a678fb774ebdf50716f6f9a2076d3a4721c432fd`
**Explorer**: [View on Stacks Explorer](https://explorer.hiro.so/txid/ac9e71ec88751a9b84d1ade8a678fb774ebdf50716f6f9a2076d3a4721c432fd?chain=testnet)

### Core Functions:

- `initialize-game-pool` - Create new game with entry fee
- `join-game` - Player joins and pays entry fee (STX locked in contract)
- `start-game` - Begin gameplay when ready
- `end-game-and-distribute` - Distribute prizes to winners (50%/30%/20%)
- `record-session-hash` - Store cryptographic proof of game fairness
- `verify-session-hash` - Anyone can verify game wasn't tampered with

### Read-Only Functions:

- `get-game-pool` - Query game state
- `get-session-hash` - Retrieve stored hash for verification
- `verify-session-hash` - Compare provided hash with on-chain version
- `calculate-prizes` - See prize breakdown before playing

## 🔬 Verification & Transparency APIs

The system provides full transparency for all players. Anyone can verify game integrity:

### Replay API
```bash
# Get full game replay data
GET /api/game/:gameId/replay

# Returns: Complete event log with all player actions, timestamps, kills, deaths
```

### Session Hash API
```bash
# Get cryptographic hash of game session
GET /api/game/:gameId/hash

# Returns:
{
  "gameId": "abc123",
  "sessionHash": "d4f9b2c8a1e...",  // SHA-256 hash
  "hashAlgorithm": "SHA-256",
  "sessionMetadata": {...},
  "verificationInstructions": {
    "blockchain": "Stacks Testnet",
    "contract": "ST1ZFTT97Z1BBTD5Y2JK7N1Y3MJ9SYCDN1F4803GZ.game-pool",
    "function": "verify-session-hash"
  }
}
```

### Validation API
```bash
# Validate game session for fairness
GET /api/game/:gameId/validate?audit=true

# Returns:
{
  "validation": {
    "isValid": true,
    "violations": [],
    "riskScore": 0,
    "recommendation": "APPROVE"
  },
  "auditLog": "..." // Detailed audit trail
}
```

### Session Summary API
```bash
# Get lightweight summary
GET /api/game/:gameId/summary

# Returns: Player stats, kills, deaths, final scores
```

## 🛡️ How Fair Play is Guaranteed

1. **Recording Phase** (During Game)
   - Every kill, death, movement logged with timestamp
   - Data stored server-side, inaccessible to players

2. **Hashing Phase** (End of Game)
   - Complete session data serialized deterministically
   - SHA-256 hash generated
   - Hash is cryptographic fingerprint of exact game events

3. **Blockchain Phase** (After Prize Distribution)
   - Hash stored on Stacks blockchain via `record-session-hash`
   - Permanently recorded, immutable
   - Anyone can verify later

4. **Verification Phase** (Anytime)
   - Players can download replay
   - Regenerate hash from replay
   - Compare with on-chain hash
   - If hashes match = game is authentic

**Why This Matters**:
- Server can't modify game results after the fact
- Players can prove unfair treatment
- Disputes resolved with cryptographic proof
- Perfect for wagering scenarios

## 🎯 Hackathon Demo

### Quick Start for Demo
```bash
# Automated setup
./scripts/demo-setup.sh

# Or manual setup
npm install
npm run build:shared
cp .env.example .env
# Edit .env with your Stacks configuration
npm run dev
```

### Demo URLs
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **Health Check**: `node scripts/health-check.js`

### Key Features Demonstrated
- ✅ Real Stacks wallet integration
- ✅ Live multiplayer gameplay
- ✅ STX betting and rewards
- ✅ Smart contract automation
- ✅ Real-time transaction feed

## 💡 Real-World Use Cases

### 1. **Friends Betting on League of Legends**
```
Scenario: 5 friends want to play a LoL match with $10 entry each

How it works:
1. Create game pool with $10 STX entry fee
2. All 5 join and pay (STX locked in contract)
3. Play the match normally
4. Game server records all events
5. Winner(s) automatically receive payout
6. Game hash stored on blockchain for verification
```

### 2. **CS:GO Tournament**
```
Scenario: 10 teams compete in tournament bracket

How it works:
1. Each team pays entry fee to smart contract
2. Bracket progresses through rounds
3. Each match recorded and validated
4. Prize pool automatically distributed to winners
5. All match replays available for review
6. Anti-cheat validates legitimacy before payouts
```

### 3. **1v1 Fighting Game Matches**
```
Scenario: Two players want to wager on Street Fighter match

How it works:
1. Both players agree on wager amount
2. Join game pool, funds locked
3. Play match
4. Server validates no cheating occurred
5. Winner automatically receives 80% (20% house fee)
6. Loser can review replay if suspicious
```

## 🚧 Roadmap

### Phase 1: Current POC (Completed) ✅
- [x] Smart contract for escrow & distribution
- [x] Session recording & hashing
- [x] On-chain verification
- [x] Anti-cheat validation
- [x] Replay APIs

### Phase 2: Production-Ready
- [ ] Integration with popular games (LoL, CS:GO, Dota 2)
- [ ] IPFS storage for replays (decentralized)
- [ ] Advanced anti-cheat (ML-based detection)
- [ ] Dispute resolution system
- [ ] Mobile app support

### Phase 3: Platform
- [ ] Open API for any game to integrate
- [ ] Tournament management system
- [ ] NFT achievements & badges
- [ ] Mainnet deployment
- [ ] DAO governance for platform decisions

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This is experimental software. Use at your own risk. Only bet what you can afford to lose.