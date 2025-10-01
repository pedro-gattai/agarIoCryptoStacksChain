import type { PlayerConnection, QueueStatus } from 'shared';

export class QueueService {
  private waitingQueue: PlayerConnection[] = [];
  private readonly QUEUE_PROCESS_INTERVAL = 1000; // 1 second
  private readonly ESTIMATED_WAIT_PER_PLAYER = 5000; // 5 seconds per player

  public addPlayerToQueue(player: PlayerConnection): QueueStatus {
    this.waitingQueue.push(player);
    
    return this.getQueueStatus(player.playerId);
  }

  public removePlayerFromQueue(playerId: string): PlayerConnection | undefined {
    const playerIndex = this.waitingQueue.findIndex(p => p.playerId === playerId);
    
    if (playerIndex !== -1) {
      return this.waitingQueue.splice(playerIndex, 1)[0];
    }
    
    return undefined;
  }

  public getNextPlayerInQueue(): PlayerConnection | undefined {
    return this.waitingQueue.shift();
  }

  public getQueueStatus(playerId: string): QueueStatus {
    const playerIndex = this.waitingQueue.findIndex(p => p.playerId === playerId);
    
    if (playerIndex === -1) {
      return {
        position: 0,
        estimatedWaitTime: 0,
        playersAhead: 0
      };
    }

    const position = playerIndex + 1;
    const playersAhead = playerIndex;
    const estimatedWaitTime = playersAhead * this.ESTIMATED_WAIT_PER_PLAYER;

    return {
      position,
      estimatedWaitTime,
      playersAhead
    };
  }

  public getQueueLength(): number {
    return this.waitingQueue.length;
  }

  public getQueuedPlayers(): PlayerConnection[] {
    return [...this.waitingQueue];
  }

  public isPlayerInQueue(playerId: string): boolean {
    return this.waitingQueue.some(p => p.playerId === playerId);
  }

  public processQueue(canAddPlayer: () => boolean, onPlayerAdded: (player: PlayerConnection) => void): void {
    while (this.waitingQueue.length > 0 && canAddPlayer()) {
      const nextPlayer = this.getNextPlayerInQueue();
      if (nextPlayer) {
        onPlayerAdded(nextPlayer);
      }
    }
  }

  public cleanupQueue(): void {
    const now = new Date();
    const QUEUE_TIMEOUT = 300000; // 5 minutes

    // Remove players who have been in queue too long
    this.waitingQueue = this.waitingQueue.filter(player => {
      const timeInQueue = now.getTime() - player.joinedAt.getTime();
      return timeInQueue < QUEUE_TIMEOUT;
    });
  }

  public updateQueuePositions(): Map<string, QueueStatus> {
    const updates = new Map<string, QueueStatus>();
    
    this.waitingQueue.forEach((player, index) => {
      const status: QueueStatus = {
        position: index + 1,
        estimatedWaitTime: index * this.ESTIMATED_WAIT_PER_PLAYER,
        playersAhead: index
      };
      
      updates.set(player.playerId, status);
    });

    return updates;
  }

  public getAverageWaitTime(): number {
    if (this.waitingQueue.length === 0) return 0;
    
    const totalEstimatedWait = this.waitingQueue.reduce((total, player, index) => {
      return total + (index * this.ESTIMATED_WAIT_PER_PLAYER);
    }, 0);

    return Math.floor(totalEstimatedWait / this.waitingQueue.length);
  }
}