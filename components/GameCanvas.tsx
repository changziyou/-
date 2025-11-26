import React, { useRef, useEffect, useCallback } from 'react';
import { 
  EntityType, 
  GameState, 
  Entity, 
  Vector, 
  Room,
  ItemType,
  TalentID
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
  COLOR_PLAYER_ARMOR,
  COLOR_ENEMY_SKELETON,
  COLOR_ENEMY_BAT,
  COLOR_ENEMY_SLIME,
  COLOR_ENEMY_GHOST,
  COLOR_ENEMY_MAGE,
  COLOR_ENEMY_BOSS,
  COLOR_NPC_MERCHANT,
  COLOR_ATTACK,
  COLOR_PROJECTILE_ENEMY,
  COLOR_PROJECTILE_PLAYER,
  COLOR_PROJECTILE_MULTI,
  COLOR_SHIELD,
  COLOR_ITEM_HEALTH,
  COLOR_ITEM_RANGE,
  COLOR_ITEM_WEAPON,
  COLOR_COIN,
  ROOM_THEME_COLORS,
  THEME_BLOCK_MAP,
  TILE_SIZE
} from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onUpdateStats: (hp: number, maxHp: number, score: number, gold: number) => void;
  onRoomChange: (roomName: string) => void;
  currentRoomRef: React.MutableRefObject<Room>;
  onOracleTrigger: () => void;
  difficultyLevel: number;
  activeTalent: TalentID | null;
  purchasedItem: ItemType | null; // Trigger from App to Canvas
}

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
  difficultyLevel,
  activeTalent,
  purchasedItem
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
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
    damageBonus: 0,
    hasRangedWeapon: false,
    gold: 0,
    thorns: 0,
    lifestealBonus: 0,
    rangedCooldownMult: 1,
    projectileLifeMult: 1,
    projectileCount: 1
  });

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const particlesRef = useRef<Entity[]>([]);
  const itemsRef = useRef<Entity[]>([]);
  const enemiesKilledRef = useRef<number>(0);
  const hitFlashRef = useRef<number>(0);
  const lastAttackDirRef = useRef<'FWD' | 'UP' | 'DOWN'>('FWD');
  const parryCooldownRef = useRef<number>(0);
  const roomChangeRef = useRef<string>('');

  // Handle purchased items from Shop UI
  useEffect(() => {
    if (!purchasedItem) return;
    const player = playerRef.current;
    if (purchasedItem === 'HEALTH') {
        player.hp = player.maxHp || 100;
    } else if (purchasedItem === 'RANGE_BOOST') {
        player.attackRangeBonus = (player.attackRangeBonus || 0) + 20;
    } else if (purchasedItem === 'RANGED_WEAPON') {
         // Re-purposed as Damage Boost in shop since weapon is middle click default now
         player.damageBonus = (player.damageBonus || 0) + 10;
    }
  }, [purchasedItem]);

  useEffect(() => {
    if (!activeTalent) return;
    const player = playerRef.current;
    
    switch (activeTalent) {
        case 'WARRIOR_THORNS': player.thorns = 0.2; break;
        case 'WARRIOR_RANGE': player.attackRangeBonus = (player.attackRangeBonus || 0) + 30; break;
        case 'WARRIOR_LIFESTEAL': player.lifestealBonus = (player.lifestealBonus || 0) + 15; break;
        case 'MAGE_SPEED': player.rangedCooldownMult = (player.rangedCooldownMult || 1) * 0.6; break;
        case 'MAGE_RANGE': player.projectileLifeMult = (player.projectileLifeMult || 1) * 1.6; break;
        case 'MAGE_MULTI': player.projectileCount = (player.projectileCount || 1) + 2; break;
    }
  }, [activeTalent]);

  useEffect(() => {
    if (currentRoomRef.current.id !== roomChangeRef.current) {
        itemsRef.current = [];
        roomChangeRef.current = currentRoomRef.current.id;
        particlesRef.current = []; 
    }
  }, [currentRoomRef.current.id]);

  const performAttack = useCallback(() => {
    const player = playerRef.current;
    const isUpward = keysRef.current['KeyW'] || keysRef.current['ArrowUp'];
    const isDownward = keysRef.current['KeyS'] || keysRef.current['ArrowDown'];
    
    player.attackCooldown = 20;
    
    const baseRange = 50;
    const range = baseRange + (player.attackRangeBonus || 0);
    const baseDmg = 10;
    const dmg = baseDmg + (player.damageBonus || 0);
    
    let hitbox: Entity;

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
            owner: 'player',
            damage: dmg
        };
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
            owner: 'player',
            damage: dmg
        };
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
            owner: 'player',
            damage: dmg
        };
    }

    particlesRef.current.push(hitbox);
  }, []);

  const performShoot = useCallback(() => {
     const player = playerRef.current;
     // Allow shooting by default now as Middle Click is standard
     if ((player.attackCooldown || 0) > 0) return;

     const cd = Math.floor(25 * (player.rangedCooldownMult || 1));
     player.attackCooldown = cd;

     const isUpward = keysRef.current['KeyW'] || keysRef.current['ArrowUp'];
     const speed = 10;
     const baseDmg = 15;
     const dmg = baseDmg + (player.damageBonus || 0);
     const lifeBase = 120;
     const life = Math.floor(lifeBase * (player.projectileLifeMult || 1));
     
     const count = player.projectileCount || 1;
     const baseAngle = isUpward ? -Math.PI / 2 : (player.facing === 1 ? 0 : Math.PI);

     for (let i = 0; i < count; i++) {
         let angleOffset = 0;
         if (count > 1) {
             const spread = Math.PI / 8;
             const step = spread / (count - 1);
             angleOffset = -spread / 2 + (step * i);
         }
         const finalAngle = baseAngle + angleOffset;
         const vx = Math.cos(finalAngle) * speed;
         const vy = Math.sin(finalAngle) * speed;

         particlesRef.current.push({
             id: `p_proj_${Date.now()}_${i}`,
             type: EntityType.PROJECTILE,
             pos: { 
                 x: player.pos.x + (player.facing === 1 ? player.size.x : 0) + (isUpward ? player.size.x/2 - 8 : 0), 
                 y: player.pos.y + (isUpward ? -10 : 20) 
             },
             size: { x: 12, y: 12 },
             vel: { x: vx, y: vy },
             color: count > 1 ? COLOR_PROJECTILE_MULTI : COLOR_PROJECTILE_PLAYER,
             owner: 'player',
             life: life,
             damage: dmg
         });
     }
  }, []);

  const performParry = useCallback((isUpward: boolean) => {
    if (parryCooldownRef.current > 0) return;
    playerRef.current.isParrying = true;
    playerRef.current.parryDirection = isUpward ? 'UP' : 'FWD';
    playerRef.current.parryTimer = 15; 
    parryCooldownRef.current = 60;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.repeat) return;
      if (gameState === GameState.PLAYING) {
          if (e.code === 'KeyH') onOracleTrigger();
          
          // NPC Interaction
          if (e.code === 'KeyW') {
              const player = playerRef.current;
              const merchant = currentRoomRef.current.entities.find(en => en.type === EntityType.NPC);
              if (merchant) {
                  const dist = Math.abs(player.pos.x - merchant.pos.x);
                  if (dist < 60 && Math.abs(player.pos.y - merchant.pos.y) < 50) {
                      setGameState(GameState.SHOP);
                      return;
                  }
              }
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
                    size: { x: player.size.x, y: 10 },
                    vel: { x: 0, y: 1 },
                    color: '#e2e8f0',
                    life: 15,
                    maxLife: 15
                });
            }
          }
      }
      if (e.code === 'Escape') {
          if (gameState === GameState.PLAYING) setGameState(GameState.PAUSED);
          else if (gameState === GameState.PAUSED) setGameState(GameState.PLAYING);
          else if (gameState === GameState.SHOP) setGameState(GameState.PLAYING);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.code] = false;
    const handleMouseDown = (e: MouseEvent) => {
        if (gameState !== GameState.PLAYING) return;
        if (e.button === 0) {
            if ((playerRef.current.attackCooldown || 0) <= 0) performAttack();
        } else if (e.button === 1) {
             e.preventDefault();
             performShoot();
        } else if (e.button === 2) {
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

  const update = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    const player = playerRef.current;
    const room = currentRoomRef.current;
    const enemiesAreAggressive = difficultyLevel >= 4; 

    if ((player.attackCooldown || 0) > 0) player.attackCooldown = (player.attackCooldown || 0) - 1;
    if (parryCooldownRef.current > 0) parryCooldownRef.current--;
    if ((player.parryTimer || 0) > 0) {
        player.parryTimer = (player.parryTimer || 0) - 1;
        if (player.parryTimer <= 0) player.isParrying = false;
    }

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
    if (player.pos.x < 0) player.pos.x = 0;
    
    // Check for Boss Lock
    const bossAlive = room.entities.some(e => e.type === EntityType.ENEMY && e.isBoss && !e.isDead);
    if (player.pos.x + player.size.x > CANVAS_WIDTH) {
        if (bossAlive) {
            player.pos.x = CANVAS_WIDTH - player.size.x;
            // Maybe add a visual hint
        } else {
            player.pos.x = 10;
            onRoomChange("next");
        }
    }

    room.entities.filter(e => e.type === EntityType.PLATFORM).forEach(plat => {
      if (checkCollision(player, plat)) {
        if (player.vel.x > 0) player.pos.x = plat.pos.x - player.size.x;
        else if (player.vel.x < 0) player.pos.x = plat.pos.x + plat.size.x;
        player.vel.x = 0;
      }
    });

    player.pos.y += player.vel.y;

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
    
    if (player.pos.y > CANVAS_HEIGHT) {
        player.hp = Math.max(0, (player.hp || 0) - 20);
        if ((player.hp || 0) > 0) {
             player.pos.y = 0; 
             player.pos.x = 50; 
             player.vel.y = 0;
             player.vel.x = 0;
             hitFlashRef.current = 30;
        }
    }

    for (let i = itemsRef.current.length - 1; i >= 0; i--) {
        const item = itemsRef.current[i];
        item.vel.y += GRAVITY;
        item.pos.y += item.vel.y;
        room.entities.filter(e => e.type === EntityType.PLATFORM).forEach(plat => {
            if (checkCollision(item, plat)) {
                if (item.vel.y > 0) {
                    item.pos.y = plat.pos.y - item.size.y;
                    item.vel.y = 0;
                    item.vel.x *= 0.9;
                }
            }
        });
        if (checkCollision(player, item)) {
            if (item.itemType === 'COIN') {
                player.gold = (player.gold || 0) + (item.value || 1);
            }
            itemsRef.current.splice(i, 1);
        }
    }

    room.entities.forEach(entity => {
      if (entity.type === EntityType.ENEMY && !entity.isDead) {
        if ((entity.attackCooldown || 0) > 0) entity.attackCooldown = (entity.attackCooldown || 0) - 1;
        const dx = player.pos.x - entity.pos.x;
        const dy = player.pos.y - entity.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const enemyDamage = entity.damage || (10 + difficultyLevel * 2);

        // AI Logic
        if (entity.color === COLOR_ENEMY_SKELETON || entity.isBoss) {
            if ((enemiesAreAggressive || entity.isBoss) && dist < (entity.isBoss ? 100 : 60) && (entity.attackCooldown || 0) <= 0) {
                entity.attackCooldown = 120;
                entity.vel.x = 0;
                particlesRef.current.push({
                    id: `enemy_slash_${Date.now()}`,
                    type: EntityType.ATTACK_HITBOX,
                    pos: { x: dx > 0 ? entity.pos.x + (entity.isBoss ? 60 : 30) : entity.pos.x - 30, y: entity.pos.y + (entity.isBoss ? 40 : 10) },
                    size: { x: entity.isBoss ? 60 : 30, y: entity.isBoss ? 60 : 30 },
                    vel: { x: 0, y: 0 },
                    color: 'transparent',
                    life: 15,
                    owner: 'enemy',
                    damage: enemyDamage
                });
            } else {
                if (!entity.vel.x) entity.vel.x = 1;
                entity.pos.x += entity.vel.x;
                if (entity.pos.x > (entity.patrolEnd || 0)) entity.vel.x = -1;
                if (entity.pos.x < (entity.patrolStart || 0)) entity.vel.x = 1;
            }
        } else if (entity.color === COLOR_ENEMY_BAT) {
            if (dist < 250) {
                entity.pos.x += (dx / dist) * 1.5;
                entity.pos.y += (dy / dist) * 1.5 + Math.sin(Date.now() / 200) * 0.5;
            }
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
        } else if (entity.color === COLOR_ENEMY_GHOST || entity.color === COLOR_ENEMY_MAGE) {
            if (dist > 150) {
                entity.pos.x += (dx > 0 ? 1 : -1) * 0.8;
                entity.pos.y += (dy > 0 ? 1 : -1) * 0.8;
            }
            if (enemiesAreAggressive && dist < 400 && (entity.attackCooldown || 0) <= 0) {
                 entity.attackCooldown = 180;
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
                     damage: enemyDamage
                 });
            }
        }

        if (checkCollision(player, entity)) {
            let blocked = false;
            if (player.isParrying) {
                if (player.parryDirection === 'UP') {
                     if (entity.pos.y + entity.size.y < player.pos.y + player.size.y / 2) blocked = true;
                } else {
                     const isFront = (player.facing === 1 && entity.pos.x > player.pos.x) || (player.facing === -1 && entity.pos.x < player.pos.x);
                     if (isFront) blocked = true;
                }
            }
            if (blocked) {
                 entity.vel.x = player.pos.x < entity.pos.x ? 15 : -15; 
                 if (player.parryDirection === 'UP') entity.vel.y = -10; 
                 entity.pos.x += entity.vel.x; 
                 entity.pos.y += entity.vel.y;
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
                player.hp = Math.max(0, (player.hp || 0) - enemyDamage);
                hitFlashRef.current = 30; 
                player.vel.x = player.pos.x < entity.pos.x ? -10 : 10;
                player.vel.y = -5;
                if ((player.thorns || 0) > 0) {
                    const reflectDmg = enemyDamage * (player.thorns || 0);
                    entity.hp = (entity.hp || 0) - reflectDmg;
                    if ((entity.hp || 0) <= 0) handleEnemyKill(entity);
                }
            }
        }
      }
    });

    const handleEnemyKill = (enemy: Entity) => {
        if (enemy.isDead) return;
        enemy.isDead = true;
        enemy.hp = 0;
        enemiesKilledRef.current++;
        const baseHeal = 10;
        const totalHeal = baseHeal + (player.lifestealBonus || 0);
        player.hp = Math.min((player.hp || 0) + totalHeal, player.maxHp || 100);
        if (enemiesKilledRef.current % 3 === 0) {
            player.maxHp = (player.maxHp || 100) + 20;
            player.damageBonus = (player.damageBonus || 0) + 5;
        }
        
        // Drop Coins logic
        const dropCount = enemy.isBoss ? 10 : 1 + Math.floor(Math.random() * 2); 
        for(let c=0; c<dropCount; c++) {
            itemsRef.current.push({
                id: `coin_${Date.now()}_${c}`,
                type: EntityType.ITEM,
                itemType: 'COIN',
                value: enemy.isBoss ? 10 : 1,
                pos: { x: enemy.pos.x + Math.random()*20, y: enemy.pos.y },
                size: { x: 12, y: 12 },
                vel: { x: (Math.random()-0.5)*4, y: -5 - Math.random()*3 },
                color: COLOR_COIN
            });
        }
    };

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        if (p.type === EntityType.PROJECTILE) {
            p.pos.x += p.vel.x;
            p.pos.y += p.vel.y;
            p.life = (p.life || 0) - 1;

            if (p.owner === 'enemy' && checkCollision(p, player)) {
                let blocked = false;
                if (player.isParrying) {
                    if (player.parryDirection === 'UP') {
                         p.owner = 'player';
                         p.vel.x = 0;
                         p.vel.y = -10;
                         p.color = COLOR_PROJECTILE_PLAYER;
                         p.life = 300;
                         blocked = true;
                    } else {
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
                    player.hp = Math.max(0, (player.hp || 0) - (p.damage || 10));
                    hitFlashRef.current = 30;
                    p.life = 0; 
                }
            }
            if (p.owner === 'player') {
                room.entities.forEach(e => {
                    if (e.type === EntityType.ENEMY && !e.isDead && checkCollision(p, e)) {
                        const dmg = p.damage || 10;
                        e.hp = (e.hp || 0) - dmg;
                        p.life = 0; 
                        if ((e.hp || 0) <= 0) handleEnemyKill(e);
                    }
                });
            }
            room.entities.filter(w => w.type === EntityType.PLATFORM).forEach(w => {
                if (checkCollision(p, w)) p.life = 0;
            });
        } else if (p.type === EntityType.ATTACK_HITBOX) {
            p.life = (p.life || 0) - 1;
            if (p.owner === 'player') {
                let hitSomething = false;
                room.entities.forEach(e => {
                    if (e.type === EntityType.ENEMY && !e.isDead && checkCollision(p, e)) {
                        const dmg = p.damage || 10;
                        e.hp = (e.hp || 0) - dmg;
                        hitSomething = true;
                        if ((e.hp || 0) <= 0) handleEnemyKill(e);
                        else {
                            e.vel.x = player.pos.x < e.pos.x ? 2 : -2;
                            e.pos.x += e.vel.x;
                        }
                    }
                });
                if (hitSomething && p.id.startsWith('atk_down')) {
                    player.vel.y = -10;
                    player.jumpsRemaining = 1;
                }
            } else if (p.owner === 'enemy') {
                if (checkCollision(p, player)) {
                     if (player.isParrying && player.parryDirection === 'FWD') {
                         // Blocked
                     } else if (hitFlashRef.current === 0) {
                         player.hp = Math.max(0, (player.hp || 0) - (p.damage || 10));
                         hitFlashRef.current = 30;
                         player.vel.x = player.pos.x < p.pos.x ? -10 : 10;
                     }
                }
            }
        } else if (p.type === EntityType.PARTICLE) {
            p.life = (p.life || 0) - 1;
            p.pos.x += p.vel.x;
            p.pos.y += p.vel.y;
        }
        if ((p.life || 0) <= 0) particlesRef.current.splice(i, 1);
    }
    if (hitFlashRef.current > 0) hitFlashRef.current--;
    if ((player.hp || 0) <= 0) setGameState(GameState.GAME_OVER);
    onUpdateStats(player.hp || 0, player.maxHp || 100, enemiesKilledRef.current, player.gold || 0);
  }, [gameState, currentRoomRef, onRoomChange, onUpdateStats, setGameState, difficultyLevel]);

  // DRAGON QUEST STYLE RENDERING
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const room = currentRoomRef.current;
    const player = playerRef.current;

    // Background
    const bgColor = ROOM_THEME_COLORS[room.theme] || '#0f172a';
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Blocks
    const blockTheme = THEME_BLOCK_MAP[room.theme] || { main: '#334155', top: null };
    
    room.entities.forEach(e => {
        if (e.type === EntityType.PLATFORM) {
            const cols = Math.ceil(e.size.x / TILE_SIZE);
            const rows = Math.ceil(e.size.y / TILE_SIZE);
            
            for (let r=0; r<rows; r++) {
                for (let c=0; c<cols; c++) {
                    const tx = e.pos.x + c * TILE_SIZE;
                    const ty = e.pos.y + r * TILE_SIZE;
                    const w = Math.min(TILE_SIZE, e.pos.x + e.size.x - tx);
                    const h = Math.min(TILE_SIZE, e.pos.y + e.size.y - ty);
                    
                    ctx.fillStyle = blockTheme.main;
                    ctx.fillRect(tx, ty, w, h);
                    
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.fillRect(tx, ty, 1, h); // Left dark
                    ctx.fillRect(tx, ty, w, 1); // Top dark
                    
                    if (r === 0 && blockTheme.top) {
                         ctx.fillStyle = blockTheme.top;
                         ctx.fillRect(tx, ty, w, 6);
                    }
                }
            }
        }
        
        // NPC
        if (e.type === EntityType.NPC) {
            ctx.save();
            ctx.translate(e.pos.x + e.size.x/2, e.pos.y + e.size.y/2);
            ctx.fillStyle = COLOR_NPC_MERCHANT;
            ctx.fillRect(-10, -20, 20, 40);
            ctx.fillStyle = '#fff';
            // Turban
            ctx.fillRect(-12, -24, 24, 8);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(-10, -20, 20, 40);
            ctx.restore();
            
            // "W" Prompt
            if (Math.abs(player.pos.x - e.pos.x) < 60) {
                 ctx.font = '16px monospace';
                 ctx.fillStyle = '#fff';
                 ctx.fillText("[W]", e.pos.x, e.pos.y - 20);
            }
        }
    });

    // Draw Items (Coins)
    itemsRef.current.forEach(item => {
        const bob = Math.sin(Date.now() / 150) * 4;
        ctx.fillStyle = item.color;
        ctx.save();
        ctx.translate(item.pos.x + 6, item.pos.y + 6 + bob);
        
        if (item.itemType === 'COIN') {
             ctx.beginPath();
             ctx.arc(0, 0, 6, 0, Math.PI * 2);
             ctx.fill();
             ctx.strokeStyle = '#fef08a';
             ctx.stroke();
             ctx.fillStyle = '#000';
             ctx.font = '8px monospace';
             ctx.fillText('G', -3, 3);
        }
        ctx.restore();
    });

    // Draw Enemies
    room.entities.forEach(e => {
        if (e.type === EntityType.ENEMY && !e.isDead) {
            const bob = Math.sin(Date.now() / 200) * 2;
            const cx = e.pos.x + e.size.x/2;
            const cy = e.pos.y + e.size.y/2 + bob;

            ctx.save();
            ctx.translate(cx, cy);
            
            // Outline
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fff'; 
            ctx.fillStyle = e.color;

            if (e.isBoss) {
                // Boss visuals - Big generic monster with spikes
                ctx.fillRect(-e.size.x/2, -e.size.y/2, e.size.x, e.size.y);
                ctx.strokeRect(-e.size.x/2, -e.size.y/2, e.size.x, e.size.y);
                ctx.fillStyle = '#000';
                // Eyes
                ctx.fillRect(-20, -10, 10, 10);
                ctx.fillRect(10, -10, 10, 10);
            } else if (e.color === COLOR_ENEMY_SLIME) {
                // Teardrop Slime
                ctx.beginPath();
                ctx.moveTo(0, -15);
                ctx.bezierCurveTo(15, -15, 18, 15, 0, 15);
                ctx.bezierCurveTo(-18, 15, -15, -15, 0, -15);
                ctx.fill();
                ctx.stroke();
                // Face
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(-5, -2, 4, 0, Math.PI*2); ctx.fill(); 
                ctx.beginPath(); ctx.arc(5, -2, 4, 0, Math.PI*2); ctx.fill();
            } else if (e.color === COLOR_ENEMY_BAT) {
                // Dracky
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Wings
                ctx.fillStyle = e.color;
                ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-20, -10); ctx.lineTo(-15, 5); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(20, -10); ctx.lineTo(15, 5); ctx.fill(); ctx.stroke();
            } else {
                ctx.fillRect(-e.size.x/2, -e.size.y/2, e.size.x, e.size.y);
                ctx.strokeRect(-e.size.x/2, -e.size.y/2, e.size.x, e.size.y);
            }
            
            ctx.restore();
            
            // Health bar
            if ((e.hp || 0) < (e.maxHp || 100)) {
                ctx.fillStyle = '#000';
                ctx.fillRect(e.pos.x, e.pos.y - 15, e.size.x, 4);
                ctx.fillStyle = '#facc15'; 
                const hpPct = Math.max(0, (e.hp || 0) / (entityDamageMap(e) * (e.isBoss ? 15 : 3) || 50)); 
                ctx.fillRect(e.pos.x, e.pos.y - 15, e.size.x * hpPct, 4);
            }
        }
    });

    // Draw Player
    if (hitFlashRef.current % 4 < 2) {
        const px = player.pos.x;
        const py = player.pos.y;
        
        ctx.fillStyle = '#1e3a8a'; // Cape
        ctx.fillRect(px + 4, py + 10, 24, 30);
        ctx.fillStyle = player.color; // Body
        ctx.fillRect(px + 8, py + 18, 16, 20);
        ctx.fillStyle = COLOR_PLAYER_ARMOR; // Armor
        ctx.fillRect(px + 8, py + 18, 16, 12);
        ctx.fillStyle = '#fcd34d'; // Skin
        ctx.fillRect(px + 8, py, 16, 16);
        ctx.fillStyle = '#1d4ed8'; // Helmet
        ctx.fillRect(px + 6, py - 2, 20, 8); 
        ctx.fillStyle = '#fef08a'; // Horns
        ctx.fillRect(px + 4, py - 6, 4, 8);
        ctx.fillRect(px + 24, py - 6, 4, 8);
        ctx.fillStyle = '#000'; // Eyes
        const eyeX = player.facing === 1 ? px + 20 : px + 10;
        ctx.fillRect(eyeX, py + 8, 2, 4);

        if (player.isParrying) {
             ctx.strokeStyle = COLOR_SHIELD;
             ctx.lineWidth = 3;
             ctx.beginPath();
             const cx = px + player.size.x/2;
             const cy = py + player.size.y/2;
             if (player.parryDirection === 'UP') {
                 ctx.arc(cx, py - 10, 25, Math.PI, 0);
             } else {
                 const dir = player.facing || 1;
                 ctx.arc(cx, cy, 25, dir === 1 ? -Math.PI/3 : Math.PI*2/3, dir === 1 ? Math.PI/3 : Math.PI*4/3);
             }
             ctx.stroke();
        }
    }

    // Draw Particles
    particlesRef.current.forEach(p => {
        if (p.type === EntityType.PROJECTILE) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, p.size.x/2, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (p.type === EntityType.PARTICLE) {
           ctx.fillStyle = p.color;
           ctx.fillRect(p.pos.x, p.pos.y, p.size.x, p.size.y);
        }
    });
    
    // Attack Flash
    if ((player.attackCooldown || 0) > 15) {
        ctx.strokeStyle = '#fff'; 
        ctx.lineWidth = 4;
        ctx.beginPath();
        const cx = player.pos.x + player.size.x / 2;
        const cy = player.pos.y + player.size.y / 2;
        const range = 40 + (player.attackRangeBonus || 0);
        
        if (lastAttackDirRef.current === 'UP') {
            ctx.arc(cx, cy, range, Math.PI + 0.5, -0.5); 
        } else if (lastAttackDirRef.current === 'DOWN') {
            ctx.arc(cx, cy, range, 0.5, Math.PI - 0.5);
        } else {
            const startAngle = player.facing === 1 ? -Math.PI / 2 : Math.PI * 1.5;
            const endAngle = player.facing === 1 ? Math.PI / 2 : Math.PI * 0.5;
            ctx.arc(cx, cy, range, startAngle, endAngle, player.facing === -1);
        }
        ctx.stroke();
    }
  }, [currentRoomRef]);

  const entityDamageMap = (e: Entity) => e.damage || 10;

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
      className="dq-window w-full h-auto max-w-4xl cursor-crosshair"
    />
  );
};