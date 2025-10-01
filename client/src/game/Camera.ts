import type { Vector2 } from '../utils/mathUtils';
import { MathUtils } from '../utils/mathUtils';

export class Camera {
  public position: Vector2 = { x: 0, y: 0 };
  public targetPosition: Vector2 = { x: 0, y: 0 };
  public zoom: number = 1;
  public targetZoom: number = 1;
  
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;
  private smoothing: number = 0.1;
  private zoomSmoothing: number = 0.05;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  update(playerPosition?: Vector2, playerSize?: number): void {
    if (playerPosition && playerSize) {
      // Calculate target zoom based on player size
      const baseZoom = Math.max(0.5, Math.min(2, 50 / playerSize));
      this.targetZoom = baseZoom;

      // Update target position to follow player
      this.targetPosition = { ...playerPosition };
    } else {
      // Fallback: center camera on world if no player
      console.log('📷 Camera: No player found, using fallback position');
      this.targetPosition = { x: 1500, y: 1500 }; // Center of 3000x3000 world
      this.targetZoom = 0.8; // Good default zoom level
    }

    // Smooth camera movement
    this.position = MathUtils.lerpVector(
      this.position,
      this.targetPosition,
      this.smoothing
    );

    // Smooth zoom
    this.zoom = MathUtils.lerp(this.zoom, this.targetZoom, this.zoomSmoothing);
  }

  worldToScreen(worldPos: Vector2): Vector2 {
    return {
      x: (worldPos.x - this.position.x) * this.zoom + this.canvasWidth / 2,
      y: (worldPos.y - this.position.y) * this.zoom + this.canvasHeight / 2
    };
  }

  screenToWorld(screenPos: Vector2): Vector2 {
    return {
      x: (screenPos.x - this.canvasWidth / 2) / this.zoom + this.position.x,
      y: (screenPos.y - this.canvasHeight / 2) / this.zoom + this.position.y
    };
  }

  getViewBounds(): {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } {
    const halfWidth = (this.canvasWidth / 2) / this.zoom;
    const halfHeight = (this.canvasHeight / 2) / this.zoom;

    return {
      left: this.position.x - halfWidth,
      right: this.position.x + halfWidth,
      top: this.position.y - halfHeight,
      bottom: this.position.y + halfHeight
    };
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  isInView(position: Vector2, radius: number): boolean {
    const bounds = this.getViewBounds();
    return (
      position.x + radius > bounds.left &&
      position.x - radius < bounds.right &&
      position.y + radius > bounds.top &&
      position.y - radius < bounds.bottom
    );
  }
}