# AgarCrypto - Trustless Gaming Wagers on Stacks 🎮⚡

**A proof-of-concept infrastructure for secure, verifiable betting in competitive multiplayer games built on Stacks blockchain.**

[![Stacks](https://img.shields.io/badge/Stacks-Blockchain-5546FF)](https://www.stacks.co/)
[![Clarity](https://img.shields.io/badge/Smart%20Contracts-Clarity-blue)](https://clarity-lang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

This project demonstrates how blockchain technology can enable trustless wagering between players in any competitive game (League of Legends, CS:GO, Dota 2, etc.). We use Agar.io as a simple demonstration, but the architecture is designed to scale to complex esports titles.

---

## 📋 Table of Contents

- [Problem & Solution](#-problem--solution)
- [Idea Validation](#-idea-validation)
- [Architecture](#-architecture)
- [User Flow](#-user-flow)
- [Core Functionality](#-core-functionality)
- [Business Model](#-business-model)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Smart Contract](#-smart-contract)
- [Demo](#-demo)
- [Roadmap](#-roadmap)

---

## 🎯 Problem & Solution

### The Problem We're Solving

Friends who game together often want to bet on matches for fun, but face critical challenges:

- **Trust Issues**: How do you ensure payouts happen fairly?
- **Online Friends**: You might only know your friends online - no in-person cash exchange possible
- **Payment Coordination**: Manually collecting and distributing money is tedious and error-prone
- **Game Integrity**: How do you prove the game wasn't rigged or cheated?
- **Dispute Resolution**: What happens when someone claims unfair play?

### Our Solution

**AgarCrypto** eliminates these friction points by leveraging Stacks blockchain:

✅ **Trustless Escrow** - Entry fees automatically locked in smart contract
✅ **Automatic Payouts** - Winners receive prizes instantly via smart contract
✅ **Cryptographic Verification** - Game sessions hashed and stored on-chain
✅ **Tamper-Proof** - Impossible to modify game results after the fact
✅ **Transparent** - All transactions and game data publicly verifiable

This POC demonstrates the infrastructure with Agar.io, but **works for ANY competitive game**: League of Legends, CS:GO, Dota 2, fighting games, racing games, etc.

---

## 💡 Idea Validation

### Origin Story

This idea emerged from a **personal pain point** I've experienced throughout my life:

**Growing up**, I played street football with friends in my neighborhood. We would bet on matches - winners take the pot. It was simple, fun, and everyone knew each other, so trust wasn't an issue.

**As I grew older**, I moved from street football to **online competitive gaming** - specifically Counter-Strike. My friends and I formed teams, and we wanted to recreate that same betting excitement we had in the streets. We would organize matches against other teams: 5 players on each side, everyone puts in $100, winner takes all.

### The Problem in Practice

However, this created a **critical trust problem**:

- 🤝 **We only knew the opponents online** - no face-to-face relationship
- 💸 **Payment disputes were common** - "I'll pay later", "I don't have it right now", etc.
- ⚖️ **No fair arbiter** - Who holds the money? How do we know they won't run away?
- 📝 **No proof of game integrity** - Accusations of cheating led to disputes
- 🔄 **Manual coordination headache** - Collecting money from 10 people before each match

This happens **regularly** in gaming communities worldwide:
- Discord servers organizing tournaments
- Streamers hosting viewer competitions
- Friend groups playing ranked matches
- Amateur esports leagues

### Validation from Community

This pain point is **widely shared**:
- Gaming subreddits regularly discuss "how to organize betting matches safely"
- Discord communities ask for "trustworthy admins" to hold prize pools
- Platforms like CheckmateGaming.com exist specifically to solve this (they charge high fees for being the trusted intermediary)

**The demand exists** - players want competitive betting. What's missing is the infrastructure to do it **trustlessly** and **automatically**.

### Why Blockchain is the Perfect Solution

Blockchain eliminates the middleman trust problem:

1. ✅ Smart contracts act as **impartial escrow** - no human can steal funds
2. ✅ Prize distribution is **automatic and instant** - no payment delays
3. ✅ Game data is **cryptographically verified** on-chain - disputes resolved with proof
4. ✅ **Transparent and auditable** - anyone can verify fairness
5. ✅ **Global and permissionless** - works for players anywhere in the world

This POC proves the concept works. The infrastructure can scale to **any game, any prize pool, any number of players**.

---

## 🏗 Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AGARCRYPTO PLATFORM                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│                  │         │                  │         │                  │
│  FRONTEND        │◄───────►│  BACKEND         │◄───────►│  BLOCKCHAIN      │
│  (Client)        │  HTTP/  │  (Server)        │  Stacks │  (Stacks)        │
│                  │  WS     │                  │   SDK   │                  │
│  React + Canvas  │         │  Node.js + IO    │         │  Clarity         │
│  Stacks Connect  │         │  Express + WS    │         │  Smart Contracts │
│                  │         │  Game Engine     │         │                  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
         │                            │                            │
         │                            │                            │
         ▼                            ▼                            ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│ User Interactions│         │ Database         │         │ On-Chain Data    │
│ • Wallet Connect │         │ (PostgreSQL)     │         │ • Game Pools     │
│ • Join Game      │         │ • Player Stats   │         │ • Escrow Funds   │
│ • Real-time Play │         │ • Leaderboards   │         │ • Prize Distrib. │
│ • View Stats     │         │ • Session Data   │         │ • Session Hash   │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │
│  │  Landing      │  │  Game Lobby   │  │  Game Canvas  │               │
│  │  Page         │─→│  (Room Mgmt)  │─→│  (Gameplay)   │               │
│  └───────────────┘  └───────────────┘  └───────────────┘               │
│         │                   │                   │                        │
│         └───────────────────┴───────────────────┘                        │
│                             │                                            │
│                    ┌────────▼────────┐                                   │
│                    │  Stacks Connect │                                   │
│                    │  Wallet Provider│                                   │
│                    └────────┬────────┘                                   │
│                             │                                            │
└─────────────────────────────┼─────────────────────────────────────────────┘
                              │
                    WebSocket │ HTTP
                              │
┌─────────────────────────────┼─────────────────────────────────────────────┐
│                           BACKEND LAYER                                   │
├─────────────────────────────┼─────────────────────────────────────────────┤
│                             │                                             │
│  ┌──────────────────────────▼────────────────────────────┐               │
│  │            Socket.IO Event Handler                     │               │
│  │  • player_join  • player_move  • game_update           │               │
│  └──────────────────────────┬────────────────────────────┘               │
│                             │                                             │
│         ┌───────────────────┼───────────────────┐                        │
│         │                   │                   │                        │
│    ┌────▼────┐      ┌───────▼──────┐    ┌──────▼─────┐                 │
│    │  Game   │      │   Game       │    │  Session   │                 │
│    │ Service │◄────►│   Room       │◄───┤  Recorder  │                 │
│    │         │      │  Manager     │    │            │                 │
│    └────┬────┘      └──────────────┘    └──────┬─────┘                 │
│         │                                       │                        │
│    ┌────▼────┐                          ┌──────▼─────┐                 │
│    │ Stats   │                          │ Validation │                 │
│    │ Service │                          │  Service   │                 │
│    └────┬────┘                          └──────┬─────┘                 │
│         │                                       │                        │
│         └───────────────────┬───────────────────┘                        │
│                             │                                             │
│                    ┌────────▼────────┐                                   │
│                    │   Blockchain    │                                   │
│                    │   Service       │                                   │
│                    │ (Stacks SDK)    │                                   │
│                    └────────┬────────┘                                   │
└─────────────────────────────┼─────────────────────────────────────────────┘
                              │
                        Stacks API
                              │
┌─────────────────────────────┼─────────────────────────────────────────────┐
│                      BLOCKCHAIN LAYER                                     │
├─────────────────────────────┼─────────────────────────────────────────────┤
│                             │                                             │
│                   ┌─────────▼─────────┐                                  │
│                   │ Game Pool Contract│                                  │
│                   │   (game-pool.clar)│                                  │
│                   └─────────┬─────────┘                                  │
│                             │                                             │
│       ┌──────────────┬──────┴──────┬──────────────┐                     │
│       │              │             │              │                     │
│  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐               │
│  │ Initialize│  │   Join   │  │   End    │  │  Record  │               │
│  │   Pool    │  │   Game   │  │  Game    │  │  Session │               │
│  │           │  │  (Escrow)│  │ (Payout) │  │   Hash   │               │
│  └───────────┘  └──────────┘  └──────────┘  └──────────┘               │
│                                                                           │
│  ┌───────────────────────────────────────────────────────┐              │
│  │             Stacks Blockchain State                    │              │
│  │  • STX Escrow Balance                                  │              │
│  │  • Game Pool Metadata                                  │              │
│  │  • Session Hashes (Proof of Fair Play)                │              │
│  │  • Prize Distribution History                          │              │
│  └───────────────────────────────────────────────────────┘              │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
 USER JOINS GAME                GAMEPLAY PHASE              GAME ENDS & PAYOUT

1. Connect Wallet          4. Real-time Gameplay       7. Validate Game
   │                          │                           │
   ▼                          ▼                           ▼
2. Pay Entry Fee           5. Record Events           8. Hash Session
   │                          │                           │
   ▼                          ▼                           ▼
3. Join Game Room          6. Update State            9. Store Hash On-Chain
   │                          │                           │
   │                          │                           ▼
   │                          │                       10. Distribute Prizes
   │                          │                           │
   │                          │                           ▼
   └──────────────────────────┴───────────────────────> Game Complete

┌──────────────────────────────────────────────────────────────────────┐
│                        DETAILED FLOW                                  │
└──────────────────────────────────────────────────────────────────────┘

┌────────┐     ┌────────┐     ┌────────┐     ┌────────────┐
│ Wallet │────>│Frontend│────>│ Server │────>│ Blockchain │
└────────┘     └────────┘     └────────┘     └────────────┘
    │              │              │                  │
    │ (1) Connect  │              │                  │
    │─────────────>│              │                  │
    │              │              │                  │
    │ (2) Sign TX  │              │                  │
    │<─────────────┤              │                  │
    │              │              │                  │
    │              │ (3) join-game│ (4) Transfer STX │
    │              │──────────────┼─────────────────>│
    │              │              │                  │
    │              │              │   (5) Confirm TX │
    │              │              │<─────────────────┤
    │              │              │                  │
    │              │ (6) Start Game                  │
    │              │<─────────────┤                  │
    │              │              │                  │
    │ (7) Play     │              │                  │
    │─────────────>│              │                  │
    │              │ (8) WebSocket│                  │
    │              │──────────────>                  │
    │              │              │                  │
    │              │ (9) Record   │                  │
    │              │   Events     │                  │
    │              │<─────────────┤                  │
    │              │              │                  │
    │              │(10) Game End │                  │
    │              │<─────────────┤                  │
    │              │              │                  │
    │              │              │(11) Hash Session │
    │              │              │─────────────────>│
    │              │              │                  │
    │              │              │(12) Distribute   │
    │              │              │    Prizes        │
    │              │              │─────────────────>│
    │              │              │                  │
    │ (14) Receive │              │   (13) STX Sent  │
    │<─────────────┼──────────────┼──────────────────┤
    │   Prize      │              │                  │
```

---

## 🚶 User Flow

### End-to-End User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                                 │
└─────────────────────────────────────────────────────────────────────┘

START: Player arrives at AgarCrypto platform
  │
  ├─> [Landing Page]
  │   • View platform features
  │   • See active games
  │   • Check leaderboards
  │
  ▼
[Connect Wallet]
  │
  ├─> Click "Connect Wallet"
  │   • Stacks Connect modal appears
  │   • Select wallet (Hiro, Xverse, Leather)
  │   • Authorize connection
  │   • Wallet address displayed
  │
  ▼
[Choose Game Option]
  │
  ├─> Option A: Join Existing Game
  │   │
  │   ├─> [Browse Available Games]
  │   │   • See list of open game rooms
  │   │   • View entry fee, player count, max players
  │   │   • Filter by entry fee
  │   │
  │   ├─> [Select Game Room]
  │   │   • Click "Join Game"
  │   │   • Confirm entry fee amount
  │   │
  │   └─> [Pay Entry Fee]
  │       • Stacks wallet prompts transaction
  │       • Sign transaction (STX → Smart Contract)
  │       • Wait for transaction confirmation
  │       • Entry fee locked in smart contract escrow
  │
  └─> Option B: Create New Game
      │
      ├─> [Configure Game]
      │   • Set entry fee (e.g., 0.5 STX)
      │   • Set max players (e.g., 10)
      │   • Set game duration
      │
      └─> [Create & Join]
          • Transaction creates game pool on-chain
          • Player automatically joins as first player
          • Game room visible to other players
  │
  ▼
[Game Lobby]
  │
  ├─> Waiting for Players
  │   • See current player count
  │   • View other players' wallet addresses
  │   • See total prize pool accumulating
  │
  ├─> Game Auto-Starts When Full
  │   • All player slots filled
  │   • 3-second countdown
  │   • "Game Starting..." message
  │
  ▼
[Gameplay Phase]
  │
  ├─> [Real-Time Multiplayer]
  │   • Canvas-based agar.io gameplay
  │   • Move with mouse
  │   • Eat smaller players and pellets
  │   • Grow in size/mass
  │   • See live leaderboard (top 10)
  │   • All actions recorded server-side
  │
  ├─> [Game Mechanics]
  │   • Eat pellets: +1 mass
  │   • Eat player: gain their mass
  │   • Bigger = slower
  │   • Avoid bigger players
  │   • Survive as long as possible
  │
  └─> [Session Recording]
      • Every kill/death timestamped
      • All movement patterns logged
      • Server validates for cheating
      • Data prepared for blockchain storage
  │
  ▼
[Game Ends]
  │
  ├─> [Trigger: Time Limit or Survival]
  │   • Game duration expires, OR
  │   • Only N players remain
  │
  ├─> [Final Rankings Calculated]
  │   • 1st Place: Highest score
  │   • 2nd Place: Second highest
  │   • 3rd Place: Third highest
  │
  ▼
[Prize Distribution] ⚡ AUTOMATIC & INSTANT
  │
  ├─> [Smart Contract Executes]
  │   • Server calls `end-game-and-distribute`
  │   • Smart contract validates winners
  │   • Calculates prize split:
  │     - House Fee: 20% (to platform)
  │     - 1st Place: 50% of remaining (40% of total pool)
  │     - 2nd Place: 30% of remaining (24% of total pool)
  │     - 3rd Place: 20% of remaining (16% of total pool)
  │
  ├─> [STX Transferred]
  │   • Winners receive STX directly to wallets
  │   • No manual intervention needed
  │   • Instant settlement
  │
  └─> [Session Hash Stored On-Chain]
      • Game session data hashed (SHA-256)
      • Hash stored in smart contract
      • Permanent proof of game integrity
  │
  ▼
[Post-Game]
  │
  ├─> [Game Over Modal]
  │   • Display final rankings
  │   • Show prize amounts won
  │   • Your final score and stats
  │   • Buttons: "Play Again" or "View Stats"
  │
  ├─> [Verification Available]
  │   • Download game replay
  │   • View session hash
  │   • Compare hash with on-chain version
  │   • Verify game fairness
  │
  ├─> [Stats Updated]
  │   • Personal stats updated
  │   • Global leaderboard ranking
  │   • Achievements unlocked
  │   • Win streak tracking
  │
  └─> [Return to Lobby]
      • Play another game
      • Join different room
      • View leaderboards
      • Check achievements
  │
  ▼
END: Player can continue playing or exit

┌─────────────────────────────────────────────────────────────────────┐
│                    KEY TRUST MECHANISMS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ✅ Entry fees locked in smart contract (not held by humans)        │
│  ✅ Prize distribution executed automatically by blockchain          │
│  ✅ Game integrity verified via cryptographic hash                   │
│  ✅ All transactions publicly auditable on Stacks explorer           │
│  ✅ No single party can modify results or steal funds                │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### User Experience Highlights

**Before Game:**
- 🎯 **One-click wallet connection** via Stacks Connect
- 💰 **Transparent pricing** - see entry fee before joining
- 👥 **Social** - see who else is playing
- ⚡ **Fast** - games start automatically when full

**During Game:**
- 🎮 **Smooth gameplay** - 60 FPS canvas rendering
- 📊 **Live stats** - real-time leaderboard
- 🔒 **Fair** - server-side validation prevents cheating
- 📹 **Recorded** - every action logged for verification

**After Game:**
- 💸 **Instant payout** - no waiting for manual transfers
- 🏆 **Recognition** - stats and achievements updated
- 🔍 **Transparent** - full replay and verification available
- 🔁 **Seamless** - easy to play again

---

## ⚙️ Core Functionality

### 1. Smart Contract Escrow System

**How it works:**
- Player joins game → Signs transaction → STX transferred to smart contract
- Smart contract holds funds in escrow (no human custody)
- Funds locked until game ends
- Automatic distribution based on results
- No possibility of "exit scam" or payment disputes

**Code Reference:** `contracts/contracts/game-pool.clar:83-117`

```clarity
(define-public (join-game (game-id uint))
  (let ((entry-fee (get entry-fee game-pool)))
    ;; Transfer STX from player to contract
    (try! (stx-transfer? entry-fee tx-sender (as-contract tx-sender)))
    ;; Player entry recorded
    ;; Total pool incremented
    (ok true)
  )
)
```

### 2. Automatic Prize Distribution

**Prize Split Algorithm:**
- Total Pool = Sum of all entry fees
- House Fee = 20% of total pool (platform revenue)
- Prize Pool = 80% of total pool (distributed to winners)
  - 🥇 **1st Place**: 50% of prize pool (40% of total)
  - 🥈 **2nd Place**: 30% of prize pool (24% of total)
  - 🥉 **3rd Place**: 20% of prize pool (16% of total)

**Example:**
```
10 players × 1 STX entry fee = 10 STX total pool

House Fee (20%):    2 STX → Platform
Prize Pool (80%):   8 STX → Winners
  ├─ 1st (50%):     4 STX
  ├─ 2nd (30%):     2.4 STX
  └─ 3rd (20%):     1.6 STX
```

**Code Reference:** `contracts/contracts/game-pool.clar:145-177`

### 3. Cryptographic Game Verification

**Problem:** How do you prove a game wasn't tampered with after it ended?

**Solution:** Cryptographic hashing + blockchain storage

**Process:**
1. **Recording Phase** (During Game)
   - Every game event logged with timestamp
   - Data structure: `{ event, playerId, timestamp, metadata }`
   - Events stored server-side (players can't access)

2. **Hashing Phase** (After Game)
   - Complete session data serialized to JSON
   - SHA-256 hash generated from JSON
   - Hash is unique "fingerprint" of exact game events

3. **Blockchain Phase** (After Distribution)
   - Hash stored on Stacks blockchain via `record-session-hash`
   - Permanently immutable record
   - Anyone can query hash later

4. **Verification Phase** (Anytime Later)
   - Player downloads replay from API
   - Regenerates hash locally
   - Compares with on-chain hash
   - **If hashes match** = Game is authentic and unmodified
   - **If hashes differ** = Game was tampered with

**Why This Matters:**
- ✅ Server can't modify results retroactively
- ✅ Players can prove if they were cheated
- ✅ Disputes resolved with mathematical proof
- ✅ Perfect for high-stakes betting scenarios

**Code Reference:** `server/src/services/GameSessionRecorder.ts`

### 4. Anti-Cheat Validation

**Server-Side Validation:**
- Movement speed validation (prevents teleportation)
- Mass conservation checks (prevents instant growth)
- Physics validation (enforces game rules)
- Event timeline validation (detects time manipulation)

**Risk Scoring:**
- Each suspicious action increases risk score
- High risk score prevents prize payout
- Validation report available via API

**Code Reference:** `server/src/services/GameValidationService.ts`

### 5. Replay System

**Full Game Transparency:**
- Complete event log stored after each game
- API endpoint provides replay data: `GET /api/game/:gameId/replay`
- Players can review entire match frame-by-frame
- Supports dispute resolution
- Exportable for evidence

**API Endpoints:**
```bash
GET /api/game/:gameId/replay      # Full event log
GET /api/game/:gameId/hash        # Cryptographic hash
GET /api/game/:gameId/validate    # Anti-cheat validation
GET /api/game/:gameId/summary     # Quick stats
```

### 6. Real-Time Multiplayer Engine

**Technical Implementation:**
- WebSocket-based real-time communication (Socket.IO)
- Server tick rate: 30 updates/second
- Client interpolation for smooth rendering
- Input buffering for lag compensation
- Server-authoritative game state (prevents client-side cheating)

**Game Loop:**
```
Client                          Server
  │                               │
  ├─ Player Input ───────────────>│
  │  (mouse position)             │
  │                               ├─ Validate Input
  │                               ├─ Update Game State
  │                               ├─ Check Collisions
  │                               ├─ Calculate Scores
  │                               │
  │<─ Game State Update ──────────┤
  │  (all players, pellets, etc)  │
  │                               │
  ├─ Render Frame                 │
  │  (60 FPS)                     │
```

---

## 💼 Business Model

### Revenue Streams

**Primary Revenue: House Fee**
- **20% fee on all entry fees**
- Taken automatically by smart contract during prize distribution
- Example: 10 STX pool → 2 STX to platform, 8 STX to winners

**Revenue Calculation:**
```
Daily Volume:    100 games × 10 players × 1 STX = 1,000 STX
House Fee (20%): 200 STX per day
Monthly Revenue: 200 STX × 30 = 6,000 STX
At $1.50/STX:    $9,000 USD monthly revenue
```

### Market Benchmark

**Inspiration: CheckmateGaming.com**

CheckmateGaming is a centralized platform that enables betting on gaming matches. They serve as the trusted intermediary, holding prize pools and distributing payouts manually.

**Their Model:**
- Players deposit funds into CheckmateGaming accounts
- CheckmateGaming holds all funds (centralized custody)
- Manual payout process after matches
- High fees (estimated 15-25%) to cover operational costs
- Trusted third-party model

**Our Competitive Advantage:**

| Feature | CheckmateGaming | AgarCrypto |
|---------|----------------|----------|
| Trust Model | Centralized (trust the company) | Trustless (trust the code) |
| Custody | Company holds funds | Smart contract escrow |
| Payouts | Manual, delayed | Automatic, instant |
| Transparency | Limited | Fully transparent on-chain |
| Fees | 15-25% (estimated) | 20% (public & fixed) |
| Game Verification | Manual review | Cryptographic proof |
| Dispute Resolution | Customer support | On-chain evidence |
| Geographic Limits | Restricted by regulations | Global & permissionless |

### Scalability

**Game Agnostic Platform:**
This infrastructure works for **any competitive game**:

1. **MOBA Games** (League of Legends, Dota 2)
   - 5v5 team matches
   - Tournament brackets
   - Ranked ladder betting

2. **FPS Games** (CS:GO, Valorant, Call of Duty)
   - Team vs team matches
   - 1v1 duels
   - Clan wars

3. **Fighting Games** (Street Fighter, Tekken)
   - 1v1 matches
   - Best-of-3 series
   - Tournament formats

4. **Racing Games** (F1, Gran Turismo)
   - Time trial competitions
   - Head-to-head races
   - Multiplayer tournaments

5. **Sports Games** (FIFA, NBA 2K)
   - 1v1 matches
   - Team competitions
   - Season-long leagues

**Implementation:**
- Game integrates our SDK
- Sends match results to our API
- Smart contract handles escrow & payout
- Works identically regardless of game genre

### Growth Strategy

**Phase 1: POC Validation** (Current)
- ✅ Prove concept with Agar.io demo
- ✅ Deploy on Stacks testnet
- ✅ Gather user feedback
- ✅ Demonstrate at hackathon

**Phase 2: Initial Launch**
- Partner with 2-3 popular games
- Integrate game APIs
- Launch on Stacks mainnet
- Community building (Discord, Twitter)

**Phase 3: Platform Expansion**
- Open SDK for any game to integrate
- Tournament management features
- NFT achievements & badges
- Social features (teams, clans)

**Phase 4: Ecosystem**
- DAO governance
- Token launch (platform token)
- Liquidity mining for early adopters
- Multi-chain expansion

### Unit Economics

**Per-Game Economics:**
```
Entry Fee:      1 STX per player
Players:        10 players
Total Pool:     10 STX
House Fee:      2 STX (20%)
Prize Pool:     8 STX (80%)

Platform Revenue: 2 STX per game
Winner Payouts:   4 STX, 2.4 STX, 1.6 STX (1st, 2nd, 3rd)
```

**Break-Even Analysis:**
```
Fixed Costs (Monthly):
- Server hosting:           $200
- Blockchain fees:          $100
- Development:              $2,000
- Marketing:                $500
Total Fixed Costs:          $2,800/month

At $1.50 per STX:
Break-even revenue:         1,867 STX/month
Break-even games:           934 games/month
Break-even games/day:       31 games/day

With 10 players per game:   310 daily active users
```

**Target Metrics:**
- Year 1: 1,000 daily active users → $12K/month revenue
- Year 2: 10,000 daily active users → $120K/month revenue
- Year 3: 50,000 daily active users → $600K/month revenue

---

## 🛠 Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Canvas API** - Real-time game rendering
- **Stacks Connect** - Wallet integration
- **Socket.IO Client** - WebSocket communication

### Backend
- **Node.js 18** - Runtime
- **Express** - HTTP server
- **Socket.IO** - WebSocket server (real-time gameplay)
- **TypeScript** - Type safety
- **Prisma ORM** - Database access layer

### Blockchain
- **Stacks Blockchain** - Layer 1 for smart contracts
- **Clarity** - Smart contract language
- **STX Token** - Native currency for bets & payouts
- **Clarinet** - Smart contract development & testing

### Database
- **PostgreSQL 14** - Primary database
- **Prisma** - Schema management & migrations

### Infrastructure
- **Monorepo** - Shared code via workspaces
- **Shared Package** - Common TypeScript types
- **WebSockets** - Low-latency communication
- **SHA-256** - Cryptographic hashing for game verification

---

## 📦 Installation

### Prerequisites
- **Node.js 18+**
- **PostgreSQL 14+**
- **Clarinet CLI** ([Install Guide](https://docs.hiro.so/clarinet))
- **Stacks Wallet** (Hiro, Xverse, or Leather)

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/yourusername/agarcrypto-stacks.git
cd agarcrypto-stacks

# 2. Install dependencies (monorepo)
npm install

# 3. Environment configuration
cp .env.example .env
# Edit .env with your configuration

# 4. Database setup
cd database
npx prisma migrate dev
npx prisma db seed
cd ..

# 5. Build shared package
npm run build:shared

# 6. Start development servers
npm run dev
# This starts:
#   - Client: http://localhost:5173
#   - Server: http://localhost:3000
#   - Shared: watch mode
```

### Environment Variables

Create `.env` file in the root directory:

```bash
# Server Configuration
PORT=3000
CLIENT_URL=http://localhost:5173

# Stacks Blockchain
STACKS_NETWORK=testnet
STACKS_API_URL=https://api.testnet.hiro.so
STACKS_CONTRACT_ADDRESS=ST1ZFTT97Z1BBTD5Y2JK7N1Y3MJ9SYCDN1F4803GZ
STACKS_CONTRACT_NAME=game-pool

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/agarcrypto"

# Demo Mode (skip blockchain for testing)
DEMO_MODE=false
```

### Smart Contract Deployment

```bash
# Navigate to contracts directory
cd contracts

# Test contracts
clarinet test

# Deploy to testnet
clarinet contracts deploy --testnet

# Or use Clarinet console for testing
clarinet console
```

---

## 📝 Smart Contract

### Deployed Contract

**Network:** Stacks Testnet
**Contract Address:** `ST1ZFTT97Z1BBTD5Y2JK7N1Y3MJ9SYCDN1F4803GZ.game-pool`
**Transaction ID:** `ac9e71ec88751a9b84d1ade8a678fb774ebdf50716f6f9a2076d3a4721c432fd`
**Explorer:** [View on Stacks Explorer](https://explorer.hiro.so/txid/ac9e71ec88751a9b84d1ade8a678fb774ebdf50716f6f9a2076d3a4721c432fd?chain=testnet)

### Core Functions

#### Public Functions (Write Operations)

**1. `initialize-game-pool`**
```clarity
(initialize-game-pool (entry-fee uint) (max-players uint))
```
- Creates new game pool
- Sets entry fee and max players
- Returns game-id
- Called by: Server when creating new game

**2. `join-game`**
```clarity
(join-game (game-id uint))
```
- Player joins existing game
- Transfers STX from player to contract (escrow)
- Validates: game not full, game not started, sufficient balance
- Returns success/failure

**3. `start-game`**
```clarity
(start-game (game-id uint))
```
- Changes game status to "active"
- Only callable by game authority
- Records start time

**4. `end-game-and-distribute`**
```clarity
(end-game-and-distribute (game-id uint) (winners (list 3 principal)))
```
- Ends game
- Calculates house fee (20%)
- Distributes prizes (50%/30%/20% split)
- Transfers STX to winners automatically
- Only callable by game authority

**5. `record-session-hash`**
```clarity
(record-session-hash (game-id uint) (hash (buff 32)) (data-uri (optional (string-utf8 256))))
```
- Stores cryptographic hash of game session
- Permanent record on blockchain
- Enables verification of game integrity
- Only callable after game finished

#### Read-Only Functions (Query Operations)

**1. `get-game-pool`**
```clarity
(get-game-pool (game-id uint))
```
- Returns complete game pool data
- Includes: status, entry-fee, players, pool total, timestamps

**2. `get-player-entry`**
```clarity
(get-player-entry (game-id uint) (player principal))
```
- Check if player is in game
- Returns entry time and payment status

**3. `calculate-prizes`**
```clarity
(calculate-prizes (total-pool uint))
```
- Calculate prize distribution before game starts
- Returns: house-fee, prize-pool, 1st/2nd/3rd amounts
- Useful for UI display

**4. `get-session-hash`**
```clarity
(get-session-hash (game-id uint))
```
- Retrieve stored session hash
- Used for game verification

**5. `verify-session-hash`**
```clarity
(verify-session-hash (game-id uint) (hash (buff 32)))
```
- Compare provided hash with stored hash
- Returns true/false
- Enables anyone to verify game integrity

### Security Features

✅ **Immutable Escrow** - Funds locked in contract, no human can access
✅ **Automatic Distribution** - No manual intervention in payouts
✅ **Access Control** - Only game authority can start/end games
✅ **Transparent** - All game data publicly queryable
✅ **Auditable** - Session hashes provide proof of fairness

---

## 🎮 Demo

### Live Demo

**Frontend:** http://localhost:5173 (when running locally)
**Backend API:** http://localhost:3000
**Health Check:** `GET http://localhost:3000/health`

### Demo Flow

**1. Connect Wallet**
```bash
# Use Hiro Wallet (testnet mode)
# Request testnet STX from faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet
```

**2. Create or Join Game**
```bash
# Option A: Quick join (auto-match)
# Option B: Create private game for friends
```

**3. Play Game**
```bash
# Move with mouse
# Eat smaller players
# Avoid bigger players
# Survive to win!
```

**4. Receive Prize**
```bash
# Automatic payout to wallet
# Check transaction in Stacks Explorer
# View updated stats & leaderboard
```

### Test Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Get active games
curl http://localhost:3000/api/games

# Get global leaderboard
curl http://localhost:3000/api/leaderboards/global

# Get game replay
curl http://localhost:3000/api/game/{gameId}/replay

# Get session hash
curl http://localhost:3000/api/game/{gameId}/hash

# Validate game session
curl http://localhost:3000/api/game/{gameId}/validate?audit=true
```

---

## 🔒 Security & Fair Play

### How We Guarantee Fairness

**1. Server-Authoritative Game State**
- All game logic runs on server
- Client only sends input, receives state
- Impossible to cheat via client-side modification

**2. Cryptographic Verification**
- Game session hashed with SHA-256
- Hash stored on blockchain (immutable)
- Players can verify game wasn't tampered with

**3. Anti-Cheat Validation**
- Movement speed validation
- Physics enforcement
- Mass conservation checks
- Event timeline validation
- Risk scoring system

**4. Smart Contract Security**
- No upgrade keys (immutable once deployed)
- No admin withdraw function
- All funds locked until game completion
- Automatic distribution (no manual intervention)

**5. Transparency**
- Complete game replays available
- All blockchain transactions public
- Session validation API open to everyone
- Open-source smart contracts

---

## 🚀 Roadmap

### Phase 1: Current POC ✅
- [x] Smart contract for escrow & distribution
- [x] Session recording & hashing
- [x] On-chain verification
- [x] Anti-cheat validation
- [x] Replay APIs
- [x] Real-time multiplayer game engine
- [x] Wallet integration
- [x] Testnet deployment

### Phase 2: Production-Ready
- [ ] Integration with popular games (LoL, CS:GO, Dota 2)
- [ ] IPFS storage for replays (decentralized)
- [ ] Advanced anti-cheat (ML-based detection)
- [ ] Formal dispute resolution system
- [ ] Mobile app support (iOS/Android)
- [ ] Mainnet deployment
- [ ] Security audit

### Phase 3: Platform Growth
- [ ] Open SDK for any game to integrate
- [ ] Tournament management system
- [ ] Team & clan features
- [ ] Streaming integration (Twitch, YouTube)
- [ ] Social features (friends, chat)
- [ ] NFT achievements & badges
- [ ] Sponsored tournaments

### Phase 4: Ecosystem
- [ ] DAO governance for platform decisions
- [ ] Platform token launch
- [ ] Liquidity mining for early users
- [ ] Multi-chain expansion (Bitcoin L2s)
- [ ] Developer grants program
- [ ] Partner network (game studios)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Fork repository
# Clone your fork
git clone https://github.com/yourusername/agarcrypto-stacks.git

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and test
npm run dev
npm run test

# Commit changes
git commit -m 'Add amazing feature'

# Push to branch
git push origin feature/amazing-feature

# Open Pull Request
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ⚠️ Disclaimer

**This is experimental software for hackathon demonstration.**

- Use at your own risk
- Only bet what you can afford to lose
- Testnet deployment only (no real money)
- Smart contracts have not been formally audited
- Regulatory compliance varies by jurisdiction

---

## 📞 Contact & Links

**Hackathon:** [Stacks Vibe Coding](https://dorahacks.io/hackathon/stacks-vibe-coding/detail)
**Built for:** Stacks Foundation
**Blockchain:** [Stacks](https://www.stacks.co/)
**Demo Video:** [Coming Soon]

---

## 🙏 Acknowledgments

- **Stacks Foundation** - For the hackathon and blockchain infrastructure
- **Hiro** - For excellent developer tools (Clarinet, Stacks.js)
- **CheckmateGaming.com** - Business model inspiration
- **Gaming Community** - For validating this pain point exists

---

## 🎯 Hackathon Judges: Why This Matters

**Problem is Real:** Millions of gamers worldwide face trust issues when betting with online friends

**Solution is Practical:** Working POC demonstrates feasibility

**Market is Huge:** Gaming + crypto intersection = multi-billion dollar opportunity

**Stacks is Perfect:** Bitcoin-level security + smart contract flexibility = ideal for trustless escrow

**Scalable:** Infrastructure works for any game (LoL, CS:GO, Dota 2, etc.)

**Revenue Model Proven:** CheckmateGaming.com already validates demand (we just do it better with blockchain)

**Built on Stacks:** Leverages Clarity smart contracts, STX tokens, and Stacks ecosystem

---

**Built with ❤️ on Stacks blockchain**
