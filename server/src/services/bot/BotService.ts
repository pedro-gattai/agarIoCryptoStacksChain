import type { PlayerConnection, BotAI, Position } from 'shared';

export class BotService {
  private botIdCounter: number = 0;
  private readonly MIN_PLAYERS_FOR_GAME = 10;
  private readonly MAX_BOTS = 80;
  private readonly MIN_REAL_PLAYERS_BEFORE_BOTS = 2;
  private readonly WORLD_SIZE = 4000;

  private botPersonalities: BotAI['personalityType'][] = ['aggressive', 'passive', 'neutral'];

  public createBot(): PlayerConnection {
    this.botIdCounter++;
    const botId = `bot_${this.botIdCounter}_${Date.now()}`;
    
    const bot: PlayerConnection = {
      socketId: `bot_socket_${this.botIdCounter}`,
      playerId: botId,
      isInGame: true,
      isReady: true,
      lastSeen: new Date(),
      position: this.generateRandomPosition(),
      inputBuffer: [],
      joinedAt: new Date(),
      isBot: true,
      botAI: this.createBotAI()
    };

    return bot;
  }

  public shouldSpawnBots(realPlayersCount: number, currentBotsCount: number): boolean {
    const totalPlayers = realPlayersCount + currentBotsCount;
    
    // Only spawn bots if we have fewer real players than the minimum threshold
    if (realPlayersCount >= this.MIN_REAL_PLAYERS_BEFORE_BOTS) {
      return false;
    }

    // Spawn bots to reach minimum game population
    return totalPlayers < this.MIN_PLAYERS_FOR_GAME && currentBotsCount < this.MAX_BOTS;
  }

  public shouldDespawnBots(realPlayersCount: number, currentBotsCount: number): boolean {
    // Despawn bots if we have enough real players
    return realPlayersCount >= this.MIN_REAL_PLAYERS_BEFORE_BOTS && currentBotsCount > 0;
  }

  public updateBotAI(bot: PlayerConnection): void {
    if (!bot.botAI) return;

    const now = Date.now();
    const timeSinceLastChange = now - bot.botAI.lastDirectionChange;

    // Change direction every 2-5 seconds based on personality
    const changeInterval = this.getBotChangeInterval(bot.botAI.personalityType);
    
    if (timeSinceLastChange > changeInterval) {
      bot.botAI.targetPosition = this.generateRandomTargetPosition(bot.position, bot.botAI);
      bot.botAI.lastDirectionChange = now;
    }

    // Move towards target
    this.moveBotTowardsTarget(bot);
  }

  private createBotAI(): BotAI {
    const personalityType = this.botPersonalities[Math.floor(Math.random() * this.botPersonalities.length)];
    
    return {
      targetPosition: this.generateRandomPosition(),
      moveSpeed: this.getBotMoveSpeed(personalityType),
      aggressiveness: this.getBotAggressiveness(personalityType),
      lastDirectionChange: Date.now(),
      personalityType
    };
  }

  private getBotMoveSpeed(personality: BotAI['personalityType']): number {
    switch (personality) {
      case 'aggressive': return 2.5;
      case 'passive': return 1.0;
      case 'neutral': return 1.5;
      default: return 1.5;
    }
  }

  private getBotAggressiveness(personality: BotAI['personalityType']): number {
    switch (personality) {
      case 'aggressive': return 0.8;
      case 'passive': return 0.2;
      case 'neutral': return 0.5;
      default: return 0.5;
    }
  }

  private getBotChangeInterval(personality: BotAI['personalityType']): number {
    switch (personality) {
      case 'aggressive': return 2000; // Change direction every 2 seconds
      case 'passive': return 5000; // Change direction every 5 seconds
      case 'neutral': return 3500; // Change direction every 3.5 seconds
      default: return 3500;
    }
  }

  private generateRandomPosition(): Position {
    return {
      x: Math.random() * this.WORLD_SIZE,
      y: Math.random() * this.WORLD_SIZE
    };
  }

  private generateRandomTargetPosition(currentPos: Position, botAI: BotAI): Position {
    // Generate target within movement range based on personality
    const range = botAI.personalityType === 'aggressive' ? 800 : 400;
    
    return {
      x: Math.max(0, Math.min(this.WORLD_SIZE, currentPos.x + (Math.random() - 0.5) * range)),
      y: Math.max(0, Math.min(this.WORLD_SIZE, currentPos.y + (Math.random() - 0.5) * range))
    };
  }

  private moveBotTowardsTarget(bot: PlayerConnection): void {
    if (!bot.botAI) return;

    const dx = bot.botAI.targetPosition.x - bot.position.x;
    const dy = bot.botAI.targetPosition.y - bot.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 10) {
      const moveSpeed = bot.botAI.moveSpeed;
      bot.position.x += (dx / distance) * moveSpeed;
      bot.position.y += (dy / distance) * moveSpeed;

      // Keep within world bounds
      bot.position.x = Math.max(0, Math.min(this.WORLD_SIZE, bot.position.x));
      bot.position.y = Math.max(0, Math.min(this.WORLD_SIZE, bot.position.y));
    }
  }

  public cleanupInactiveBots(bots: PlayerConnection[]): PlayerConnection[] {
    // Remove bots that haven't been active (simple cleanup for now)
    const now = new Date();
    return bots.filter(bot => {
      const timeSinceJoin = now.getTime() - bot.joinedAt.getTime();
      return timeSinceJoin < 300000; // Remove bots older than 5 minutes
    });
  }
}