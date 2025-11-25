export enum EntityType {
  PLAYER = 'PLAYER',
  ENEMY = 'ENEMY',
  PLATFORM = 'PLATFORM',
  PORTAL = 'PORTAL',
  PARTICLE = 'PARTICLE',
  ATTACK_HITBOX = 'ATTACK_HITBOX'
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  ORACLE = 'ORACLE' // Talking to Gemini
}

export interface Vector {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Vector;
  size: Vector;
  vel: Vector;
  color: string;
  hp?: number;
  maxHp?: number;
  isDead?: boolean;
  facing?: number; // 1 right, -1 left
  // For enemies
  aiState?: 'IDLE' | 'CHASE' | 'ATTACK';
  patrolStart?: number;
  patrolEnd?: number;
  // For particles
  life?: number;
  maxLife?: number;
  // For player movement
  jumpsRemaining?: number;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  entities: Entity[];
  width: number;
  height: number;
  theme: 'dungeon' | 'tower' | 'void';
}

export interface LogEntry {
  sender: 'System' | 'Oracle' | 'Player';
  text: string;
  timestamp: number;
}