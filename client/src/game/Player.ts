import type { Vector2 } from '../utils/mathUtils';
import { MathUtils } from '../utils/mathUtils';
import { NETWORK_CONSTANTS } from 'shared';

/**
 * State snapshot for interpolation
 */
interface StateSnapshot {
  position: Vector2;
  size: number;
  timestamp: number;
}

export class Player {
  public id: string;
  public position: Vector2;
  public targetPosition: Vector2;
  public size: number = 20;
  public mass: number = 20;
  public color: string;
  public score: number = 0;
  public isAlive: boolean = true;
  public isLocalPlayer: boolean = false;

  private maxSpeed: number = 2; // Further reduced for slower gameplay
  private acceleration: number = 0.1; // Reduced for smoother, more strategic movement
  public velocity: Vector2 = { x: 0, y: 0 };

  // IMPROVED: Adjusted for better agar.io-like feel
  private readonly FRICTION = 0.95;

  // PHASE 3: State buffer for interpolation (remote players only)
  private stateBuffer: StateSnapshot[] = [];
  private readonly MAX_BUFFER_SIZE = 30; // ~1 second at 30 TPS

  constructor(
    id: string,
    position: Vector2,
    color: string,
    isLocalPlayer: boolean = false
  ) {
    this.id = id;
    this.position = { ...position };
    this.targetPosition = { ...position };
    this.color = color;
    this.isLocalPlayer = isLocalPlayer;
  }

  update(mousePosition?: Vector2, deltaTime: number = 16.67): void {
    if (!this.isAlive) return;

    // Only update size based on mass for non-multiplayer or non-local players
    // In multiplayer, local player size is managed by server updates
    if (!this.isLocalPlayer) {
      this.size = Math.sqrt(this.mass) + 10;
    }

    if (this.isLocalPlayer && mousePosition) {
      // Local player moves toward mouse
      this.moveToward(mousePosition, deltaTime);

      // PHASE 5: Apply velocity with delta time for frame-rate independence
      const deltaMultiplier = deltaTime / 16.67; // Normalize to 60 FPS
      this.position.x += this.velocity.x * deltaMultiplier;
      this.position.y += this.velocity.y * deltaMultiplier;

      // Apply friction
      this.velocity.x *= 0.95;
      this.velocity.y *= 0.95;
    } else {
      // PHASE 3: Remote players use interpolation for smooth movement
      this.updateInterpolated();
    }
  }

  /**
   * PHASE 3: Add server state to interpolation buffer
   * Called when receiving server updates for remote players
   */
  public addServerState(position: Vector2, size: number, timestamp: number): void {
    this.stateBuffer.push({ position: { ...position }, size, timestamp });

    // Limit buffer size
    if (this.stateBuffer.length > this.MAX_BUFFER_SIZE) {
      this.stateBuffer.shift();
    }
  }

  /**
   * PHASE 3: Update position using interpolation
   * Render remote players ~100ms in the past for smooth movement
   */
  private updateInterpolated(): void {
    if (this.stateBuffer.length < 2) {
      // Not enough data, fallback to direct movement
      this.moveToward(this.targetPosition);
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      this.velocity.x *= 0.95;
      this.velocity.y *= 0.95;
      return;
    }

    // Render in the past by INTERPOLATION_DELAY
    const renderTime = Date.now() - NETWORK_CONSTANTS.INTERPOLATION_DELAY;

    // Find two states to interpolate between
    let previous: StateSnapshot | null = null;
    let next: StateSnapshot | null = null;

    for (let i = 0; i < this.stateBuffer.length - 1; i++) {
      if (this.stateBuffer[i].timestamp <= renderTime && this.stateBuffer[i + 1].timestamp >= renderTime) {
        previous = this.stateBuffer[i];
        next = this.stateBuffer[i + 1];
        break;
      }
    }

    // If no valid interpolation range, use latest state
    if (!previous || !next) {
      const latest = this.stateBuffer[this.stateBuffer.length - 1];
      this.position = { ...latest.position };
      this.size = latest.size;
      return;
    }

    // Linear interpolation
    const timeDiff = next.timestamp - previous.timestamp;
    const t = timeDiff > 0 ? (renderTime - previous.timestamp) / timeDiff : 0;

    this.position.x = previous.position.x + (next.position.x - previous.position.x) * t;
    this.position.y = previous.position.y + (next.position.y - previous.position.y) * t;
    this.size = previous.size + (next.size - previous.size) * t;

    // Clean up old states
    const cutoffTime = Date.now() - 1000; // Keep last 1 second
    while (this.stateBuffer.length > 0 && this.stateBuffer[0].timestamp < cutoffTime) {
      this.stateBuffer.shift();
    }
  }

  private moveToward(target: Vector2, deltaTime: number = 16.67): void {
    const direction = {
      x: target.x - this.position.x,
      y: target.y - this.position.y
    };

    const distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y);

    if (distance > 5) {
      const normalizedDirection = MathUtils.normalize(direction);

      // IMPROVED: Speed decreases with size (consistent with server)
      // Smoother decay curve matching server-side logic
      const speedMultiplier = Math.max(0.15, 1 - (this.size - 25) / 200);
      const speed = this.maxSpeed * speedMultiplier;

      // PHASE 5: Apply acceleration with delta time
      const deltaMultiplier = deltaTime / 16.67; // Normalize to 60 FPS
      this.velocity.x += normalizedDirection.x * this.acceleration * speed * deltaMultiplier;
      this.velocity.y += normalizedDirection.y * this.acceleration * speed * deltaMultiplier;

      // Limit max velocity
      const currentSpeed = Math.sqrt(
        this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
      );
      if (currentSpeed > speed) {
        this.velocity.x = (this.velocity.x / currentSpeed) * speed;
        this.velocity.y = (this.velocity.y / currentSpeed) * speed;
      }
    }
  }

  setTargetPosition(position: Vector2): void {
    this.targetPosition = { ...position };
  }

  grow(amount: number): void {
    this.mass += amount;
    this.score += Math.floor(amount * 10);
  }

  split(): Player[] {
    if (this.mass < 40) return []; // Can't split if too small

    const splitMass = this.mass / 2;
    const angle = Math.random() * Math.PI * 2;
    const distance = this.size + 20;

    // Create new cell
    const newPosition = {
      x: this.position.x + Math.cos(angle) * distance,
      y: this.position.y + Math.sin(angle) * distance
    };

    const newCell = new Player(
      this.id + '_split',
      newPosition,
      this.color,
      this.isLocalPlayer
    );
    newCell.mass = splitMass;

    // Reduce original cell mass
    this.mass = splitMass;

    return [newCell];
  }

  ejectMass(): { position: Vector2; mass: number; color: string } | null {
    if (this.mass < 25) return null; // Can't eject if too small

    const ejectedMass = 5;
    this.mass -= ejectedMass;

    // Eject in random direction
    const angle = Math.random() * Math.PI * 2;
    const distance = this.size + 15;

    return {
      position: {
        x: this.position.x + Math.cos(angle) * distance,
        y: this.position.y + Math.sin(angle) * distance
      },
      mass: ejectedMass,
      color: this.color
    };
  }

  canEat(other: Player): boolean {
    if (!this.isAlive || !other.isAlive) return false;
    if (this.id === other.id) return false;
    
    const distance = MathUtils.distance(this.position, other.position);
    const requiredSize = other.size * 1.2; // Must be 20% bigger to eat
    
    return this.size > requiredSize && distance < this.size - other.size / 2;
  }

  eat(other: Player): void {
    if (!this.canEat(other)) return;
    
    this.grow(other.mass * 0.8); // Gain 80% of eaten player's mass
    other.isAlive = false;
  }

  render(ctx: CanvasRenderingContext2D, camera: any): void {
    if (!this.isAlive) return;

    const screenPos = camera.worldToScreen(this.position);
    const screenSize = this.size * camera.zoom;

    // Don't render if too small or off-screen
    if (screenSize < 2) return;

    // Check if this is a split cell
    const isSplitCell = (this as any).isSplitCell;
    const parentPlayerId = (this as any).parentPlayerId;

    // DEBUGGING: Log split cell rendering
    if (isSplitCell && Math.random() < 0.01) { // Log 1% of frames to avoid spam
      console.log(`🎨 [Player.render] Rendering split cell:`, {
        id: this.id.substring(0, 25),
        parentPlayerId: parentPlayerId?.substring(0, 25),
        position: `(${this.position.x.toFixed(0)}, ${this.position.y.toFixed(0)})`,
        screenPos: `(${screenPos.x.toFixed(0)}, ${screenPos.y.toFixed(0)})`,
        size: this.size.toFixed(1),
        screenSize: screenSize.toFixed(1),
        isAlive: this.isAlive,
        color: this.color
      });
    }

    // Draw cell body
    ctx.fillStyle = this.color;

    // IMPROVED: Different style for split cells
    if (isSplitCell) {
      // Split cells have dashed border and slight transparency
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#ff0';  // Yellow border for split cells
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]); // Dashed line
    } else if (this.isLocalPlayer) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.setLineDash([]); // Solid line
    } else {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.setLineDash([]); // Solid line
    }

    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, screenSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Reset line dash and alpha
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Draw player name/ID if large enough
    if (screenSize > 20) {
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.max(12, screenSize / 3)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let displayName = this.isLocalPlayer ? 'You' : this.id.substring(0, 8);

      // IMPROVED: Show parent info for split cells
      if (isSplitCell) {
        displayName = `Split`;

        // Calculate merge timer
        const canMergeAt = (this as any).canMergeAt;
        let mergeText = '';
        if (canMergeAt) {
          const now = Date.now();
          const timeRemaining = Math.max(0, canMergeAt - now);
          const secondsRemaining = Math.ceil(timeRemaining / 1000);

          if (secondsRemaining > 0) {
            mergeText = `${secondsRemaining}s`;
          } else {
            mergeText = 'Ready!';
          }
        }

        // Also show smaller text with parent info
        if (screenSize > 30) {
          ctx.font = `${Math.max(10, screenSize / 4)}px Arial`;
          ctx.fillText(
            displayName,
            screenPos.x,
            screenPos.y - 10
          );

          // Show merge timer
          if (mergeText) {
            ctx.font = `${Math.max(8, screenSize / 5)}px Arial`;
            ctx.fillStyle = mergeText === 'Ready!' ? '#4ECDC4' : '#ccc';
            ctx.fillText(
              mergeText,
              screenPos.x,
              screenPos.y + 5
            );
          }

          ctx.font = `${Math.max(8, screenSize / 6)}px Arial`;
          ctx.fillStyle = '#999';
          ctx.fillText(
            `(${parentPlayerId ? parentPlayerId.substring(0, 8) : 'unknown'})`,
            screenPos.x,
            screenPos.y + 18
          );
        } else {
          // Smaller cells just show merge timer
          if (mergeText) {
            ctx.font = `${Math.max(10, screenSize / 3)}px Arial`;
            ctx.fillStyle = mergeText === 'Ready!' ? '#4ECDC4' : '#fff';
            ctx.fillText(mergeText, screenPos.x, screenPos.y);
          } else {
            ctx.fillText(displayName, screenPos.x, screenPos.y);
          }
        }
      } else {
        ctx.fillText(displayName, screenPos.x, screenPos.y);
      }
    }
  }
}