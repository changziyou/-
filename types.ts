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
  ORACLE = 'ORACLE', // Talking to Gemini
  PROMOTION = 'PROMOTION' // Selecting talents
}

export type ItemType = 'HEALTH' | 'RANGE_BOOST' | 'RANGED_WEAPON';

export type TalentID = 
  | 'WARRIOR_THORNS' 
  | 'WARRIOR_RANGE' 
  | 'WARRIOR_LIFESTEAL' 
  | 'MAGE_SPEED' 
  | 'MAGE_RANGE' 
  | 'MAGE_MULTI';

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
  damage?: number; // Damage this entity deals
  // For particles/projectiles
  life?: number;
  maxLife?: number;
  owner?: string; // 'player' or 'enemy'
  // For player movement & combat
  jumpsRemaining?: number;
  isParrying?: boolean;
  parryTimer?: number;
  parryDirection?: 'FWD' | 'UP';
  attackRangeBonus?: number;
  damageBonus?: number; // Added for progression
  hasRangedWeapon?: boolean;
  // Talents
  thorns?: number; // Percentage 0-1
  lifestealBonus?: number; // Flat HP
  rangedCooldownMult?: number; // Multiplier
  projectileLifeMult?: number; // Multiplier for range
  projectileCount?: number; // Multishot
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