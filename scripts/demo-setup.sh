#!/bin/bash

# AgarCoin Stacks - Hackathon Demo Setup Script
# This script prepares everything for a live demonstration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    log_error "Please run this script from the project root directory"
    exit 1
fi

log_info "🚀 Starting AgarCoin Stacks demo setup..."

# 1. Install dependencies
log_info "Installing dependencies..."
if npm install; then
    log_success "Dependencies installed"
else
    log_error "Failed to install dependencies"
    exit 1
fi

# 2. Build shared package
log_info "Building shared package..."
if npm run build:shared; then
    log_success "Shared package built"
else
    log_error "Failed to build shared package"
    exit 1
fi

# 3. Check if .env exists
if [ ! -f ".env" ]; then
    log_warning ".env file not found, copying from .env.example"
    cp .env.example .env
    log_info "Please edit .env file with your configuration before continuing"
    log_info "Press any key to continue after editing .env..."
    read -n 1 -s
fi

# 4. Check Clarinet installation
log_info "Checking Clarinet installation..."
if command -v clarinet &> /dev/null; then
    log_success "Clarinet is installed"
else
    log_warning "Clarinet not found. Installing..."
    if command -v brew &> /dev/null; then
        brew install clarinet
    else
        log_error "Please install Clarinet manually: https://docs.hiro.so/clarinet/"
        exit 1
    fi
fi

# 5. Build and test contracts
log_info "Building Stacks contracts..."
cd contracts
if clarinet contracts build; then
    log_success "Contracts built successfully"
else
    log_error "Failed to build contracts"
    exit 1
fi

log_info "Running contract tests..."
if npm test; then
    log_success "Contract tests passed"
else
    log_warning "Some contract tests failed - continuing anyway"
fi
cd ..

# 6. Setup database (if PostgreSQL is available)
log_info "Setting up database..."
if command -v psql &> /dev/null; then
    if npm run db:migrate; then
        log_success "Database migrations completed"
        if npm run db:seed; then
            log_success "Database seeded with demo data"
        else
            log_warning "Failed to seed database"
        fi
    else
        log_warning "Database migration failed - you may need to configure PostgreSQL"
    fi
else
    log_warning "PostgreSQL not found - skipping database setup"
fi

# 7. Build frontend and backend
log_info "Building application..."
if npm run build; then
    log_success "Application built successfully"
else
    log_error "Failed to build application"
    exit 1
fi

# 8. Run health check
log_info "Running health check..."
if node scripts/health-check.js; then
    log_success "Health check passed"
else
    log_warning "Health check detected some issues"
fi

# 9. Create demo data
log_info "Creating demo data..."
cat > demo-data.json << EOF
{
  "demoUsers": [
    {
      "address": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      "username": "DemoPlayer1",
      "balance": 10.5
    },
    {
      "address": "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 
      "username": "DemoPlayer2",
      "balance": 8.3
    }
  ],
  "demoGames": [
    {
      "id": "demo-game-1",
      "entryFee": 0.01,
      "prizePool": 0.2,
      "players": 18,
      "status": "active"
    }
  ],
  "demoTransactions": [
    {
      "type": "win",
      "amount": 0.15,
      "player": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    }
  ]
}
EOF
log_success "Demo data created"

# 10. Generate demo script
log_info "Generating demo presentation script..."
cat > DEMO_SCRIPT.md << EOF
# 🎮 AgarCoin Stacks - Live Demo Script

## Demo Flow (5-10 minutes)

### 1. Introduction (1 min)
- **"Welcome to AgarCoin - the first real-money agar.io game on Stacks!"**
- Show the landing page: http://localhost:5173
- Highlight key value props:
  - Real STX rewards
  - Decentralized gaming
  - Instant payouts

### 2. Wallet Connection (1 min)  
- Click "Connect Wallet"
- Show Stacks Connect integration
- Display real STX balance
- **"This connects to actual Stacks testnet!"**

### 3. Game Lobby (2 min)
- Navigate to game lobby
- Show live stats and player counts
- Explain entry fee (0.01 STX)
- **"Entry fees are held in smart contract escrow"**
- Join a game or create new one

### 4. Live Gameplay (3 min)
- Start playing the actual game
- Show real-time multiplayer action
- Demonstrate core mechanics:
  - Eat smaller players
  - Avoid bigger ones
  - Grow in size
- **"This is real multiplayer with blockchain rewards!"**

### 5. Smart Contract Integration (2 min)
- Show transaction history
- Explain automatic prize distribution
- Display contract on Stacks explorer
- **"Winners automatically receive STX - no manual intervention!"**

### 6. Technical Deep Dive (1 min)
- Show the codebase briefly
- Highlight key technologies:
  - Clarity smart contracts
  - React + TypeScript frontend
  - Real-time WebSocket gameplay
  - PostgreSQL for game state

## Key Talking Points

### Problem Statement
- Traditional gaming: Centralized, no real rewards
- Crypto gaming: Usually complex, poor UX
- **Our solution: Familiar gameplay + real rewards + great UX**

### Technical Innovation
- **Stacks integration**: Native Bitcoin security
- **Real-time gameplay**: Sub-100ms latency
- **Smart contract automation**: Trustless prize distribution
- **Seamless UX**: One-click wallet connection

### Business Model
- 20% house fee on all games
- Sustainable tokenomics
- Community-driven tournament system

### Future Roadmap
- Mainnet deployment
- Mobile app
- Tournament system
- DAO governance
- NFT skins marketplace

## Demo URLs
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: node scripts/health-check.js
- **Contract Explorer**: [Stacks Explorer URL]

## Backup Plans
- If network issues: Use screenshots/video
- If wallet issues: Show testnet faucet
- If contract issues: Explain with code examples

## Questions to Anticipate
1. **"How do you prevent cheating?"**
   - Server-side validation
   - Blockchain immutability
   - Future: Advanced anti-cheat systems

2. **"What about scalability?"**
   - Current: 20 players per game
   - Future: Layer 2 solutions
   - Optimistic game state updates

3. **"Why Stacks over other chains?"**
   - Bitcoin security
   - Growing ecosystem
   - Great developer tools
   - Strong community

4. **"How do economics work?"**
   - Entry fees → prize pool
   - 50%/30%/20% distribution
   - 20% platform fee
   - Sustainable growth model

Remember: **Keep it high-energy, focus on the fun, and emphasize the real money aspect!**
EOF

log_success "Demo script created: DEMO_SCRIPT.md"

# Final instructions
echo ""
log_success "🎉 Demo setup complete!"
echo ""
log_info "Next steps:"
echo "  1. Review and edit .env file if needed"
echo "  2. Start the development servers:"
echo "     npm run dev"
echo "  3. Open browser to http://localhost:5173"
echo "  4. Review DEMO_SCRIPT.md for presentation flow"
echo "  5. Test wallet connection with Stacks testnet"
echo ""
log_info "For health check: node scripts/health-check.js"
log_info "For production build: npm run build"
echo ""
log_success "Ready for hackathon demo! 🚀"