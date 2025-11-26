export const GRAVITY = 0.5;
export const FRICTION = 0.8;
export const MOVE_SPEED = 5;
export const JUMP_FORCE = -12;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 48;
export const TILE_SIZE = 32;

// Dragon Quest Palette
export const COLOR_PLAYER = '#3b82f6'; // Hero Blue Tunic
export const COLOR_PLAYER_ARMOR = '#eab308'; // Gold Armor/Helmet

// Enemies
export const COLOR_ENEMY_SKELETON = '#e5e5e5'; // White Bone
export const COLOR_ENEMY_BAT = '#6b21a8'; // Dracky Purple
export const COLOR_ENEMY_SLIME = '#2563eb'; // Classic Blue Slime
export const COLOR_ENEMY_GHOST = '#f8fafc'; // White Sheet Ghost
export const COLOR_ENEMY_MAGE = '#be185d'; // Red/Pink Mage
export const COLOR_ENEMY_BOSS = '#9f1239'; // Dark Red Boss

export const COLOR_NPC_MERCHANT = '#16a34a'; // Green Merchant

// Blocks / Terrain (Terraria + DQ style)
export const COLOR_DIRT = '#78350f'; // Earthy Brown
export const COLOR_GRASS = '#16a34a'; // Bright Retro Green
export const COLOR_STONE = '#64748b'; // Blue-grey Stone
export const COLOR_BRICK = '#94a3b8'; // Dungeon Grey
export const COLOR_OBSIDIAN = '#1e293b'; // Dark Slate
export const COLOR_VOID_BLOCK = '#4c1d95'; // Evil Purple

export const COLOR_PLATFORM = '#475569'; 

// Combat
export const COLOR_ATTACK = '#facc15'; // Hit flash yellow
export const COLOR_PROJECTILE_ENEMY = '#dc2626'; // Enemy fireball red
export const COLOR_PROJECTILE_PLAYER = '#60a5fa'; // Player magic blue
export const COLOR_PROJECTILE_MULTI = '#93c5fd'; 
export const COLOR_SHIELD = '#38bdf8'; // Magic Barrier Cyan

// Items
export const COLOR_ITEM_HEALTH = '#ef4444'; // Medicinal Herb Red
export const COLOR_ITEM_RANGE = '#fbbf24'; // Seed of Strength Gold
export const COLOR_ITEM_WEAPON = '#a855f7'; // Magic Weapon
export const COLOR_COIN = '#fbbf24'; // Gold Coin

// Shop Prices
export const PRICE_HEAL = 50;
export const PRICE_DAMAGE = 150;
export const PRICE_RANGE = 100;

// Room Themes & Backgrounds
export const ROOM_THEME_COLORS = {
  dungeon: '#38bdf8', // Overworld Sky Blue
  tower: '#0f172a',   // Dark Tower
  cistern: '#064e3b', // Deep Green
  summit: '#bae6fd',   // High Sky
  volcano: '#450a0a',  // Magma Red
  void: '#000000',      // Pitch Black
  merchant: '#581c87'   // Cozy Purple
};

// Map themes to block types
export const THEME_BLOCK_MAP: Record<string, {main: string, top: string | null}> = {
    dungeon: { main: COLOR_DIRT, top: COLOR_GRASS }, // Plains
    tower: { main: COLOR_BRICK, top: null }, // Tower
    cistern: { main: COLOR_DIRT, top: '#15803d' }, // Jungle
    summit: { main: COLOR_STONE, top: '#f1f5f9' }, // Snow
    volcano: { main: COLOR_OBSIDIAN, top: '#ea580c' }, // Lava rock
    void: { main: COLOR_VOID_BLOCK, top: '#7e22ce' }, // Corrupt
    merchant: { main: '#78350f', top: '#d97706' } // Wood floor
};