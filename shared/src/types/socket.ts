import { GameRoom, GameUpdate, QueueStatus } from './game';
import { Position } from './game';
import { PrizeDistribution } from './blockchain';

// Socket event types
export interface SocketEvents {
  // Connection events
  connect: {};
  disconnect: { reason: string };

  // Room events
  rooms_list: { rooms: GameRoom[] };
  room_created: { room: GameRoom };
  room_joined: { roomId: string; room: GameRoom; playerId: string };
  new_room_available: { room: GameRoom };

  // Player events
  player_joined: { playerId: string; playerCount: number; playerPosition?: Position; isBot?: boolean };
  player_left: { playerId: string; playerCount: number; isBot?: boolean };

  // Game events
  game_starting: { countdown: number };
  game_started: { gameId: string };
  game_update: GameUpdate;
  game_ended: { results: GameResults };

  // Global room events
  join_success: { message: string; roomStatus: RoomStatus };
  join_queued: { message: string; queueStatus: QueueStatus; roomStatus: RoomStatus };
  join_error: { message: string };
  global_room_stats: { playersOnline: number; maxPlayers: number; queueLength: number; uptime: number };
  initial_room_status: RoomStatus;
  global_room_joined: { roomId: string; position: Position; playersOnline: number; maxPlayers: number };
  queue_position_updated: { position: number; estimatedWaitTime: number };
  player_died: { playerId: string };
  player_respawned: { playerId: string; position: Position };
  room_status: RoomStatus;

  // Error events
  error: { message: string };
}

// Room status interface
export interface RoomStatus {
  playersOnline: number;
  maxPlayers: number;
  queueLength: number;
  status: 'active' | 'maintenance';
  uptime: number;
}

// Game results interface
export interface GameResults {
  gameId: string;
  winners: PlayerResult[];
  prizeDistribution: PrizeDistribution[];
  duration: number;
}

export interface PlayerResult {
  playerId: string;
  position: number;
  score: number;
  prize: number;
}

