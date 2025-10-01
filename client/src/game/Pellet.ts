import type { Vector2 } from '../utils/mathUtils';
import { MathUtils } from '../utils/mathUtils';

export class Pellet {
  public id: string;
  public position: Vector2;
  public size: number;
  public mass: number;
  public color: string;
  public isAlive: boolean = true;

  constructor(id: string, position: Vector2, size: number = 3) {
    this.id = id;
    this.position = { ...position };
    this.size = size;
    this.mass = size;
    this.color = MathUtils.randomColor();
  }

  render(ctx: CanvasRenderingContext2D, camera: any): void {
    if (!this.isAlive) return;

    const screenPos = camera.worldToScreen(this.position);
    const screenSize = this.size * camera.zoom;

    // Don't render if too small
    if (screenSize < 1) return;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, screenSize, 0, Math.PI * 2);
    ctx.fill();

    // Add slight border for better visibility
    if (screenSize > 2) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  static generatePellets(
    count: number,
    worldWidth: number,
    worldHeight: number,
    avoidAreas: Array<{ position: Vector2; radius: number }> = []
  ): Pellet[] {
    const pellets: Pellet[] = [];

    for (let i = 0; i < count; i++) {
      let position: Vector2;
      let attempts = 0;
      const maxAttempts = 10;

      // Try to place pellet away from avoid areas (like spawn points)
      do {
        position = {
          x: MathUtils.randomFloat(50, worldWidth - 50),
          y: MathUtils.randomFloat(50, worldHeight - 50)
        };
        attempts++;
      } while (
        attempts < maxAttempts &&
        avoidAreas.some(area =>
          MathUtils.distance(position, area.position) < area.radius + 30
        )
      );

      const size = MathUtils.randomFloat(2, 5);
      const pellet = new Pellet(`pellet_${i}_${Date.now()}`, position, size);
      pellets.push(pellet);
    }

    return pellets;
  }
}