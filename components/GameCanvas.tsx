import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  EntityType, 
  GameState, 
  Entity, 
  Vector, 
  Room,
  ItemType
} from '../types';
import { 
  GRAVITY, 
  FRICTION, 
  MOVE_SPEED, 
  JUMP_FORCE, 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  COLOR_PLAYER,
  COLOR_ENEMY_SKELETON,
  COLOR_ENEMY_BAT,
  COLOR_ENEMY_SLIME,
  COLOR_ENEMY_GHOST,
  COLOR_ENEMY_MAGE,
  COLOR_PLATFORM,
  COLOR_ATTACK,
  COLOR_PROJECTILE_ENEMY,
  COLOR_PROJECTILE_PLAYER,
  COLOR_SHIELD,
  COLOR_ITEM_HEALTH,
  COLOR_ITEM_RANGE,
  COLOR_ITEM_WEAPON,
  ROOM_THEME_COLORS
} from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onUpdateStats: (hp: number, maxHp: number, score: number) => void;
  onRoomChange: (roomName: string) => void;
  currentRoomRef: React.MutableRefObject<Room>;
  onOracleTrigger: () => void;
  difficultyLevel: number; // 0-based index of room
}

// Helper: AABB Collision
const checkCollision = (r1: Entity, r2: Entity): boolean => {
  return (
    r1.pos.x < r2.pos.x + r2.size.x &&
    r1.pos.x + r1.size.x > r2.pos.x &&
    r1.pos.y < r2.pos.y + r2.size.y &&
    r1.pos.y + r1.size.y > r2.pos.y
  );
};

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  setGameState,
  onUpdateStats,
  onRoomChange,
  currentRoomRef,
  onOracleTrigger,
  difficultyLevel
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Game State Refs
  const playerRef = useRef<Entity>({
    id: 'player',
    type: EntityType.PLAYER,
    pos: { x: 100, y: 300 },
    size: { x: PLAYER_WIDTH, y: PLAYER_HEIGHT },
    vel: { x: 0, y: 0 },
    color: COLOR_PLAYER,
    hp: 100,
    maxHp: 100,
    facing: 1,
    jumpsRemaining: 2,
    attackCooldown: 0,
    isParrying: false,
    parryTimer: 0,
    parryDirection: 'FWD',
    attackRangeBonus: 0,
    hasRangedWeapon: false
  });

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const particlesRef = useRef<Entity[]>([]); // Handles particles AND projectiles
  const itemsRef = useRef<Entity[]>([]); // Handles dropped items
  const enemiesKilledRef = useRef<number>(0);
  const hitFlashRef = useRef<number>(0);
  const lastAttackDirRef = useRef<'FWD' | 'UP' | 'DOWN'>('FWD');
  const parryCooldownRef = useRef<number>(0);
  const roomChangeRef = useRef<string>('');

  // Clear items on room change
  useEffect(() => {
    if (currentRoomRef.current.id !== roomChangeRef.current) {
        itemsRef.current = [];
        roomChangeRef.current = currentRoomRef.current.id;
        // Keep projectiles/particles? Maybe clear them too for cleaner transition
        particlesRef.current = []; 
    }
  }, [currentRoomRef.current.id]);

  // Logic: Perform Attack
  const performAttack = useCallback(() => {
    const player = playerRef.current;
    
    // Check Direction Modifiers
    const isUpward = keysRef.current['KeyW'] || keysRef.current['ArrowUp'];
    const isDownward = keysRef.current['KeyS'] || keysRef.current['ArrowDown'];
    
    player.attackCooldown = 20; // Frames
    
    const baseRange = 50;
    const range = baseRange + (player.attackRangeBonus || 0);
    
    let hitbox: Entity;
    let visualVelocity: Vector;
    let visualSize: Vector;
    let visualPos: Vector;

    if (isUpward) {
        lastAttackDirRef.current = 'UP';
        hitbox = {
            id: `atk_up_${Date.now()}`,
            type: EntityType.ATTACK_HITBOX,
            pos: { x: player.pos.x - 10, y: player.pos.y - range + 10 },
            size: { x: player.size.x + 20, y: range },
            vel: { x: 0, y: 0 },
            color: 'transparent',
            life: 8,
            owner: 'player'
        };
        visualVelocity = { x: 0, y: -4 };
        visualSize = { x: hitbox.size.x, y: hitbox.size.y };
        visualPos = { x: hitbox.pos.x, y: hitbox.pos.y + 20 };

    } else if (isDownward) {
        lastAttackDirRef.current = 'DOWN';
        hitbox = {
            id: `atk_down_${Date.now()}`,
            type: EntityType.ATTACK_HITBOX,
            pos: { x: player.pos.x - 10, y: player.pos.y + player.size.y - 10 },
            size: { x: player.size.x + 20, y: range },
            vel: { x: 0, y: 0 },
            color: 'transparent',
            life: 8,
            owner: 'player'
        };
        visualVelocity = { x: 0, y: 4 };
        visualSize = { x: hitbox.size.x, y: hitbox.size.y };
        visualPos = { x: hitbox.pos.x, y: hitbox.pos.y + player.size.y - 20 };

    } else {
        lastAttackDirRef.current = 'FWD';
        hitbox = {
            id: `atk_fwd_${Date.now()}`,
            type: EntityType.ATTACK_HITBOX,
            pos: { 
              x: player.facing === 1 ? player.pos.x + player.size.x : player.pos.x - range,
              y: player.pos.y + 10
            },
            size: { x: range, y: 30 },
            vel: { x: 0, y: 0 },
            color: 'transparent',
            life: 10,
            owner: 'player'
        };
        visualVelocity = { x: player.facing! * 2, y: 0 };
        visualSize = { ...hitbox.size };
        visualPos = { ...hitbox.pos };
    }

    particlesRef.current.push(hitbox);

    particlesRef.current.push({
         id: `swipe_${Date.now()}`,
         type: EntityType.PARTICLE,
         pos: visualPos,
         size: visualSize,
         vel: visualVelocity,
         color: COLOR_ATTACK,
         life: 10,
         maxLife: 10
    });
  }, []);

  // Logic: Shoot
  const performShoot = useCallback(() => {
     const player = playerRef.current;
     if (!player.hasRangedWeapon) return;
     if ((player.attackCooldown || 0) > 0) return;

     player.attackCooldown = 25;
     const speed = 8;
     const vx = (player.facing || 1) * speed;
     
     particlesRef.current.push({
         id: `p_proj_${Date.now()}`,
         type: EntityType.PROJECTILE,
         pos: { x: player.pos.x + (player.facing === 1 ? player.size.x : 0), y: player.pos.y + 20 },
         size: { x: 16, y: 8 },
         vel: { x: vx, y: 0 },
         color: COLOR_PROJECTILE_PLAYER,
         owner: 'player',
         life: 120,
         damage: 15
     });
  }, []);

  // Logic: Parry
  const performParry = useCallback((isUpward: boolean) => {
    if (parryCooldownRef.current > 0) return;
    
    playerRef.current.isParrying = true;
    playerRef.current.parryDirection = isUpward ? 'UP' : 'FWD';
    playerRef.current.parryTimer = 15; // Active for 15 frames (0.25s)
    parryCooldownRef.current = 60; // 1 second cooldown
  }, []);

  // Initialize inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.repeat) return;

      if (gameState === GameState.PLAYING) {
          if (e.code === 'KeyH') {
            onOracleTrigger();
          }
          if (e.code === 'KeyF') {
             performShoot();
          }
          if (e.code === 'Space') {
            const player = playerRef.current;
            if ((player.jumpsRemaining || 0) > 0) {
                player.vel.y = JUMP_FORCE;
                const isAirJump = (player.jumpsRemaining || 0) < 2;
                player.jumpsRemaining = (player.jumpsRemaining || 0) - 1;
                particlesRef.current.push({
                    id: `jump_dust_${Date.now()}`,
                    type: EntityType.PARTICLE,
                    pos: { x: player.pos.x, y: player.pos.y + player.size.y },
                    size: { x: player.size.x, y: 4 },
                    vel: { x: 0, y: 1 },
                    color: isAirJump ? '#67e8f9' : '#94a3b8',
                    life: 15,
                    maxLife: 15
                });
            }
          }
      }
      
      if (e.code === 'Escape') {
          if (gameState === GameState.PLAYING) setGameState(GameState.PAUSED);
          else if (gameState === GameState.PAUSED) setGameState(GameState.PLAYING);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
        if (gameState !== GameState.PLAYING) return;
        
        if (e.button === 0) { // Left Click - Attack
            if ((playerRef.current.attackCooldown || 0) <= 0) {
                performAttack();
            }
        } else if (e.button === 2) { // Right Click - Parry
            // Check for Upward modifier
            const isUp = keysRef.current['KeyW'] || keysRef.current['ArrowUp'];
            performParry(isUp);
        }
    };

    const handleContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gameState, onOracleTrigger, setGameState, performAttack, performParry, performShoot]);

  // Main Game Loop
  const update = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    const player = playerRef.current;
    const room = currentRoomRef.current;
    const enemiesAreAggressive = difficultyLevel >= 4; 

    // --- Cooldowns ---
    if ((player.attackCooldown || 0) > 0) player.attackCooldown = (player.attackCooldown || 0) - 1;
    if (parryCooldownRef.current > 0) parryCooldownRef.current--;
    if ((player.parryTimer || 0) > 0) {
        player.parryTimer = (player.parryTimer || 0) - 1;
        if (player.parryTimer <= 0) player.isParrying = false;
    }

    // --- Player Movement ---
    if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
      player.vel.x = -MOVE_SPEED;
      player.facing = -1;
    } else if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
      player.vel.x = MOVE_SPEED;
      player.facing = 1;
    } else {
      player.vel.x *= FRICTION;
    }

    player.vel.y += GRAVITY;
    player.pos.x += player.vel.x;
    
    // Room Boundaries
    if (player.pos.x < 0) player.pos.x = 0;
    else if (player.pos.x + player.size.x > CANVAS_WIDTH) {
        player.pos.x = 10;
        onRoomChange("next");
    }

    // Platform Collisions X
    room.entities.filter(e => e.type === EntityType.PLATFORM).forEach(plat => {
      if (checkCollision(player, plat)) {
        if (player.vel.x > 0) player.pos.x = plat.pos.x - player.size.x;
        else if (player.vel.x < 0) player.pos.x = plat.pos.x + plat.size.x;
        player.vel.x = 0;
      }
    });

    player.pos.y += player.vel.y;

    // Platform Collisions Y
    room.entities.filter(e => e.type === EntityType.PLATFORM).forEach(plat => {
      if (checkCollision(player, plat)) {
        if (player.vel.y > 0) { 
          player.pos.y = plat.pos.y - player.size.y;
          player.jumpsRemaining = 2; 
        } else if (player.vel.y < 0) { 
          player.pos.y = plat.pos.y + plat.size.y;
        }
        player.vel.y = 0;
      }
    });
    
    // Fall Damage Logic
    if (player.pos.y > CANVAS_HEIGHT) {
        player.hp = Math.max(0, (player.hp || 0) - 20);
        // Respawn logic if still alive
        if ((player.hp || 0) > 0) {
             player.pos.y = 0; 
             player.pos.x = 50; 
             player.vel.y = 0;
             player.vel.x = 0;
             hitFlashRef.current = 30; // Damage feedback
        }
    }

    // --- Items Logic ---
    // Update Item Physics and Pickup
    for (let i = itemsRef.current.length - 1; i >= 0; i--) {
        const item = itemsRef.current[i];
        item.vel.y += GRAVITY;
        item.pos.y += item.vel.y;
        
        // Item Platform Collision
        room.entities.filter(e => e.type === EntityType.PLATFORM).forEach(plat => {
            if (checkCollision(item, plat)) {
                if (item.vel.y > 0) {
                    item.pos.y = plat.pos.y - item.size.y;
                    item.vel.y = 0;
                    item.vel.x *= 0.9; // Friction
                }
            }
        });

        // Pickup Collision
        if (checkCollision(player, item)) {
            if (item.itemType === 'HEALTH') {
                player.hp = Math.min(player.maxHp || 100, (player.hp || 0) + 25);
            } else if (item.itemType === 'RANGE_BOOST') {
                player.attackRangeBonus = (player.attackRangeBonus || 0) + 15;
            } else if (item.itemType === 'RANGED_WEAPON') {
                player.hasRangedWeapon = true;
                player.attackRangeBonus = (player.attackRangeBonus || 0) + 5; // Slight range boost too
            }
            // Remove item
            itemsRef.current.splice(i, 1);
        }
    }


    // --- Enemies Logic ---
    room.entities.forEach(entity => {
      if (entity.type === EntityType.ENEMY && !entity.isDead) {
        
        // Cooldowns
        if ((entity.attackCooldown || 0) > 0) entity.attackCooldown = (entity.attackCooldown || 0) - 1;

        // Common targeting
        const dx = player.pos.x - entity.pos.x;
        const dy = player.pos.y - entity.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // --- SKELETON (Melee) ---
        if (entity.color === COLOR_ENEMY_SKELETON) {
            // Aggressive Mode: Slash when close
            if (enemiesAreAggressive && dist < 60 && (entity.attackCooldown || 0) <= 0) {
                entity.attackCooldown = 120; // 2s cooldown
                entity.vel.x = 0; // Stop to attack
                
                // Spawn Enemy Sword Hitbox
                particlesRef.current.push({
                    id: `enemy_slash_${Date.now()}`,
                    type: EntityType.ATTACK_HITBOX,
                    pos: { x: dx > 0 ? entity.pos.x + 30 : entity.pos.x - 30, y: entity.pos.y + 10 },
                    size: { x: 30, y: 30 },
                    vel: { x: 0, y: 0 },
                    color: 'transparent',
                    life: 15,
                    owner: 'enemy',
                    damage: 15
                });
                // Visual telegraph
                particlesRef.current.push({
                    id: `slash_fx_${Date.now()}`,
                    type: EntityType.PARTICLE,
                    pos: { x: dx > 0 ? entity.pos.x + 30 : entity.pos.x - 30, y: entity.pos.y + 10 },
                    size: { x: 30, y: 30 },
                    vel: { x: 0, y: 0 },
                    color: '#ef4444',
                    life: 10
                });
            } else {
                // Patrol Logic
                if (!entity.vel.x) entity.vel.x = 1;
                entity.pos.x += entity.vel.x;
                if (entity.pos.x > (entity.patrolEnd || 0)) entity.vel.x = -1;
                if (entity.pos.x < (entity.patrolStart || 0)) entity.vel.x = 1;
            }
        
        // --- BAT (Swoop) ---
        } else if (entity.color === COLOR_ENEMY_BAT) {
            if (dist < 250) {
                entity.pos.x += (dx / dist) * 1.5;
                entity.pos.y += (dy / dist) * 1.5;
            }

        // --- SLIME (Jump) ---
        } else if (entity.color === COLOR_ENEMY_SLIME) {
            entity.vel.y += GRAVITY;
            entity.pos.y += entity.vel.y;
            let grounded = false;
            room.entities.filter(e => e.type === EntityType.PLATFORM).forEach(plat => {
                if (checkCollision(entity, plat)) {
                    if (entity.vel.y > 0) {
                        entity.pos.y = plat.pos.y - entity.size.y;
                        grounded = true;
                    }
                    entity.vel.y = 0;
                }
            });
            if (grounded && Math.random() < 0.02) {
                entity.vel.y = -10;
                const dir = player.pos.x > entity.pos.x ? 1 : -1;
                entity.vel.x = dir * 3;
            }
            if (grounded) entity.vel.x = 0;
            else entity.pos.x += entity.vel.x;

        // --- GHOST / MAGE (Ranged) ---
        } else if (entity.color === COLOR_ENEMY_GHOST || entity.color === COLOR_ENEMY_MAGE) {
            // Movement
            if (dist > 150) {
                entity.pos.x += (dx > 0 ? 1 : -1) * 0.8;
                entity.pos.y += (dy > 0 ? 1 : -1) * 0.8;
            }

            // Attack (Projectile)
            if (enemiesAreAggressive && dist < 400 && (entity.attackCooldown || 0) <= 0) {
                 entity.attackCooldown = 180; // 3s cooldown
                 const angle = Math.atan2(dy, dx);
                 const speed = 4;
                 particlesRef.current.push({
                     id: `orb_${Date.now()}`,
                     type: EntityType.PROJECTILE,
                     pos: { x: entity.pos.x + entity.size.x/2, y: entity.pos.y + entity.size.y/2 },
                     size: { x: 12, y: 12 },
                     vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                     color: COLOR_PROJECTILE_ENEMY,
                     owner: 'enemy',
                     life: 300,
                     damage: 10
                 });
            }
        }

        // Collision: Enemy Body vs Player
        if (checkCollision(player, entity)) {
            // Parry Check
            let blocked = false;
            if (player.isParrying) {
                // If parrying UP, we block if enemy is relatively above us
                if (player.parryDirection === 'UP') {
                     if (entity.pos.y + entity.size.y < player.pos.y + player.size.y / 2) blocked = true;
                } else {
                     // FWD parry
                     const isFront = (player.facing === 1 && entity.pos.x > player.pos.x) || (player.facing === -1 && entity.pos.x < player.pos.x);
                     if (isFront) blocked = true;
                }
            }

            if (blocked) {
                 entity.vel.x = player.pos.x < entity.pos.x ? 15 : -15; // Big knockback
                 if (player.parryDirection === 'UP') entity.vel.y = -10; 

                 entity.pos.x += entity.vel.x; 
                 entity.pos.y += entity.vel.y;

                 // Visual spark
                 particlesRef.current.push({
                    id: `parry_spark_${Date.now()}`,
                    type: EntityType.PARTICLE,
                    pos: { x: player.pos.x + player.size.x/2, y: player.pos.y + player.size.y/2 },
                    size: { x: 20, y: 20 },
                    vel: { x: 0, y: 0 },
                    color: '#fff',
                    life: 5
                 });
            } else if (hitFlashRef.current === 0) {
                player.hp = Math.max(0, (player.hp || 0) - 10);
                hitFlashRef.current = 30; 
                player.vel.x = player.pos.x < entity.pos.x ? -10 : 10;
                player.vel.y = -5;
            }
        }
      }
    });

    // --- Particles, Attacks, Projectiles ---
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        
        if (p.type === EntityType.PROJECTILE) {
            // Move
            p.pos.x += p.vel.x;
            p.pos.y += p.vel.y;
            p.life = (p.life || 0) - 1;

            // Projectile vs Player
            if (p.owner === 'enemy' && checkCollision(p, player)) {
                let blocked = false;
                if (player.isParrying) {
                    if (player.parryDirection === 'UP') {
                         // Reflect Upwards
                         p.owner = 'player';
                         p.vel.x = 0;
                         p.vel.y = -10;
                         p.color = COLOR_PROJECTILE_PLAYER;
                         p.life = 300;
                         blocked = true;
                    } else {
                        // Reflect Back
                        p.owner = 'player';
                        p.vel.x *= -1.5; 
                        p.vel.y *= -1.5;
                        p.color = COLOR_PROJECTILE_PLAYER;
                        p.life = 300;
                        blocked = true;
                    }
                }
                
                if (blocked) {
                     particlesRef.current.push({
                        id: `parry_flash_${Date.now()}`,
                        type: EntityType.PARTICLE,
                        pos: { ...p.pos },
                        size: { x: 20, y: 20 },
                        vel: { x: 0, y: 0 },
                        color: '#ffffff',
                        life: 5
                    });
                } else if (hitFlashRef.current === 0) {
                    // Hit player
                    player.hp = Math.max(0, (player.hp || 0) - (p.damage || 10));
                    hitFlashRef.current = 30;
                    p.life = 0; // Destroy projectile
                }
            }

            // Projectile vs Enemy
            if (p.owner === 'player') {
                room.entities.forEach(e => {
                    if (e.type === EntityType.ENEMY && !e.isDead && checkCollision(p, e)) {
                        e.isDead = true;
                        e.hp = 0;
                        enemiesKilledRef.current++;
                        p.life = 0; // Destroy projectile
                        
                        // Drop Item Check
                        if (Math.random() < 0.4) {
                            const rand = Math.random();
                            let iType: ItemType = 'HEALTH';
                            let color = COLOR_ITEM_HEALTH;
                            if (rand > 0.7) { iType = 'RANGE_BOOST'; color = COLOR_ITEM_RANGE; }
                            if (rand > 0.9) { iType = 'RANGED_WEAPON'; color = COLOR_ITEM_WEAPON; }

                            itemsRef.current.push({
                                id: `item_${Date.now()}`,
                                type: EntityType.ITEM,
                                itemType: iType,
                                pos: { ...e.pos },
                                size: { x: 16, y: 16 },
                                vel: { x: (Math.random()-0.5)*2, y: -4 },
                                color: color
                            });
                        }

                        // Blood
                        for(let k=0; k<5; k++) {
                            particlesRef.current.push({
                                id: `blood_${Date.now()}_${k}`,
                                type: EntityType.PARTICLE,
                                pos: { x: e.pos.x + 10, y: e.pos.y + 10 },
                                size: { x: 4, y: 4 },
                                vel: { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 },
                                color: e.color,
                                life: 20
                            });
                        }
                    }
                });
            }
            // Projectile vs Walls/Platforms
            room.entities.forEach(w => {
                if (w.type === EntityType.PLATFORM && checkCollision(p, w)) {
                    p.life = 0;
                }
            });

        } else if (p.type === EntityType.ATTACK_HITBOX) {
            p.life = (p.life || 0) - 1;

            if (p.owner === 'player') {
                let hitSomething = false;
                room.entities.forEach(e => {
                    if (e.type === EntityType.ENEMY && !e.isDead && checkCollision(p, e)) {
                        e.isDead = true;
                        e.hp = 0;
                        enemiesKilledRef.current++;
                        hitSomething = true;
                        
                        // Drop Item Check (Melee)
                        if (Math.random() < 0.4) {
                            const rand = Math.random();
                            let iType: ItemType = 'HEALTH';
                            let color = COLOR_ITEM_HEALTH;
                            if (rand > 0.7) { iType = 'RANGE_BOOST'; color = COLOR_ITEM_RANGE; }
                            if (rand > 0.9) { iType = 'RANGED_WEAPON'; color = COLOR_ITEM_WEAPON; }

                            itemsRef.current.push({
                                id: `item_${Date.now()}`,
                                type: EntityType.ITEM,
                                itemType: iType,
                                pos: { ...e.pos },
                                size: { x: 16, y: 16 },
                                vel: { x: (Math.random()-0.5)*2, y: -4 },
                                color: color
                            });
                        }

                        for(let k=0; k<5; k++) {
                            particlesRef.current.push({
                                id: `blood_${Date.now()}_${k}`,
                                type: EntityType.PARTICLE,
                                pos: { x: e.pos.x + 10, y: e.pos.y + 10 },
                                size: { x: 4, y: 4 },
                                vel: { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 },
                                color: e.color,
                                life: 20
                            });
                        }
                    }
                });
                if (hitSomething && p.id.startsWith('atk_down')) {
                    player.vel.y = -10;
                    player.jumpsRemaining = 1;
                }
            } else if (p.owner === 'enemy') {
                // Enemy melee attack vs Player
                if (checkCollision(p, player)) {
                     if (player.isParrying && player.parryDirection === 'FWD') {
                         // Blocked
                     } else if (hitFlashRef.current === 0) {
                         player.hp = Math.max(0, (player.hp || 0) - (p.damage || 10));
                         hitFlashRef.current = 30;
                         // Knockback
                         player.vel.x = player.pos.x < p.pos.x ? -10 : 10;
                     }
                }
            }

        } else if (p.type === EntityType.PARTICLE) {
            p.life = (p.life || 0) - 1;
            p.pos.x += p.vel.x;
            p.pos.y += p.vel.y;
        }

        if ((p.life || 0) <= 0) {
            particlesRef.current.splice(i, 1);
        }
    }

    if (hitFlashRef.current > 0) hitFlashRef.current--;
    if ((player.hp || 0) <= 0) setGameState(GameState.GAME_OVER);

    onUpdateStats(player.hp || 0, player.maxHp || 100, enemiesKilledRef.current);

  }, [gameState, currentRoomRef, onRoomChange, onUpdateStats, setGameState, difficultyLevel]);

  // Render Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const room = currentRoomRef.current;
    const player = playerRef.current;

    // Clear
    ctx.fillStyle = ROOM_THEME_COLORS[room.theme] || '#0f172a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Platforms
    room.entities.forEach(e => {
        if (e.type === EntityType.PLATFORM) {
            ctx.fillStyle = e.color;
            ctx.shadowBlur = 0;
            ctx.fillRect(e.pos.x, e.pos.y, e.size.x, e.size.y);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1;
            ctx.strokeRect(e.pos.x, e.pos.y, e.size.x, e.size.y);
        }
    });

    // Draw Items
    itemsRef.current.forEach(item => {
        ctx.fillStyle = item.color;
        // Float effect
        const bob = Math.sin(Date.now() / 150) * 3;
        ctx.beginPath();
        if (item.itemType === 'HEALTH') {
            // Cross shape
            const cx = item.pos.x + 8;
            const cy = item.pos.y + 8 + bob;
            ctx.fillRect(cx - 2, cy - 6, 4, 12);
            ctx.fillRect(cx - 6, cy - 2, 12, 4);
        } else if (item.itemType === 'RANGE_BOOST') {
            // Up arrow
            const cx = item.pos.x + 8;
            const cy = item.pos.y + 8 + bob;
            ctx.moveTo(cx, cy - 6);
            ctx.lineTo(cx + 6, cy + 2);
            ctx.lineTo(cx - 6, cy + 2);
            ctx.fill();
        } else {
            // Orb
            ctx.arc(item.pos.x + 8, item.pos.y + 8 + bob, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw Enemies
    room.entities.forEach(e => {
        if (e.type === EntityType.ENEMY && !e.isDead) {
            ctx.fillStyle = e.color;
            const bob = Math.sin(Date.now() / 200) * 2;
            
            if (e.color === COLOR_ENEMY_SLIME) {
                ctx.beginPath();
                ctx.arc(e.pos.x + e.size.x/2, e.pos.y + e.size.y, e.size.x/2, Math.PI, 0);
                ctx.fill();
            } else if (e.color === COLOR_ENEMY_GHOST || e.color === COLOR_ENEMY_MAGE) {
                ctx.fillRect(e.pos.x, e.pos.y + bob, e.size.x, e.size.y - 10);
                // Eyes
                ctx.fillStyle = e.color === COLOR_ENEMY_MAGE ? '#fbbf24' : '#000'; // Mages have glowing eyes
                ctx.fillRect(e.pos.x + 8, e.pos.y + 10 + bob, 4, 4);
                ctx.fillRect(e.pos.x + e.size.x - 12, e.pos.y + 10 + bob, 4, 4);
            } else {
                ctx.fillRect(e.pos.x, e.pos.y + bob, e.size.x, e.size.y);
            }
            
            // Re-apply fill for generic eye drawing if not handled above
            if (e.color !== COLOR_ENEMY_GHOST && e.color !== COLOR_ENEMY_MAGE) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(e.pos.x + 4, e.pos.y + 10 + bob, 4, 4);
                ctx.fillRect(e.pos.x + e.size.x - 8, e.pos.y + 10 + bob, 4, 4);
            }
        }
    });

    // Draw Player
    if (hitFlashRef.current % 4 < 2) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.pos.x, player.pos.y, player.size.x, player.size.y);
        
        // Draw Shield (Parry Visual)
        if (player.isParrying) {
            ctx.strokeStyle = COLOR_SHIELD;
            ctx.lineWidth = 3;
            ctx.beginPath();
            const cx = player.pos.x + player.size.x/2;
            const cy = player.pos.y + player.size.y/2;
            const dir = player.facing || 1;

            if (player.parryDirection === 'UP') {
                // Umbrella shield above head
                ctx.arc(cx, player.pos.y - 10, 40, Math.PI, 0); // Semicircle up
            } else {
                // Forward shield
                ctx.arc(cx, cy, 40, dir === 1 ? -Math.PI/3 : Math.PI*2/3, dir === 1 ? Math.PI/3 : Math.PI*4/3);
            }
            ctx.stroke();
            
            ctx.fillStyle = COLOR_SHIELD;
            ctx.globalAlpha = 0.3;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        ctx.fillStyle = '#fff';
        const eyeX = player.facing === 1 ? player.pos.x + 20 : player.pos.x + 4;
        ctx.fillRect(eyeX, player.pos.y + 10, 8, 4);
    }

    // Draw Particles/Projectiles
    particlesRef.current.forEach(p => {
        if (p.type === EntityType.PROJECTILE) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, p.size.x/2, 0, Math.PI*2);
            ctx.fill();
            // Glow
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else if (p.type === EntityType.PARTICLE) {
           ctx.globalAlpha = (p.life || 0) / (p.maxLife || 20);
           ctx.fillStyle = p.color;
           ctx.fillRect(p.pos.x, p.pos.y, p.size.x, p.size.y);
           ctx.globalAlpha = 1.0;
        }
    });

    // Manual Attack Arc
    if ((player.attackCooldown || 0) > 15) {
        ctx.strokeStyle = COLOR_ATTACK;
        ctx.lineWidth = 4;
        ctx.beginPath();
        const centerX = player.pos.x + player.size.x / 2;
        const centerY = player.pos.y + player.size.y / 2;
        const range = 40 + (player.attackRangeBonus || 0);

        if (lastAttackDirRef.current === 'UP') {
            ctx.arc(centerX, centerY - 20, range, Math.PI, 0); 
        } else if (lastAttackDirRef.current === 'DOWN') {
            ctx.arc(centerX, centerY + 20, range, 0, Math.PI);
        } else {
            const startAngle = player.facing === 1 ? -Math.PI / 3 : Math.PI * 4/3;
            const endAngle = player.facing === 1 ? Math.PI / 3 : Math.PI * 2/3;
            ctx.arc(centerX, centerY, range, startAngle, endAngle, player.facing === -1);
        }
        ctx.stroke();
    }
  }, [currentRoomRef]);

  // Tick
  useEffect(() => {
    const loop = () => {
      update();
      draw();
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update, draw]);

  return (
    <canvas 
      ref={canvasRef} 
      width={CANVAS_WIDTH} 
      height={CANVAS_HEIGHT}
      onContextMenu={(e) => e.preventDefault()}
      className="bg-slate-950 rounded-lg shadow-2xl border-4 border-slate-700 w-full h-auto max-w-4xl cursor-crosshair"
    />
  );
};