export enum EntityType {
  PLAYER = 'PLAYER',
  ENEMY = 'ENEMY',
  PLATFORM = 'PLATFORM',
  PORTAL = 'PORTAL',
  PARTICLE = 'PARTICLE',
  ATTACK_HITBOX = 'ATTACK_HITBOX',
  PROJECTILE = 'PROJECTILE',
  ITEM = 'ITEM'
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  ORACLE = 'ORACLE' // Talking to Gemini
}

export type ItemType = 'HEALTH' | 'RANGE_BOOST' | 'RANGED_WEAPON';

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
  aiState?: 'IDLE' | 'CHASE' | 'ATTACK' | 'FLEE';
  patrolStart?: number;
  patrolEnd?: number;
  attackCooldown?: number;
  // For particles/projectiles
  life?: number;
  maxLife?: number;
  owner?: string; // 'player' or 'enemy'
  damage?: number;
  // For player movement & combat
  jumpsRemaining?: number;
  isParrying?: boolean;
  parryTimer?: number;
  parryDirection?: 'FWD' | 'UP';
  attackRangeBonus?: number;
  hasRangedWeapon?: boolean;
  // For items
  itemType?: ItemType;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  entities: Entity[];
  width: number;
  height: number;
  theme: 'dungeon' | 'tower' | 'void' | 'cistern' | 'summit' | 'volcano';
}

export interface LogEntry {
  sender: 'System' | 'Oracle' | 'Player';
  text: string;
  timestamp: number;
}