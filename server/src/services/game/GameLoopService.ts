import type { PlayerConnection, PlayerInput } from 'shared';
import { asGamePlayer, GAMEPLAY_CONSTANTS } from 'shared';
import { RoomService } from '../room/RoomService.js';
import { BotService } from '../bot/BotService.js';
import { CollisionService } from './CollisionService.js';
import { PelletService } from './PelletService.js';

export class GameLoopService {
  private roomService: RoomService;
  private botService: BotService;
  private collisionService: CollisionService;
  private pelletService: PelletService;
  private gameLoopInterval: NodeJS.Timeout | null = null;
  private gameId: string | null = null;

  // REFACTORED: Use centralized constants
  private readonly TICK_RATE = GAMEPLAY_CONSTANTS.NETWORK.TICK_RATE;
  private readonly TICK_INTERVAL = 1000 / this.TICK_RATE;

  // Game state
  private readonly WORLD_SIZE = {
    width: GAMEPLAY_CONSTANTS.WORLD.WIDTH,
    height: GAMEPLAY_CONSTANTS.WORLD.HEIGHT
  };

  constructor(roomService: RoomService, botService: BotService, gameId?: string) {
    this.roomService = roomService;
    this.botService = botService;
    this.collisionService = new CollisionService();
    this.pelletService = new PelletService();
    this.pelletService.initializePellets();
    this.gameId = gameId || null;
  }

  public setGameId(gameId: string): void {
    this.gameId = gameId;
  }

  public startGameLoop(): void {
    if (this.gameLoopInterval) {
      console.log('⚠️ Game loop already running');
      return;
    }

    console.log(`🔄 Starting game loop at ${this.TICK_RATE} TPS`);
    
    this.gameLoopInterval = setInterval(() => {
      this.gameLoopTick();
    }, this.TICK_INTERVAL);
  }

  public stopGameLoop(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
      console.log('⏹️ Game loop stopped');
    }
  }

  private gameLoopTick(): void {
    try {
      // Apply physics first to prevent overlap
      this.applySplitCellPhysics();

      // Process player inputs
      this.processPlayerInputs();

      // Update bot AI
      this.updateBots();

      // Update game state and physics
      this.updateGameState();

      // IMPROVED: Apply mass decay to large players
      this.applyMassDecay();

      // Clean up old split cells
      this.cleanupSplitCells();

      // Process collisions
      this.processCollisions();

      // Regenerate pellets if needed
      this.regeneratePellets();

      // Broadcast updates to players
      this.broadcastUpdates();

    } catch (error) {
      console.error('❌ Error in game loop:', error);
    }
  }

  private processPlayerInputs(): void {
    const globalRoom = this.roomService.getGlobalRoom();

    for (const [playerId, player] of globalRoom.players) {
      if (player.isBot) continue;

      // CRITICAL FIX: Check if this is a split cell
      const isSplitCell = (player as any).isSplitCell;

      if (isSplitCell) {
        // Check if parent still exists
        const parentId = (player as any).parentPlayerId;
        const parentExists = globalRoom.players.has(parentId);

        if (parentExists) {
          // Parent exists, skip this split cell (will be processed with parent)
          continue;
        } else {
          // FALLBACK: Parent doesn't exist, promote this split cell to main
          console.log(`⚠️ [INPUT] Parent ${parentId} not found for split ${playerId}, promoting to main`);
          delete (player as any).isSplitCell;
          delete (player as any).parentPlayerId;
          delete (player as any).canMergeAt;
          // Continue processing as main player
        }
      }

      // Process buffered inputs
      while (player.inputBuffer.length > 0) {
        const input = player.inputBuffer.shift();
        if (input) {
          this.processInput(player, input);

          // IMPROVED: Make split cells follow mouse independently
          // Each split cell moves towards the mouse position but with its own physics
          const parentId = player.socketId;
          for (const [splitId, splitCell] of globalRoom.players) {
            if ((splitCell as any).isSplitCell &&
                (splitCell as any).parentPlayerId === parentId) {
              // Process split cell movement independently
              // They all aim for the same mouse position but move based on their own position
              this.processInput(splitCell, input);
            }
          }
        }
      }
    }
  }

  private processInput(player: PlayerConnection, input: PlayerInput): void {
    // Initialize player as GamePlayer if needed
    const gamePlayer = asGamePlayer(player);

    // Track last processed input for reconciliation
    if (input.sequenceNumber !== undefined) {
      player.lastProcessedInputSeq = input.sequenceNumber;
    }

    // Update player position based on mouse position
    if (input.mousePosition) {
      const oldX = player.position.x;
      const oldY = player.position.y;
      
      // Simple movement towards mouse position
      const dx = input.mousePosition.x - player.position.x;
      const dy = input.mousePosition.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 5) {
        // REFACTORED: Type-safe player access
        const gamePlayer = asGamePlayer(player);
        const playerSize = gamePlayer.size;

        // Speed decreases with size (same logic as client)
        const speedMultiplier = Math.max(
          GAMEPLAY_CONSTANTS.PLAYER.MIN_SPEED_MULTIPLIER,
          1 - (playerSize - GAMEPLAY_CONSTANTS.PLAYER.INITIAL_SIZE) / GAMEPLAY_CONSTANTS.PLAYER.SPEED_DECAY_FACTOR
        );
        const moveSpeed = GAMEPLAY_CONSTANTS.PLAYER.BASE_SPEED * speedMultiplier;
        
        const newX = player.position.x + (dx / distance) * moveSpeed;
        const newY = player.position.y + (dy / distance) * moveSpeed;
        
        // Apply boundary constraints
        player.position.x = Math.max(20, Math.min(this.WORLD_SIZE.width - 20, newX));
        player.position.y = Math.max(20, Math.min(this.WORLD_SIZE.height - 20, newY));
        
        // Movement tracking disabled to reduce debug spam
      }
    }

    // Process actions
    if (input.actions && Array.isArray(input.actions)) {
      for (const action of input.actions) {
        this.processPlayerAction(player, action);
      }
    }
  }

  private processPlayerAction(player: PlayerConnection, action: string): void {
    // REFACTORED: Type-safe with GamePlayer
    const gamePlayer = asGamePlayer(player);
    const playerSize = gamePlayer.size;

    switch (action) {
      case 'split':
        // IMPROVED: Enhanced split mechanic with proper velocity and direction
        if (playerSize >= GAMEPLAY_CONSTANTS.SPLIT.MIN_SIZE) {
          const newSize = playerSize * GAMEPLAY_CONSTANTS.SPLIT.SIZE_RATIO;
          gamePlayer.size = newSize;

          // Ensure player has a color before creating split
          if (!(player as any).color) {
            (player as any).color = '#4ECDC4'; // Default color if not set
          }

          // Calculate split direction towards mouse position from last input
          let splitAngle = Math.random() * Math.PI * 2; // Default random angle
          const lastInput = player.inputBuffer[player.inputBuffer.length - 1] ||
                           { mousePosition: { x: player.position.x + 100, y: player.position.y } };

          if (lastInput?.mousePosition) {
            const dx = lastInput.mousePosition.x - player.position.x;
            const dy = lastInput.mousePosition.y - player.position.y;
            splitAngle = Math.atan2(dy, dx);
          }

          // IMPROVED: Calculate launch distance to prevent overlap
          // FIXED: Reduced launch distance for better visibility and control
          const launchSpeed = Math.min(150, 200 - playerSize); // Reduced launch speed for visibility
          // Ensure minimum distance is at least both cells' sizes combined plus buffer
          const minDistance = (newSize * 2) + 30; // Both cells' diameter plus smaller buffer
          const splitDistance = Math.min(150, Math.max(minDistance, playerSize * 1.5)); // Capped at 150 units to stay in viewport

          const splitPosition = {
            x: Math.max(newSize, Math.min(this.WORLD_SIZE.width - newSize,
                player.position.x + Math.cos(splitAngle) * splitDistance)),
            y: Math.max(newSize, Math.min(this.WORLD_SIZE.height - newSize,
                player.position.y + Math.sin(splitAngle) * splitDistance))
          };

          // Create new split cell as temporary player with velocity
          // FIXED: Always use socketId for consistency in parent-child relationships
          const parentId = player.socketId;
          const splitPlayerId = `${parentId}_split_${Date.now()}`;
          const splitPlayer: any = {
            socketId: player.socketId,
            playerId: splitPlayerId,
            position: splitPosition,
            isBot: false,
            connectedAt: new Date(),
            lastActivity: new Date(),
            inputBuffer: [],
            size: newSize,
            score: 0, // Split cells don't contribute to score
            mass: (newSize * newSize) / 100,
            isAlive: true, // CRITICAL: Must be true for split cells to be visible
            isSplitCell: true, // Mark as split cell
            parentPlayerId: parentId, // Track parent using consistent ID
            splitCreatedAt: Date.now(),
            velocity: { // Add initial velocity for launch effect
              // FIXED: Reduced velocity for more controlled split movement
              x: Math.cos(splitAngle) * (launchSpeed * 0.3),
              y: Math.sin(splitAngle) * (launchSpeed * 0.3)
            },
            canMergeAt: Date.now() + GAMEPLAY_CONSTANTS.SPLIT.MERGE_TIME_MS, // Can merge after 30 seconds
            // Additional properties for GamePlayer compatibility
            deathTime: undefined,
            killedBy: undefined,
            lastProcessedInputSeq: player.lastProcessedInputSeq, // Copy from parent
            lastBroadcast: 0,
            lastPosition: { ...splitPosition },
            // IMPROVED: Copy name and color from parent player
            // First check if player has a color, if not generate one
            name: (player as any).name || player.playerId,
            color: (player as any).color || '#4ECDC4' // Use parent's color or default
          };

          // Add split cell to room
          const globalRoom = this.roomService.getGlobalRoom();
          globalRoom.players.set(splitPlayerId, splitPlayer);

          console.log(`🔀 [SPLIT] Player ${parentId} split: ${playerSize.toFixed(1)} → 2x ${newSize.toFixed(1)} cells`);
          console.log(`🔀 [SPLIT] Created split cell: ${splitPlayerId}`);
          console.log(`🔀 [SPLIT] Split position: (${splitPosition.x.toFixed(0)}, ${splitPosition.y.toFixed(0)})`);
          console.log(`🔀 [SPLIT] Split properties:`, {
            isAlive: splitPlayer.isAlive,
            size: splitPlayer.size,
            color: splitPlayer.color,
            parentPlayerId: splitPlayer.parentPlayerId
          });
          console.log(`🔀 [SPLIT] Split direction: ${(splitAngle * 180/Math.PI).toFixed(0)}° with velocity ${launchSpeed}`);
          console.log(`🔀 [SPLIT] Can merge after ${new Date(splitPlayer.canMergeAt).toLocaleTimeString()}`);

          // Log total cells for this player
          const totalCells = Array.from(globalRoom.players.values()).filter(p =>
            p.playerId === parentId || (p as any).parentPlayerId === parentId
          ).length + 1; // +1 for the new split cell being created
          console.log(`🔀 [SPLIT] Player ${parentId} now has ${totalCells} cells`);
        } else {
          console.log(`⚠️ Player ${player.playerId} too small to split (size: ${playerSize.toFixed(1)}, min: ${GAMEPLAY_CONSTANTS.SPLIT.MIN_SIZE})`);
        }
        break;

      case 'eject':
      case 'eject_mass':
        // Mass ejection with constants
        if (playerSize >= GAMEPLAY_CONSTANTS.EJECT.MIN_SIZE) {
          const newSize = Math.max(
            GAMEPLAY_CONSTANTS.EJECT.MIN_REMAINING,
            playerSize - GAMEPLAY_CONSTANTS.EJECT.MASS_AMOUNT
          );
          gamePlayer.size = newSize;
          console.log(`💨 Player ${player.playerId} ejected mass: ${playerSize.toFixed(1)} → ${newSize.toFixed(1)}`);
          // TODO: Create actual ejected mass pellet in world
        } else {
          console.log(`⚠️ Player ${player.playerId} too small to eject (size: ${playerSize.toFixed(1)}, min: ${GAMEPLAY_CONSTANTS.EJECT.MIN_SIZE})`);
        }
        break;

      default:
        console.log(`❓ Unknown action: ${action} from player ${player.playerId}`);
    }
  }

  private updateBots(): void {
    const globalRoom = this.roomService.getGlobalRoom();

    for (const [playerId, player] of globalRoom.players) {
      if (player.isBot && player.botAI) {
        this.botService.updateBotAI(player);
      }
    }
  }

  /**
   * Apply repulsion physics between split cells early to prevent overlap
   */
  private applySplitCellPhysics(): void {
    const globalRoom = this.roomService.getGlobalRoom();

    for (const [playerId, player] of globalRoom.players) {
      const gamePlayer = asGamePlayer(player);

      // Apply repulsion physics between split cells of same player
      if ((player as any).isSplitCell) {
        const parentId = (player as any).parentPlayerId;
        if (parentId) {
          // Get all cells belonging to this player (parent + splits)
          const parentCell = globalRoom.players.get(parentId);
          const allPlayerCells: PlayerConnection[] = [];

          if (parentCell) {
            allPlayerCells.push(parentCell);
          }

          // Collect all split cells of this player
          for (const [otherId, otherPlayer] of globalRoom.players) {
            if ((otherPlayer as any).isSplitCell &&
                (otherPlayer as any).parentPlayerId === parentId &&
                otherId !== playerId) {
              allPlayerCells.push(otherPlayer);
            }
          }

          // Apply repulsion between current split and all other cells of same player
          for (const otherCell of allPlayerCells) {
            const dx = player.position.x - otherCell.position.x;
            const dy = player.position.y - otherCell.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const splitSize = asGamePlayer(player).size;
            const otherSize = asGamePlayer(otherCell).size;
            const minDistance = splitSize + otherSize;

            // IMPROVED: Adaptive repulsion based on merge readiness
            const now = Date.now();
            const canMergeAt = (player as any).canMergeAt || now;
            const timeUntilMerge = Math.max(0, canMergeAt - now);

            // FIXED: Only apply repulsion BEFORE merge time (first 30 seconds)
            if (timeUntilMerge > 0) {
              const mergeProgress = Math.max(0, 1 - (timeUntilMerge / GAMEPLAY_CONSTANTS.SPLIT.MERGE_TIME_MS)); // 0 to 1 over merge time

              // Reduce repulsion as merge approaches
              const baseRepulsion = 0.8;
              const minRepulsion = 0.2;
              const repulsionMultiplier = baseRepulsion - (baseRepulsion - minRepulsion) * mergeProgress;

              // If overlapping, apply adaptive repulsion force
              if (distance < minDistance && distance > 0) {
                const overlap = minDistance - distance;
                const repulsionStrength = overlap * repulsionMultiplier;

                // Push current cell away from other cell
                const pushX = (dx / distance) * repulsionStrength;
                const pushY = (dy / distance) * repulsionStrength;

                player.position.x += pushX;
                player.position.y += pushY;
              }
            } else {
              // After merge time: Apply ATTRACTION force to bring cells together
              const mergeRange = minDistance * 0.6; // Merge when 60% overlapping

              // IMPROVED: Always apply some attraction after merge time, regardless of distance
              if (distance > mergeRange && distance > 0) {
                // Calculate attraction strength based on distance
                // Closer = stronger attraction, farther = weaker but still present
                let attractionStrength;

                if (distance < minDistance * 2) {
                  // Very close - strong attraction
                  attractionStrength = 0.8;
                } else if (distance < minDistance * 5) {
                  // Medium distance - moderate attraction
                  attractionStrength = 0.4;
                } else if (distance < minDistance * 10) {
                  // Far - weak attraction
                  attractionStrength = 0.2;
                } else {
                  // Very far - minimal but still present attraction
                  attractionStrength = 0.1;
                }

                const pullX = -(dx / distance) * attractionStrength;
                const pullY = -(dy / distance) * attractionStrength;

                player.position.x += pullX;
                player.position.y += pullY;
              }
            }
          }
        }
      }

      // Also apply repulsion to parent cells from their splits
      if (!(player as any).isSplitCell) {
        // FIXED: Use socketId consistently for parent identification
        const parentId = player.socketId;

        // Find all splits of this parent
        for (const [splitId, splitPlayer] of globalRoom.players) {
          if ((splitPlayer as any).isSplitCell &&
              (splitPlayer as any).parentPlayerId === parentId) {
            const dx = player.position.x - splitPlayer.position.x;
            const dy = player.position.y - splitPlayer.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const parentSize = asGamePlayer(player).size;
            const splitSize = asGamePlayer(splitPlayer).size;
            const minDistance = parentSize + splitSize;

            // Check if merge time has passed for this split
            const now = Date.now();
            const canMergeAt = (splitPlayer as any).canMergeAt || now;
            const timeUntilMerge = Math.max(0, canMergeAt - now);

            // FIXED: Only apply repulsion if merge time hasn't passed
            if (timeUntilMerge > 0) {
              // If overlapping, apply repulsion force to parent
              if (distance < minDistance && distance > 0) {
                const overlap = minDistance - distance;
                const repulsionStrength = overlap * 0.6; // Moderate repulsion for parent

                // Push parent away from split
                const pushX = (dx / distance) * repulsionStrength;
                const pushY = (dy / distance) * repulsionStrength;

                player.position.x += pushX;
                player.position.y += pushY;
              }
            } else {
              // After merge time: Apply ATTRACTION to bring cells together
              const mergeRange = minDistance * 0.6; // Merge when 60% overlapping

              // IMPROVED: Always apply some attraction after merge time, regardless of distance
              if (distance > mergeRange && distance > 0) {
                // Calculate attraction strength based on distance
                // Closer = stronger attraction, farther = weaker but still present
                let attractionStrength;

                if (distance < minDistance * 2) {
                  // Very close - strong attraction
                  attractionStrength = 0.8;
                } else if (distance < minDistance * 5) {
                  // Medium distance - moderate attraction
                  attractionStrength = 0.4;
                } else if (distance < minDistance * 10) {
                  // Far - weak attraction
                  attractionStrength = 0.2;
                } else {
                  // Very far - minimal but still present attraction
                  attractionStrength = 0.1;
                }

                const pullX = -(dx / distance) * attractionStrength;
                const pullY = -(dy / distance) * attractionStrength;

                player.position.x += pullX;
                player.position.y += pullY;
              }
            }
          }
        }
      }
    }
  }

  private updateGameState(): void {
    // Update game state logic here
    const globalRoom = this.roomService.getGlobalRoom();
    globalRoom.lastActivity = new Date();

    // Apply boundary constraints and physics to all players
    for (const [playerId, player] of globalRoom.players) {
      const gamePlayer = asGamePlayer(player);

      // Apply velocity to split cells (gradually slows down)
      if ((player as any).velocity) {
        const velocity = (player as any).velocity;
        const friction = 0.98; // FIXED: Reduced friction for smoother movement

        // Update position based on velocity
        // FIXED: Apply velocity directly without dividing by tick rate (velocity already scaled)
        player.position.x += velocity.x;
        player.position.y += velocity.y;

        // Apply friction
        velocity.x *= friction;
        velocity.y *= friction;

        // Stop velocity when it's negligible
        if (Math.abs(velocity.x) < 0.5 && Math.abs(velocity.y) < 0.5) {
          delete (player as any).velocity;
        }
      }

      // NOTE: Repulsion physics between split cells has been moved to applySplitCellPhysics()
      // which runs at the beginning of the game loop tick for better collision prevention

      // IMPROVED: Merge cells of same player after merge time
      // Check if this cell can merge with other cells of same player
      const now = Date.now();
      const playerGameData = asGamePlayer(player);

      // Determine the owner of this cell (either the player itself or its parent)
      const ownerId = (player as any).isSplitCell ? (player as any).parentPlayerId : player.socketId;

      // Check if this cell can merge (either it's a split cell past merge time, or it's a parent with mergeable splits)
      const canThisCellMerge = (player as any).isSplitCell
        ? ((player as any).canMergeAt && (player as any).canMergeAt <= now)
        : true; // Parent cells can always receive merges

      if (ownerId && canThisCellMerge) {
        // Find all other cells belonging to the same player
        for (const [otherId, otherPlayer] of globalRoom.players) {
          if (otherId === playerId) continue; // Skip self

          const otherOwnerId = (otherPlayer as any).isSplitCell
            ? (otherPlayer as any).parentPlayerId
            : otherPlayer.socketId;

          // Check if both cells belong to same player
          if (otherOwnerId === ownerId) {
            const otherGameData = asGamePlayer(otherPlayer);

            // Check if the other cell can also merge
            const canOtherCellMerge = (otherPlayer as any).isSplitCell
              ? ((otherPlayer as any).canMergeAt && (otherPlayer as any).canMergeAt <= now)
              : true;

            if (canOtherCellMerge) {
              // Calculate distance between cells
              const dx = player.position.x - otherPlayer.position.x;
              const dy = player.position.y - otherPlayer.position.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              // IMPROVED: After merge time, require less overlap (60% instead of 80%)
              const overlapRequired = ((player as any).canMergeAt && (player as any).canMergeAt <= now) ||
                                    ((otherPlayer as any).canMergeAt && (otherPlayer as any).canMergeAt <= now)
                                    ? 0.6 : 0.8;
              const touchDistance = (playerGameData.size + otherGameData.size) * overlapRequired;

              // If cells are overlapping enough, merge them
              if (distance < touchDistance) {
                // CRITICAL FIX: Determine which cell to preserve
                // ALWAYS preserve the main player (non-split cell) to avoid losing control
                let preservedCell: PlayerConnection;
                let absorbedCell: PlayerConnection;
                let preservedId: string;
                let absorbedId: string;

                // Check if either cell is the main player (non-split)
                const playerIsSplit = (player as any).isSplitCell;
                const otherIsSplit = (otherPlayer as any).isSplitCell;

                if (!playerIsSplit && otherIsSplit) {
                  // Player is main, other is split - ALWAYS preserve main
                  preservedCell = player;
                  absorbedCell = otherPlayer;
                  preservedId = playerId;
                  absorbedId = otherId;
                } else if (playerIsSplit && !otherIsSplit) {
                  // Other is main, player is split - ALWAYS preserve main
                  preservedCell = otherPlayer;
                  absorbedCell = player;
                  preservedId = otherId;
                  absorbedId = playerId;
                } else {
                  // Both are same type (both split or both main) - preserve larger
                  const isPlayerLarger = playerGameData.size >= otherGameData.size;
                  preservedCell = isPlayerLarger ? player : otherPlayer;
                  absorbedCell = isPlayerLarger ? otherPlayer : player;
                  preservedId = isPlayerLarger ? playerId : otherId;
                  absorbedId = isPlayerLarger ? otherId : playerId;
                }

                // Get game data for both cells
                const preservedData = asGamePlayer(preservedCell);
                const absorbedData = asGamePlayer(absorbedCell);

                // Calculate new size for preserved cell
                const totalMass = preservedData.mass + absorbedData.mass;
                preservedData.size = Math.sqrt(totalMass * 100);
                preservedData.mass = totalMass;

                // If the absorbed cell was a split cell, clear split status from preserved if it becomes main
                if ((absorbedCell as any).isSplitCell && !(preservedCell as any).isSplitCell) {
                  // Main player absorbed a split - just update size
                  console.log(`🔄 [MERGE] Main player absorbed split cell`);
                }

                // Remove absorbed cell from game
                globalRoom.players.delete(absorbedId);

                console.log(`🔄 [MERGE] Cells merged: ${absorbedId} absorbed into ${preservedId}. New size: ${preservedData.size.toFixed(1)}`);
                console.log(`🔄 [MERGE] Preserved cell is ${(preservedCell as any).isSplitCell ? 'split' : 'main'} player`);

                // Broadcast merge event
                const playerSockets = this.roomService.getAllPlayerSockets();
                for (const [socketId, socket] of playerSockets) {
                  if (socket && socket.connected) {
                    socket.emit('split_merged', {
                      splitCellId: absorbedId,
                      parentId: preservedId,
                      timestamp: Date.now()
                    });
                  }
                }

                // If current cell was absorbed, skip rest of processing for this iteration
                if (absorbedId === playerId) {
                  continue; // Skip boundary check for deleted cell
                }
                break; // Only merge with one cell per tick
              }
            }
          }
        }
      }

      // Apply boundary constraints
      const size = gamePlayer.size;
      player.position.x = Math.max(size, Math.min(this.WORLD_SIZE.width - size, player.position.x));
      player.position.y = Math.max(size, Math.min(this.WORLD_SIZE.height - size, player.position.y));
    }
  }

  private broadcastUpdates(): void {
    const globalRoom = this.roomService.getGlobalRoom();
    const playerSockets = this.roomService.getAllPlayerSockets();
    const now = Date.now();

    // IMPROVED: Create comprehensive game update with ALL necessary data
    const allPlayers = Array.from(globalRoom.players.values());

    // PHASE 7: Delta compression - only send changed data
    // Full update structure (used as base)
    const baseGameUpdate = {
      timestamp: now,
      players: allPlayers.map(player => {
        const gp = asGamePlayer(player);
        // IMPROVED: Always use server-stored color for consistency
        let playerColor = (player as any).color;
        let playerName = (player as any).name;

        // If no color stored (shouldn't happen), generate one
        if (!playerColor) {
          playerColor = player.isBot ? '#888888' : '#4ECDC4';
        }
        if (!playerName) {
          playerName = player.isBot ? `Bot${player.playerId.slice(-4)}` : player.playerId;
        }

        // If it's a split cell, inherit parent's color and name
        if ((player as any).isSplitCell && (player as any).parentPlayerId) {
          const parent = allPlayers.find(p => p.playerId === (player as any).parentPlayerId);
          if (parent) {
            playerColor = (parent as any).color || playerColor;
            playerName = (parent as any).name || playerName;
          }
        }

        return {
          id: player.playerId,
          position: player.position,
          size: gp.size,
          color: playerColor,
          score: gp.score,
          isAlive: gp.isAlive,
          isBot: player.isBot || false,
          mass: gp.mass,
          lastProcessedInput: player.lastProcessedInputSeq,
          isSplitCell: (player as any).isSplitCell || false,
          parentPlayerId: (player as any).parentPlayerId,
          canMergeAt: (player as any).canMergeAt,
          name: playerName
        };
      }),
      gameState: {
        pellets: Array.from(this.pelletService.getPellets().values()).map(pellet => ({
          id: pellet.id,
          position: pellet.position,
          size: pellet.size,
          color: pellet.color
        })),
        totalPlayers: allPlayers.length,
        alivePlayers: allPlayers.filter(p => asGamePlayer(p).isAlive).length
      }
    };

    // PHASE 6 + 7: Adaptive broadcast with delta compression
    let broadcastCount = 0;
    let fullUpdates = 0;
    let deltaUpdates = 0;

    for (const [playerId, socket] of playerSockets) {
      if (socket && socket.connected) {
        const player = globalRoom.players.get(playerId);
        if (!player) continue;

        // Check if player needs update (adaptive rate)
        const lastBroadcast = player.lastBroadcast || 0;
        const timeSinceLastBroadcast = now - lastBroadcast;

        // Check if player moved significantly
        const hasMoved = player.lastPosition
          ? Math.hypot(
              player.position.x - player.lastPosition.x,
              player.position.y - player.lastPosition.y
            ) > 1.0
          : true;

        // Adaptive broadcast rates
        const updateInterval = hasMoved
          ? 1000 / GAMEPLAY_CONSTANTS.NETWORK.TICK_RATE // 30 TPS for moving players
          : 1000 / 10; // 10 TPS for idle players

        if (timeSinceLastBroadcast >= updateInterval) {
          // PHASE 7: Send full update every 1 second, delta updates in between
          const sendFullUpdate = timeSinceLastBroadcast >= 1000 || !player.lastBroadcast;

          if (sendFullUpdate) {
            // IMPROVED: Filter out ALL dead players (including self) to hide immediately on death
            const filteredGameUpdate = {
              ...baseGameUpdate,
              players: baseGameUpdate.players.filter(p => p.isAlive)
            };
            socket.emit('game_update', filteredGameUpdate);
            fullUpdates++;
          } else {
            // Delta update: only send changed player positions + ALWAYS include pellets
            // CRITICAL FIX: Always include split cells and newly created players in delta updates
            const deltaUpdate = {
              timestamp: now,
              isDelta: true,
              players: baseGameUpdate.players
                .filter(p => {
                  // ALWAYS include split cells (they need to be visible immediately)
                  // Check this FIRST before any other filtering
                  if (p.isSplitCell) return true;

                  // Hide dead players (only for non-split cells)
                  if (!p.isAlive) return false;

                  // Get the actual player's lastPosition from globalRoom
                  const actualPlayer = globalRoom.players.get(p.id);
                  if (!actualPlayer || !actualPlayer.lastPosition) return true; // Include if no lastPosition

                  // Only include players that moved significantly
                  return Math.hypot(
                    p.position.x - actualPlayer.lastPosition.x,
                    p.position.y - actualPlayer.lastPosition.y
                  ) > 0.5;
                })
                .map(p => ({
                  id: p.id,
                  position: p.position,
                  size: p.size,
                  score: p.score,
                  lastProcessedInput: p.lastProcessedInput,
                  isAlive: p.isAlive,
                  // CRITICAL FIX: Include these properties for split cells to render correctly
                  color: p.color,
                  isSplitCell: p.isSplitCell,
                  parentPlayerId: p.parentPlayerId,
                  canMergeAt: p.canMergeAt,
                  name: p.name
                })),
              gameState: {
                pellets: baseGameUpdate.gameState.pellets,
                totalPlayers: baseGameUpdate.gameState.totalPlayers,
                alivePlayers: baseGameUpdate.gameState.alivePlayers
              }
            };

            socket.emit('game_update', deltaUpdate);
            deltaUpdates++;
          }

          player.lastBroadcast = now;
          player.lastPosition = { ...player.position };

          // CRITICAL FIX: Also update lastBroadcast and lastPosition for all split cells of this player
          // FIXED: Use socketId consistently
          const parentId = player.socketId;
          for (const [splitId, splitCell] of globalRoom.players) {
            if ((splitCell as any).isSplitCell && (splitCell as any).parentPlayerId === parentId) {
              splitCell.lastBroadcast = now;
              if (!splitCell.lastPosition) {
                splitCell.lastPosition = { ...splitCell.position };
              }
            }
          }

          broadcastCount++;
        }
      }
    }

    // Removed broadcast stats logging to reduce spam
  }

  private broadcastPlayerUpdate(playerId: string, playerData: any): void {
    const playerSockets = this.roomService.getAllPlayerSockets();
    
    // Immediate update for specific player action
    const playerUpdate = {
      timestamp: Date.now(),
      type: 'player_update',
      player: playerData
    };

    // Broadcast to all connected players for immediate sync
    for (const [socketId, socket] of playerSockets) {
      if (socket && socket.connected) {
        socket.emit('player_update', playerUpdate);
      }
    }
  }

  private broadcastPelletRemoval(pelletId: string): void {
    const playerSockets = this.roomService.getAllPlayerSockets();
    
    // Immediate pellet removal notification
    const pelletRemoval = {
      timestamp: Date.now(),
      type: 'pellet_removed',
      pelletId: pelletId
    };

    // Broadcast to all connected players
    for (const [socketId, socket] of playerSockets) {
      if (socket && socket.connected) {
        socket.emit('pellet_removed', pelletRemoval);
      }
    }
  }

  private broadcastDeathEvent(deathData: {
    killerId: string;
    killerName: string;
    killerSize: number;
    killerScore: number;
    victimId: string;
    victimName: string;
    victimSize: number;
    timestamp: number;
  }): void {
    const playerSockets = this.roomService.getAllPlayerSockets();
    
    // Death event notification
    const deathEvent = {
      timestamp: Date.now(),
      type: 'player_death',
      data: deathData
    };

    // Broadcast to all connected players
    for (const [socketId, socket] of playerSockets) {
      if (socket && socket.connected) {
        socket.emit('player_death', deathEvent);
      }
    }
    
    console.log(`💀 Broadcasted death event: ${deathData.killerName} killed ${deathData.victimName} to ${playerSockets.size} clients`);
  }

  private handlePlayerDeath(globalRoom: any, victimId: string, killerId: string): void {
    const victim = globalRoom.players.get(victimId);
    if (!victim) return;

    const isBot = victim.isBot;

    if (isBot) {
      // For bots, simply respawn them
      this.respawnPlayer(globalRoom, victimId);
    } else {
      // For human players, mark as dead and let client handle game over
      const victimPlayer = asGamePlayer(victim);
      victimPlayer.isAlive = false;
      victimPlayer.deathTime = Date.now();
      victimPlayer.killedBy = killerId;

      console.log(`💀 Human player ${victimId} marked as dead, killed by ${killerId}`);

      // Notify the specific player about their death
      const playerSockets = this.roomService.getAllPlayerSockets();
      const victimSocket = playerSockets.get(victimId);

      if (victimSocket && victimSocket.connected) {
        victimSocket.emit('you_died', {
          killedBy: killerId,
          timestamp: Date.now()
        });
      }

      // IMPROVED: Remove dead player from other players' view immediately
      // The player still exists in the game but is marked as dead
      // This prevents multiple eating while still allowing respawn

      // REMOVED: Auto-respawn - now handled by client modal
      // Players must explicitly choose to respawn or return to lobby
    }
  }

  public addPlayerInput(playerId: string, input: PlayerInput): void {
    const globalRoom = this.roomService.getGlobalRoom();
    const player = globalRoom.players.get(playerId);
    
    if (player && !player.isBot) {
      player.inputBuffer.push(input);
      
      // Limit buffer size to prevent memory issues
      if (player.inputBuffer.length > 10) {
        player.inputBuffer.shift();
      }
    }
  }

  public isRunning(): boolean {
    return this.gameLoopInterval !== null;
  }

  public getTickRate(): number {
    return this.TICK_RATE;
  }

  public getPelletService(): PelletService {
    return this.pelletService;
  }
  
  private processCollisions(): void {
    const globalRoom = this.roomService.getGlobalRoom();

    // Check player-pellet collisions using CollisionService
    const eatenPellets = this.collisionService.checkPlayerPelletCollisions(
      globalRoom,
      this.pelletService.getPellets(),
      this.gameId || undefined
    );

    // Remove eaten pellets
    this.pelletService.removePellets(eatenPellets);

    // Check player vs player collisions using CollisionService
    const deathEvents = this.collisionService.checkPlayerVsPlayerCollisions(
      globalRoom,
      this.gameId || undefined
    );

    // Handle death events
    for (const event of deathEvents) {
      const victim = globalRoom.players.get(event.victimId);
      const victimPlayer = victim ? asGamePlayer(victim) : null;

      this.broadcastDeathEvent({
        killerId: event.killerId,
        killerName: globalRoom.players.get(event.killerId)?.isBot ? 'Bot' : 'Player',
        killerSize: event.killerNewSize,
        killerScore: event.killerNewScore,
        victimId: event.victimId,
        victimName: globalRoom.players.get(event.victimId)?.isBot ? 'Bot' : 'Player',
        victimSize: victimPlayer?.size || 0,
        timestamp: Date.now(),
      });

      this.handlePlayerDeath(globalRoom, event.victimId, event.killerId);
    }
  }
  
  private regeneratePellets(): void {
    this.pelletService.regeneratePellets();
  }
  
  public getPelletsCount(): number {
    return this.pelletService.getPelletsCount();
  }
  
  private respawnPlayer(globalRoom: any, playerId: string): void {
    const player = globalRoom.players.get(playerId);
    if (!player) return;

    const gamePlayer = asGamePlayer(player);
    const isBot = player.isBot;
    const oldScore = gamePlayer.score;

    // Reset player stats
    gamePlayer.size = GAMEPLAY_CONSTANTS.PLAYER.INITIAL_SIZE;
    gamePlayer.isAlive = true;
    gamePlayer.deathTime = undefined;
    gamePlayer.killedBy = undefined;

    // Score penalty for humans, bots keep their score
    if (!isBot) {
      gamePlayer.score = Math.max(0, oldScore - Math.floor(oldScore * GAMEPLAY_CONSTANTS.RESPAWN.SCORE_PENALTY));
    }

    // Respawn at safe random position
    player.position = this.pelletService.generateSafePelletPosition(globalRoom);

    const logPrefix = isBot ? '🤖' : '👤';
    console.log(`🔄 ${logPrefix} Player ${playerId} respawned at (${Math.floor(player.position.x)}, ${Math.floor(player.position.y)}), score: ${oldScore} → ${gamePlayer.score}`);
    console.log(`🔄 [RESPAWN] isAlive set to: ${gamePlayer.isAlive}`);

    // REMOVED: Immediate broadcasts cause client conflicts
    // Respawn will be reflected in regular broadcastUpdates()
  }

  /**
   * Clean up dead split cells
   * Split cells are only removed when they die or merge
   */
  private cleanupSplitCells(): void {
    const globalRoom = this.roomService.getGlobalRoom();

    const cellsToRemove: string[] = [];

    for (const [playerId, player] of globalRoom.players) {
      const gamePlayer = asGamePlayer(player);

      // Check if it's a split cell
      if ((player as any).isSplitCell) {
        // FIXED: Only remove if dead, NOT based on age
        // Split cells should persist until they merge or die
        if (!gamePlayer.isAlive) {
          cellsToRemove.push(playerId);
        }
      }
    }

    // Remove expired split cells
    for (const playerId of cellsToRemove) {
      globalRoom.players.delete(playerId);
      console.log(`🧹 Removed expired split cell: ${playerId}`);
    }
  }

  /**
   * IMPROVED: Agar.io-like mass decay system
   * Large cells slowly lose mass over time
   */
  private applyMassDecay(): void {
    const globalRoom = this.roomService.getGlobalRoom();

    for (const [playerId, player] of globalRoom.players) {
      const gamePlayer = asGamePlayer(player);

      // Only apply decay to cells larger than threshold
      if (gamePlayer.size > GAMEPLAY_CONSTANTS.DECAY.THRESHOLD) {
        // Decay rate increases with size
        const decayAmount = GAMEPLAY_CONSTANTS.DECAY.RATE * (gamePlayer.size - GAMEPLAY_CONSTANTS.DECAY.THRESHOLD);
        const newSize = Math.max(GAMEPLAY_CONSTANTS.DECAY.MIN_SIZE, gamePlayer.size - decayAmount);

        if (newSize !== gamePlayer.size) {
          const oldSize = gamePlayer.size;
          gamePlayer.size = newSize;

          // Log decay for debugging (only for significant changes)
          if (oldSize - newSize > 0.5) {
            const logPrefix = player.isBot ? '🤖' : '👤';
            console.log(`⏳ ${logPrefix} Player ${playerId} mass decay: ${oldSize.toFixed(1)} → ${newSize.toFixed(1)}`);
          }
        }
      }
    }
  }
}