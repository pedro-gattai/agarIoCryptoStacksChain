import type { Vector2 } from '../utils/mathUtils';
import { MathUtils } from '../utils/mathUtils';

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

  update(mousePosition?: Vector2): void {
    if (!this.isAlive) return;

    // Only update size based on mass for non-multiplayer or non-local players
    // In multiplayer, local player size is managed by server updates
    if (!this.isLocalPlayer) {
      this.size = Math.sqrt(this.mass) + 10;
    }

    if (this.isLocalPlayer && mousePosition) {
      // Local player moves toward mouse
      this.moveToward(mousePosition);
    } else {
      // Remote players move toward their target position
      this.moveToward(this.targetPosition);
    }

    // Apply velocity
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // Apply friction
    this.velocity.x *= 0.95;
    this.velocity.y *= 0.95;
  }

  private moveToward(target: Vector2): void {
    const direction = {
      x: target.x - this.position.x,
      y: target.y - this.position.y
    };

    const distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    
    if (distance > 5) {
      const normalizedDirection = MathUtils.normalize(direction);
      
      // Speed decreases with size (consistent with server)
      const speedMultiplier = Math.max(0.2, 1 - (this.size - 25) / 120);
      const speed = this.maxSpeed * speedMultiplier;

      // Apply acceleration toward target
      this.velocity.x += normalizedDirection.x * this.acceleration * speed;
      this.velocity.y += normalizedDirection.y * this.acceleration * speed;

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

    // Draw cell body
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.isLocalPlayer ? '#fff' : '#333';
    ctx.lineWidth = this.isLocalPlayer ? 3 : 2;
    
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, screenSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw player name/ID if large enough
    if (screenSize > 20) {
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.max(12, screenSize / 3)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        this.isLocalPlayer ? 'You' : this.id.substring(0, 8),
        screenPos.x,
        screenPos.y
      );
    }
  }
}