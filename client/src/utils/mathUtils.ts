export interface Vector2 {
  x: number;
  y: number;
}

export class MathUtils {
  static distance(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static normalize(vector: Vector2): Vector2 {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (length === 0) return { x: 0, y: 0 };
    return {
      x: vector.x / length,
      y: vector.y / length
    };
  }

  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  static lerpVector(a: Vector2, b: Vector2, t: number): Vector2 {
    return {
      x: MathUtils.lerp(a.x, b.x, t),
      y: MathUtils.lerp(a.y, b.y, t)
    };
  }

  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  static circleCollision(
    pos1: Vector2,
    radius1: number,
    pos2: Vector2,
    radius2: number
  ): boolean {
    const distance = MathUtils.distance(pos1, pos2);
    return distance < radius1 + radius2;
  }

  static getAngle(from: Vector2, to: Vector2): number {
    return Math.atan2(to.y - from.y, to.x - from.x);
  }

  static randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#FFB347', '#87CEEB', '#F0E68C'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}