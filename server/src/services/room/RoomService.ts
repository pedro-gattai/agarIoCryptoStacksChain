import type { GlobalGameRoom, PlayerConnection, Position } from 'shared';
import { GameService } from '../GameService';

export class RoomService {
  private globalRoom!: GlobalGameRoom;
  private playerToSocket: Map<string, any> = new Map();
  private gameService: GameService;
  
  private readonly MAX_PLAYERS = 100;
  private readonly WORLD_SIZE = 4000;
  private readonly DEFAULT_ENTRY_FEE = 0.01;

  constructor(gameService: GameService) {
    this.gameService = gameService;
  }

  public async initializeGlobalRoom(): Promise<void> {
    const gameState = await this.gameService.createGame(this.DEFAULT_ENTRY_FEE, this.MAX_PLAYERS);
    
    this.globalRoom = {
      id: 'global_room',
      gameId: gameState.id,
      players: new Map(),
      waitingQueue: [],
      maxPlayers: this.MAX_PLAYERS,
      currentPlayers: 0,
      entryFee: this.DEFAULT_ENTRY_FEE,
      status: 'active',
      createdAt: new Date(),
      lastActivity: new Date()
    };

    console.log(`🌍 Global room initialized with capacity for ${this.MAX_PLAYERS} players`);
  }

  public getGlobalRoom(): GlobalGameRoom {
    return this.globalRoom;
  }

  public addPlayerToRoom(player: PlayerConnection, socket: any): void {
    this.globalRoom.players.set(player.playerId, player);
    this.playerToSocket.set(player.playerId, socket);
    this.globalRoom.currentPlayers = this.globalRoom.players.size;
    this.globalRoom.lastActivity = new Date();
  }

  public removePlayerFromRoom(playerId: string): PlayerConnection | undefined {
    const player = this.globalRoom.players.get(playerId);
    if (player) {
      this.globalRoom.players.delete(playerId);
      this.playerToSocket.delete(playerId);
      this.globalRoom.currentPlayers = this.globalRoom.players.size;
      this.globalRoom.lastActivity = new Date();
    }
    return player;
  }

  public getPlayerSocket(playerId: string): any {
    return this.playerToSocket.get(playerId);
  }

  public getAllPlayerSockets(): Map<string, any> {
    return this.playerToSocket;
  }

  public getRoomStats() {
    if (!this.globalRoom) {
      return {
        totalPlayers: 0,
        realPlayers: 0,
        bots: 0,
        queueLength: 0,
        maxPlayers: this.MAX_PLAYERS,
        status: 'initializing' as const
      };
    }
    
    const realPlayers = Array.from(this.globalRoom.players.values()).filter(p => !p.isBot);
    const bots = Array.from(this.globalRoom.players.values()).filter(p => p.isBot);
    
    return {
      totalPlayers: this.globalRoom.players.size,
      realPlayers: realPlayers.length,
      bots: bots.length,
      queueLength: this.globalRoom.waitingQueue.length,
      maxPlayers: this.MAX_PLAYERS,
      status: this.globalRoom.status
    };
  }

  public generateRandomPosition(): Position {
    return {
      x: Math.random() * this.WORLD_SIZE,
      y: Math.random() * this.WORLD_SIZE
    };
  }

  public isRoomFull(): boolean {
    return this.globalRoom.players.size >= this.MAX_PLAYERS;
  }

  public getRealPlayersCount(): number {
    return Array.from(this.globalRoom.players.values()).filter(p => !p.isBot).length;
  }

  public getBotsCount(): number {
    return Array.from(this.globalRoom.players.values()).filter(p => p.isBot).length;
  }
}