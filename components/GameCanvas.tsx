import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  EntityType, 
  GameState, 
  Entity, 
  Vector, 
  Room 
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
  COLOR_PLATFORM,
  COLOR_ATTACK,
  ROOM_THEME_COLORS
} from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onUpdateStats: (hp: number, maxHp: number, score: number) => void;
  onRoomChange: (roomName: string) => void;
  currentRoomRef: React.MutableRefObject<Room>; // Pass ref to keep data sync
  onOracleTrigger: () => void;
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
  onOracleTrigger
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Game State Refs (Mutable for performance loop)
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
    jumpsRemaining: 2 // Double Jump initialized
  });

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const particlesRef = useRef<Entity[]>([]);
  const attackCooldownRef = useRef<number>(0);
  const enemiesKilledRef = useRef<number>(0);
  const hitFlashRef = useRef<number>(0); // For visual feedback
  const lastAttackDirRef = useRef<'FWD' | 'UP' | 'DOWN'>('FWD');

  // Logic: Perform Attack
  const performAttack = useCallback(() => {
    const player = playerRef.current;
    
    // Check Direction Modifiers
    const isUpward = keysRef.current['KeyW'] || keysRef.current['ArrowUp'];
    const isDownward = keysRef.current['KeyS'] || keysRef.current['ArrowDown'];
    
    attackCooldownRef.current = 20; // Frames
    
    const attackRange = 50;
    let hitbox: Entity;
    let visualVelocity: Vector;
    let visualSize: Vector;
    let visualPos: Vector;

    if (isUpward) {
        lastAttackDirRef.current = 'UP';
        // Upward Attack Hitbox
        hitbox = {
            id: `atk_up_${Date.now()}`,
            type: EntityType.ATTACK_HITBOX,
            pos: { 
                x: player.pos.x - 10, 
                y: player.pos.y - attackRange + 10
            },
            size: { x: player.size.x + 20, y: attackRange },
            vel: { x: 0, y: 0 },
            color: 'transparent',
            life: 8
        };
        visualVelocity = { x: 0, y: -4 };
        visualSize = { x: hitbox.size.x, y: hitbox.size.y };
        visualPos = { x: hitbox.pos.x, y: hitbox.pos.y + 20 };

    } else if (isDownward) {
        lastAttackDirRef.current = 'DOWN';
        // Downward Attack Hitbox
        hitbox = {
            id: `atk_down_${Date.now()}`,
            type: EntityType.ATTACK_HITBOX,
            pos: { 
                x: player.pos.x - 10, 
                y: player.pos.y + player.size.y - 10
            },
            size: { x: player.size.x + 20, y: attackRange },
            vel: { x: 0, y: 0 },
            color: 'transparent',
            life: 8
        };
        visualVelocity = { x: 0, y: 4 };
        visualSize = { x: hitbox.size.x, y: hitbox.size.y };
        visualPos = { x: hitbox.pos.x, y: hitbox.pos.y + player.size.y - 20 };

    } else {
        lastAttackDirRef.current = 'FWD';
        // Forward Attack Hitbox
        hitbox = {
            id: `atk_fwd_${Date.now()}`,
            type: EntityType.ATTACK_HITBOX,
            pos: { 
              x: player.facing === 1 ? player.pos.x + player.size.x : player.pos.x - attackRange,
              y: player.pos.y + 10
            },
            size: { x: attackRange, y: 30 },
            vel: { x: 0, y: 0 },
            color: 'transparent',
            life: 10
        };
        visualVelocity = { x: player.facing! * 2, y: 0 };
        visualSize = { ...hitbox.size };
        visualPos = { ...hitbox.pos };
    }

    particlesRef.current.push(hitbox);

    // Visual Particle (Swipe Effect)
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

  // Initialize inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      
      if (e.repeat) return; // Prevent key repeat for actions like Jump or Oracle

      if (gameState === GameState.PLAYING) {
          if (e.code === 'KeyH') {
            onOracleTrigger();
          }
          // Jump Logic (Space)
          if (e.code === 'Space') {
            const player = playerRef.current;
            if ((player.jumpsRemaining || 0) > 0) {
                player.vel.y = JUMP_FORCE;
                
                // Visual distinction for double jump
                const isAirJump = (player.jumpsRemaining || 0) < 2;

                player.jumpsRemaining = (player.jumpsRemaining || 0) - 1;
                
                // Jump particle
                particlesRef.current.push({
                    id: `jump_dust_${Date.now()}`,
                    type: EntityType.PARTICLE,
                    pos: { x: player.pos.x, y: player.pos.y + player.size.y },
                    size: { x: player.size.x, y: 4 },
                    vel: { x: 0, y: 1 },
                    color: isAirJump ? '#67e8f9' : '#94a3b8', // Cyan for air jump, slate for ground
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
        // Left Click (button 0) for Attack
        if (e.button === 0) {
            e.preventDefault(); // Prevent text selection
            if (attackCooldownRef.current === 0) {
                performAttack();
            }
        }
    };

    const handleContextMenu = (e: Event) => {
        // e.preventDefault(); // Removed to allow normal context menu if wanted, but generally good to keep preventing for webgames
        e.preventDefault();
    };

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
  }, [gameState, onOracleTrigger, setGameState, performAttack]);

  // Main Game Loop
  const update = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    const player = playerRef.current;
    const room = currentRoomRef.current;

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

    // --- Cooldowns ---
    if (attackCooldownRef.current > 0) attackCooldownRef.current--;

    // --- Physics X ---
    player.pos.x += player.vel.x;
    
    // Room Boundaries / Switching
    if (player.pos.x < 0) {
        player.pos.x = 0; 
    } else if (player.pos.x + player.size.x > CANVAS_WIDTH) {
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

    // --- Physics Y ---
    player.pos.y += player.vel.y;

    // Platform Collisions Y
    room.entities.filter(e => e.type === EntityType.PLATFORM).forEach(plat => {
      if (checkCollision(player, plat)) {
        if (player.vel.y > 0) { // Falling -> Landed
          player.pos.y = plat.pos.y - player.size.y;
          player.jumpsRemaining = 2; // Reset Double Jump
        } else if (player.vel.y < 0) { // Jumping up -> Hit head
          player.pos.y = plat.pos.y + plat.size.y;
        }
        player.vel.y = 0;
      }
    });
    
    // Pit death
    if (player.pos.y > CANVAS_HEIGHT) {
        player.hp = 0;
    }

    // --- Enemies Logic ---
    room.entities.forEach(entity => {
      if (entity.type === EntityType.ENEMY && !entity.isDead) {
        
        // --- SKELETON (Patrols ground) ---
        if (entity.color === COLOR_ENEMY_SKELETON) {
            if (!entity.vel.x) entity.vel.x = 1;
            entity.pos.x += entity.vel.x;
            if (entity.pos.x > (entity.patrolEnd || 0)) entity.vel.x = -1;
            if (entity.pos.x < (entity.patrolStart || 0)) entity.vel.x = 1;
        
        // --- BAT (Swoops) ---
        } else if (entity.color === COLOR_ENEMY_BAT) {
            const dx = player.pos.x - entity.pos.x;
            const dy = player.pos.y - entity.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 250) {
                entity.pos.x += (dx / dist) * 1.5;
                entity.pos.y += (dy / dist) * 1.5;
            }

        // --- SLIME (Jumps randomly) ---
        } else if (entity.color === COLOR_ENEMY_SLIME) {
            // Gravity
            entity.vel.y += GRAVITY;
            entity.pos.y += entity.vel.y;
            
            // Floor Collision (Simple, based on initial y or platforms)
            // Ideally should collide with platforms, but for simplicity let's stick to simple floor logic relative to spawn or nearest platform
            // Let's make them collide with platforms same as player
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

            // If on ground, chance to jump towards player
            if (grounded && Math.random() < 0.02) {
                entity.vel.y = -10;
                const dir = player.pos.x > entity.pos.x ? 1 : -1;
                entity.vel.x = dir * 3;
            }
            
            // Air friction
            if (grounded) entity.vel.x = 0;
            else entity.pos.x += entity.vel.x;

        // --- GHOST (Floats slowly through walls) ---
        } else if (entity.color === COLOR_ENEMY_GHOST) {
            const dx = player.pos.x - entity.pos.x;
            const dy = player.pos.y - entity.pos.y;
            // Moves very slowly but constantly
            entity.pos.x += (dx > 0 ? 1 : -1) * 0.8;
            entity.pos.y += (dy > 0 ? 1 : -1) * 0.8;
        }

        // Damage Player
        if (checkCollision(player, entity)) {
            if (hitFlashRef.current === 0) {
                player.hp = Math.max(0, (player.hp || 0) - 10);
                hitFlashRef.current = 30; // Invincibility frames
                // Knockback
                player.vel.x = player.pos.x < entity.pos.x ? -10 : 10;
                player.vel.y = -5;
            }
        }
      }
    });

    // --- Particles & Attacks ---
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life = (p.life || 0) - 1;
        
        if (p.type === EntityType.ATTACK_HITBOX) {
            let hitSomething = false;
            room.entities.forEach(e => {
                if (e.type === EntityType.ENEMY && !e.isDead && checkCollision(p, e)) {
                    e.isDead = true;
                    e.hp = 0;
                    enemiesKilledRef.current++;
                    hitSomething = true;

                    // Spawn death particles
                    for(let k=0; k<5; k++) {
                        particlesRef.current.push({
                            id: `blood_${Date.now()}_${k}`,
                            type: EntityType.PARTICLE,
                            pos: { x: e.pos.x + 10, y: e.pos.y + 10 },
                            size: { x: 4, y: 4 },
                            vel: { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 },
                            color: e.color, // Particles match enemy color
                            life: 20
                        });
                    }
                }
            });

            // POGO LOGIC: If Downward attack hits something, bounce player up
            if (hitSomething && p.id.startsWith('atk_down')) {
                player.vel.y = -10; // Bounce up
                player.jumpsRemaining = 1; // Restore a jump
            }

        } else if (p.type === EntityType.PARTICLE) {
            p.pos.x += p.vel.x;
            p.pos.y += p.vel.y;
        }

        if ((p.life || 0) <= 0) {
            particlesRef.current.splice(i, 1);
        }
    }

    if (hitFlashRef.current > 0) hitFlashRef.current--;

    // Game Over check
    if ((player.hp || 0) <= 0) {
        setGameState(GameState.GAME_OVER);
    }

    // Sync Stats to React
    onUpdateStats(player.hp || 0, player.maxHp || 100, enemiesKilledRef.current);

  }, [gameState, currentRoomRef, onRoomChange, onUpdateStats, setGameState]);

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
            // Detail lines
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1;
            ctx.strokeRect(e.pos.x, e.pos.y, e.size.x, e.size.y);
        }
    });

    // Draw Enemies
    room.entities.forEach(e => {
        if (e.type === EntityType.ENEMY && !e.isDead) {
            ctx.fillStyle = e.color;
            const bob = Math.sin(Date.now() / 200) * 2;
            
            // Draw different shapes based on enemy type
            if (e.color === COLOR_ENEMY_SLIME) {
                // Slime: Semi-circle / Mound
                ctx.beginPath();
                ctx.arc(e.pos.x + e.size.x/2, e.pos.y + e.size.y, e.size.x/2, Math.PI, 0);
                ctx.fill();
                // Eyes
                ctx.fillStyle = '#fff';
                ctx.fillRect(e.pos.x + 8, e.pos.y + 15, 4, 4);
                ctx.fillRect(e.pos.x + e.size.x - 12, e.pos.y + 15, 4, 4);
            } else if (e.color === COLOR_ENEMY_GHOST) {
                // Ghost: Fade at bottom
                ctx.fillRect(e.pos.x, e.pos.y + bob, e.size.x, e.size.y - 10);
                // Tattered bottom
                ctx.beginPath();
                ctx.moveTo(e.pos.x, e.pos.y + e.size.y - 10 + bob);
                ctx.lineTo(e.pos.x + e.size.x/2, e.pos.y + e.size.y + bob);
                ctx.lineTo(e.pos.x + e.size.x, e.pos.y + e.size.y - 10 + bob);
                ctx.lineTo(e.pos.x + e.size.x, e.pos.y + bob);
                ctx.lineTo(e.pos.x, e.pos.y + bob);
                ctx.fill();
                // Eyes
                ctx.fillStyle = '#000';
                ctx.fillRect(e.pos.x + 8, e.pos.y + 10 + bob, 4, 4);
                ctx.fillRect(e.pos.x + e.size.x - 12, e.pos.y + 10 + bob, 4, 4);
            } else {
                // Default / Skeleton / Bat
                ctx.fillRect(e.pos.x, e.pos.y + bob, e.size.x, e.size.y);
                // Eyes
                ctx.fillStyle = '#fff';
                ctx.fillRect(e.pos.x + 4, e.pos.y + 10 + bob, 4, 4);
                ctx.fillRect(e.pos.x + e.size.x - 8, e.pos.y + 10 + bob, 4, 4);
            }

            // Health bar mini
            ctx.fillStyle = 'red';
            ctx.fillRect(e.pos.x, e.pos.y - 10 + bob, e.size.x, 4);
        }
    });

    // Draw Player
    if (hitFlashRef.current % 4 < 2) { // Blink if hit
        ctx.fillStyle = player.color;
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 10;
        ctx.fillRect(player.pos.x, player.pos.y, player.size.x, player.size.y);
        
        // Eyes / Visor
        ctx.fillStyle = '#fff';
        const eyeX = player.facing === 1 ? player.pos.x + 20 : player.pos.x + 4;
        ctx.fillRect(eyeX, player.pos.y + 10, 8, 4);
        
        ctx.shadowBlur = 0;
    }

    // Draw Particles/Attacks
    particlesRef.current.forEach(p => {
        if (p.type === EntityType.ATTACK_HITBOX) {
            // Debug Draw Hitboxes
            // ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            // ctx.strokeRect(p.pos.x, p.pos.y, p.size.x, p.size.y);
        } else if (p.type === EntityType.PARTICLE) {
           ctx.globalAlpha = (p.life || 0) / (p.maxLife || 20);
           ctx.fillStyle = p.color;
           ctx.fillRect(p.pos.x, p.pos.y, p.size.x, p.size.y);
           ctx.globalAlpha = 1.0;
        }
    });

    // Draw Manual Swipe Arc (Additional Polish)
    if (attackCooldownRef.current > 15) {
        ctx.strokeStyle = COLOR_ATTACK;
        ctx.lineWidth = 4;
        ctx.beginPath();
        const centerX = player.pos.x + player.size.x / 2;
        const centerY = player.pos.y + player.size.y / 2;
        
        if (lastAttackDirRef.current === 'UP') {
            // Draw arc above head
            ctx.arc(centerX, centerY - 20, 40, Math.PI, 0); 
        } else if (lastAttackDirRef.current === 'DOWN') {
            // Draw arc below feet
            ctx.arc(centerX, centerY + 20, 40, 0, Math.PI);
        } else {
            // Forward arc
            const startAngle = player.facing === 1 ? -Math.PI / 3 : Math.PI * 4/3;
            const endAngle = player.facing === 1 ? Math.PI / 3 : Math.PI * 2/3;
            ctx.arc(centerX, centerY, 40, startAngle, endAngle, player.facing === -1);
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
      onContextMenu={(e) => e.preventDefault()} // Block context menu
      className="bg-slate-950 rounded-lg shadow-2xl border-4 border-slate-700 w-full h-auto max-w-4xl cursor-crosshair"
    />
  );
};