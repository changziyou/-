import React, { useState, useRef, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameState, Room, EntityType, LogEntry, Entity, TalentID } from './types';
import { 
    CANVAS_WIDTH, 
    CANVAS_HEIGHT, 
    COLOR_PLATFORM, 
    COLOR_ENEMY_SKELETON, 
    COLOR_ENEMY_BAT, 
    COLOR_ENEMY_SLIME,
    COLOR_ENEMY_GHOST,
    COLOR_ENEMY_MAGE,
    TILE_SIZE
} from './constants';
import { generateLore } from './services/geminiService';

// --- Level Design ---

const createRoom1 = (): Room => ({
  id: 'room_entry',
  name: 'Plains of Beginnings',
  description: 'The journey begins.',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  theme: 'dungeon',
  entities: [
    { id: 'p1', type: EntityType.PLATFORM, pos: { x: 0, y: 550 }, size: { x: 800, y: 64 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p2', type: EntityType.PLATFORM, pos: { x: 300, y: 450 }, size: { x: 224, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p3', type: EntityType.PLATFORM, pos: { x: 600, y: 350 }, size: { x: 160, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'e1', type: EntityType.ENEMY, pos: { x: 650, y: 300 }, size: { x: 32, y: 48 }, vel: {x:0, y:0}, color: COLOR_ENEMY_SKELETON, hp: 30, patrolStart: 600, patrolEnd: 750, damage: 10 },
  ]
});

const createRoom2 = (): Room => ({
  id: 'room_spire',
  name: 'Tower of Trials',
  description: 'Ancient bricks.',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  theme: 'tower',
  entities: [
    { id: 'p1', type: EntityType.PLATFORM, pos: { x: 0, y: 550 }, size: { x: 256, y: 64 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p2', type: EntityType.PLATFORM, pos: { x: 256, y: 450 }, size: { x: 128, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p3', type: EntityType.PLATFORM, pos: { x: 416, y: 350 }, size: { x: 128, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p4', type: EntityType.PLATFORM, pos: { x: 600, y: 550 }, size: { x: 200, y: 64 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'e1', type: EntityType.ENEMY, pos: { x: 400, y: 100 }, size: { x: 24, y: 24 }, vel: {x:0, y:0}, color: COLOR_ENEMY_BAT, hp: 20, damage: 10 },
    { id: 'e2', type: EntityType.ENEMY, pos: { x: 500, y: 150 }, size: { x: 24, y: 24 }, vel: {x:0, y:0}, color: COLOR_ENEMY_BAT, hp: 20, damage: 10 },
  ]
});

const createRoom3 = (): Room => ({
  id: 'room_cistern',
  name: 'Slime Jungle',
  description: 'Sticky and green.',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  theme: 'cistern',
  entities: [
    { id: 'p1', type: EntityType.PLATFORM, pos: { x: 0, y: 550 }, size: { x: 800, y: 64 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p2', type: EntityType.PLATFORM, pos: { x: 96, y: 416 }, size: { x: 128, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p3', type: EntityType.PLATFORM, pos: { x: 288, y: 320 }, size: { x: 192, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p4', type: EntityType.PLATFORM, pos: { x: 608, y: 224 }, size: { x: 160, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'e1', type: EntityType.ENEMY, pos: { x: 350, y: 270 }, size: { x: 32, y: 32 }, vel: {x:0, y:0}, color: COLOR_ENEMY_SLIME, hp: 40, damage: 15 },
    { id: 'e2', type: EntityType.ENEMY, pos: { x: 650, y: 170 }, size: { x: 32, y: 32 }, vel: {x:0, y:0}, color: COLOR_ENEMY_SLIME, hp: 40, damage: 15 },
    { id: 'e3', type: EntityType.ENEMY, pos: { x: 150, y: 500 }, size: { x: 32, y: 32 }, vel: {x:0, y:0}, color: COLOR_ENEMY_SLIME, hp: 40, damage: 15 },
  ]
});

const createRoom4 = (): Room => ({
    id: 'room_summit',
    name: 'Snow Summit',
    description: 'Cold winds.',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    theme: 'summit',
    entities: [
      { id: 'p1', type: EntityType.PLATFORM, pos: { x: 0, y: 550 }, size: { x: 160, y: 64 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
      { id: 'p2', type: EntityType.PLATFORM, pos: { x: 192, y: 448 }, size: { x: 96, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
      { id: 'p3', type: EntityType.PLATFORM, pos: { x: 352, y: 352 }, size: { x: 96, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
      { id: 'p4', type: EntityType.PLATFORM, pos: { x: 512, y: 256 }, size: { x: 96, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
      { id: 'p5', type: EntityType.PLATFORM, pos: { x: 640, y: 550 }, size: { x: 160, y: 64 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
      { id: 'e1', type: EntityType.ENEMY, pos: { x: 200, y: 200 }, size: { x: 30, y: 40 }, vel: {x:0, y:0}, color: COLOR_ENEMY_GHOST, hp: 50, damage: 18 },
      { id: 'e2', type: EntityType.ENEMY, pos: { x: 500, y: 100 }, size: { x: 30, y: 40 }, vel: {x:0, y:0}, color: COLOR_ENEMY_GHOST, hp: 50, damage: 18 },
    ]
});

const createRoom5 = (): Room => ({
    id: 'room_sanctum',
    name: 'Lava Cave',
    description: 'Heat rises.',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    theme: 'volcano',
    entities: [
        { id: 'p1', type: EntityType.PLATFORM, pos: { x: 0, y: 550 }, size: { x: 256, y: 64 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p2', type: EntityType.PLATFORM, pos: { x: 320, y: 448 }, size: { x: 192, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p3', type: EntityType.PLATFORM, pos: { x: 608, y: 352 }, size: { x: 192, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'e1', type: EntityType.ENEMY, pos: { x: 350, y: 410 }, size: { x: 32, y: 48 }, vel: {x:0, y:0}, color: COLOR_ENEMY_MAGE, hp: 60, damage: 20 },
        { id: 'e2', type: EntityType.ENEMY, pos: { x: 650, y: 310 }, size: { x: 32, y: 48 }, vel: {x:0, y:0}, color: COLOR_ENEMY_MAGE, hp: 60, damage: 20 },
        { id: 'e3', type: EntityType.ENEMY, pos: { x: 100, y: 100 }, size: { x: 30, y: 40 }, vel: {x:0, y:0}, color: COLOR_ENEMY_GHOST, hp: 50, damage: 20 },
    ]
});

const createRoom6 = (): Room => ({
    id: 'room_abyss',
    name: 'Dark World',
    description: 'The void stares back.',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    theme: 'void',
    entities: [
        { id: 'p1', type: EntityType.PLATFORM, pos: { x: 0, y: 550 }, size: { x: 128, y: 64 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p2', type: EntityType.PLATFORM, pos: { x: 160, y: 448 }, size: { x: 64, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p3', type: EntityType.PLATFORM, pos: { x: 256, y: 352 }, size: { x: 64, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p4', type: EntityType.PLATFORM, pos: { x: 352, y: 256 }, size: { x: 128, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p5', type: EntityType.PLATFORM, pos: { x: 544, y: 256 }, size: { x: 128, y: 32 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p6', type: EntityType.PLATFORM, pos: { x: 704, y: 550 }, size: { x: 96, y: 64 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'e1', type: EntityType.ENEMY, pos: { x: 400, y: 200 }, size: { x: 32, y: 48 }, vel: {x:0, y:0}, color: COLOR_ENEMY_SKELETON, hp: 100, patrolStart: 350, patrolEnd: 450, damage: 25 },
        { id: 'e2', type: EntityType.ENEMY, pos: { x: 200, y: 100 }, size: { x: 30, y: 40 }, vel: {x:0, y:0}, color: COLOR_ENEMY_MAGE, hp: 80, damage: 25 },
        { id: 'e3', type: EntityType.ENEMY, pos: { x: 600, y: 100 }, size: { x: 30, y: 40 }, vel: {x:0, y:0}, color: COLOR_ENEMY_MAGE, hp: 80, damage: 25 },
    ]
});

// Helper to generate levels 7-16
const generateProceduralRoom = (levelIndex: number): Room => {
    const themes: Room['theme'][] = ['dungeon', 'tower', 'cistern', 'summit', 'volcano', 'void'];
    const theme = themes[levelIndex % themes.length];
    const hpScale = 1 + (levelIndex * 0.3);
    const dmgScale = 10 + (levelIndex * 2); 
    
    const platforms: Entity[] = [
        { id: 'p_base', type: EntityType.PLATFORM, pos: { x: 0, y: 550 }, size: { x: 256, y: 64 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p_end', type: EntityType.PLATFORM, pos: { x: 544, y: 550 }, size: { x: 256, y: 64 }, vel: {x:0, y:0}, color: COLOR_PLATFORM }
    ];

    const numPlats = 3 + Math.floor(Math.random() * 3);
    for(let i=0; i<numPlats; i++) {
        const rawX = 200 + (i * (400/numPlats));
        const rawY = 450 - (Math.random() * 300);
        const x = Math.floor(rawX / TILE_SIZE) * TILE_SIZE;
        const y = Math.floor(rawY / TILE_SIZE) * TILE_SIZE;
        const width = (Math.floor((80 + Math.random()*50) / TILE_SIZE) * TILE_SIZE) || TILE_SIZE * 3;

        platforms.push({
            id: `p_${i}`, type: EntityType.PLATFORM,
            pos: { x, y }, size: { x: width, y: TILE_SIZE },
            vel: {x:0, y:0}, color: COLOR_PLATFORM
        });
    }

    const enemies: Entity[] = [];
    const enemyTypes = [COLOR_ENEMY_SKELETON, COLOR_ENEMY_SLIME, COLOR_ENEMY_BAT, COLOR_ENEMY_GHOST, COLOR_ENEMY_MAGE];
    const numEnemies = 2 + Math.floor(levelIndex / 3);
    
    for(let i=0; i<numEnemies; i++) {
        const typeColor = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const x = 300 + Math.random() * 400;
        const y = 100 + Math.random() * 300;
        
        let w=32, h=32;
        if (typeColor === COLOR_ENEMY_BAT) { w=24; h=24; }
        if (typeColor === COLOR_ENEMY_SKELETON || typeColor === COLOR_ENEMY_MAGE) { w=32; h=48; }
        
        enemies.push({
            id: `e_${i}`,
            type: EntityType.ENEMY,
            pos: { x, y },
            size: { x: w, y: h },
            vel: { x: 0, y: 0 },
            color: typeColor,
            hp: Math.floor(30 * hpScale),
            damage: dmgScale,
            patrolStart: x - 50,
            patrolEnd: x + 50
        });
    }

    return {
        id: `room_${levelIndex}`,
        name: `Level ${levelIndex + 1}: ${theme.charAt(0).toUpperCase() + theme.slice(1)} Area`,
        description: `Monsters grow stronger.`,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        theme: theme,
        entities: [...platforms, ...enemies]
    };
};

const BASE_GENERATORS = [createRoom1, createRoom2, createRoom3, createRoom4, createRoom5, createRoom6];
const ALL_GENERATORS = [...BASE_GENERATORS];
for(let i=6; i<16; i++) {
    ALL_GENERATORS.push(() => generateProceduralRoom(i));
}

// --- Main App ---

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [stats, setStats] = useState({ hp: 100, maxHp: 100, score: 0 });
  const [currentRoomName, setCurrentRoomName] = useState<string>('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [oracleLoading, setOracleLoading] = useState(false);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [activeTalent, setActiveTalent] = useState<TalentID | null>(null);

  const currentRoomRef = useRef<Room>(createRoom1());

  const handleRoomChange = (direction: string) => {
    const nextIndex = (currentRoomIndex + 1) % ALL_GENERATORS.length;
    setCurrentRoomIndex(nextIndex);
    
    if (nextIndex > 0 && nextIndex % 3 === 0) {
        setGameState(GameState.PROMOTION);
    }
    
    const newRoom = ALL_GENERATORS[nextIndex]();
    currentRoomRef.current = newRoom;
    setCurrentRoomName(newRoom.name);
    
    addLog('System', `Arrived at ${newRoom.name}.`);
  };

  const handleSelectTalent = (talent: TalentID) => {
      setActiveTalent(talent);
      setGameState(GameState.PLAYING);
      addLog('System', 'A new ability was learned!');
      setTimeout(() => setActiveTalent(null), 100);
  };

  const updateStats = (hp: number, maxHp: number, score: number) => {
    setStats({ hp, maxHp, score });
  };

  const addLog = (sender: LogEntry['sender'], text: string) => {
    setLogs(prev => [...prev.slice(-4), { sender, text, timestamp: Date.now() }]);
  };

  const handleOracleTrigger = async () => {
    if (gameState === GameState.PLAYING) {
        setGameState(GameState.ORACLE);
        setOracleLoading(true);
        addLog('Player', 'Searching for clues...');
        try {
            const lore = await generateLore(
                currentRoomRef.current.name, 
                stats.hp, 
                stats.maxHp, 
                stats.score
            );
            addLog('Oracle', lore);
        } catch (e) {
            addLog('System', 'Nothing happens.');
        } finally {
            setOracleLoading(false);
        }
    }
  };

  const closeOracle = () => {
      setGameState(GameState.PLAYING);
  };

  const startGame = () => {
    setGameState(GameState.PLAYING);
    setStats({ hp: 100, maxHp: 100, score: 0 });
    setActiveTalent(null);
    setCurrentRoomIndex(0);
    currentRoomRef.current = createRoom1();
    setLogs([]);
    setCurrentRoomName(createRoom1().name);
    addLog('System', 'The Quest Begins!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans bg-[#222] relative select-none">
      
      {/* Dragon Quest HUD */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none font-dq">
        
        {/* Status Window */}
        <div className="dq-window text-white p-4 min-w-[200px]">
            <div className="flex justify-between mb-2">
                <span className="text-yellow-400">HERO</span>
                <span>LV {1 + Math.floor(stats.score / 3)}</span>
            </div>
            <div className="flex justify-between">
                <span>HP:</span>
                <span>{Math.round(stats.hp)} / {stats.maxHp}</span>
            </div>
            <div className="flex justify-between">
                <span>EXP:</span>
                <span>{stats.score}</span>
            </div>
        </div>
        
        {/* Location Window */}
        <div className="dq-window text-white p-2 text-center text-sm">
           {currentRoomName}
        </div>
      </div>

      {/* Control Hints */}
      <div className="absolute bottom-4 left-4 z-10 dq-window text-xs font-dq opacity-90 pointer-events-none">
        <div className="grid grid-cols-2 gap-x-4">
            <span>[A/D] Move</span>
            <span>[SPACE] Jump</span>
            <span>[L-CLICK] Attack</span>
            <span>[R-CLICK] Parry</span>
            <span>[M-CLICK] Magic</span>
            <span>[H] Hint</span>
        </div>
      </div>

      {/* Main Game Container */}
      <div className="relative group shadow-2xl">
        <GameCanvas 
          gameState={gameState} 
          setGameState={setGameState}
          onUpdateStats={updateStats}
          onRoomChange={handleRoomChange}
          currentRoomRef={currentRoomRef}
          onOracleTrigger={handleOracleTrigger}
          difficultyLevel={currentRoomIndex}
          activeTalent={activeTalent}
        />

        {/* Start Screen */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-20">
            <div className="dq-window p-12 text-center">
                <h1 className="text-4xl font-dq text-yellow-400 mb-8 tracking-widest">
                  QUEST FOR THE SPIRE
                </h1>
                <p className="text-white text-md mb-12 font-dq">A Dragon Quest x Terraria Adventure</p>
                <button 
                  onClick={startGame}
                  className="px-8 py-2 bg-black hover:bg-gray-900 text-white font-dq text-xl border-2 border-white animate-pulse"
                >
                  ▶ START QUEST
                </button>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20">
            <div className="dq-window p-8 text-center border-red-600">
                <h2 className="text-4xl font-dq text-red-500 mb-4">THOU HAST DIED</h2>
                <p className="text-white mb-8 font-dq text-lg">Thy deeds shall be remembered.</p>
                <button 
                  onClick={startGame}
                  className="px-6 py-2 bg-black text-white border-2 border-white font-dq hover:text-yellow-400"
                >
                  Resurrect
                </button>
            </div>
          </div>
        )}
        
        {/* Promotion Screen (Skill Window) */}
        {gameState === GameState.PROMOTION && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40 p-8">
            <div className="dq-window p-6 w-full max-w-3xl relative bg-black">
                <div className="text-center text-yellow-400 font-dq text-2xl mb-6 border-b-2 border-white pb-2">
                    Level Up! Choose a Boon
                </div>

                <div className="flex gap-8">
                    {/* Warrior Path */}
                    <div className="flex-1 flex flex-col gap-4">
                        <h3 className="text-blue-400 font-dq text-center text-xl">WARRIOR</h3>
                        <button onClick={() => handleSelectTalent('WARRIOR_THORNS')} className="p-4 border-2 border-white hover:bg-gray-900 text-left group">
                            <div className="text-white font-bold font-dq">Spiked Armor</div>
                            <div className="text-gray-400 text-xs font-pixel mt-1">Reflect 20% damage back.</div>
                        </button>
                        <button onClick={() => handleSelectTalent('WARRIOR_RANGE')} className="p-4 border-2 border-white hover:bg-gray-900 text-left group">
                            <div className="text-white font-bold font-dq">Giant Sword</div>
                            <div className="text-gray-400 text-xs font-pixel mt-1">Attack range UP.</div>
                        </button>
                        <button onClick={() => handleSelectTalent('WARRIOR_LIFESTEAL')} className="p-4 border-2 border-white hover:bg-gray-900 text-left group">
                            <div className="text-white font-bold font-dq">Miracle Sword</div>
                            <div className="text-gray-400 text-xs font-pixel mt-1">Heal on kill.</div>
                        </button>
                    </div>

                    {/* Mage Path */}
                    <div className="flex-1 flex flex-col gap-4">
                        <h3 className="text-pink-400 font-dq text-center text-xl">MAGE</h3>
                        <button onClick={() => handleSelectTalent('MAGE_SPEED')} className="p-4 border-2 border-white hover:bg-gray-900 text-left group">
                            <div className="text-white font-bold font-dq">Quick Chant</div>
                            <div className="text-gray-400 text-xs font-pixel mt-1">Cast speed UP.</div>
                        </button>
                        <button onClick={() => handleSelectTalent('MAGE_RANGE')} className="p-4 border-2 border-white hover:bg-gray-900 text-left group">
                            <div className="text-white font-bold font-dq">Far Reach</div>
                            <div className="text-gray-400 text-xs font-pixel mt-1">Magic distance UP.</div>
                        </button>
                        <button onClick={() => handleSelectTalent('MAGE_MULTI')} className="p-4 border-2 border-white hover:bg-gray-900 text-left group">
                            <div className="text-white font-bold font-dq">Echo Cast</div>
                            <div className="text-gray-400 text-xs font-pixel mt-1">+2 Projectiles.</div>
                        </button>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Oracle/Guide Dialog (Classic Message Box) */}
        {gameState === GameState.ORACLE && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-3/4 z-30">
            <div className="dq-window p-6 bg-black">
                <div className="text-yellow-400 font-dq text-lg mb-2">Narrator:</div>
                <div className="min-h-[60px] text-white font-dq text-xl leading-relaxed tracking-wide">
                    {oracleLoading ? (
                        <span className="animate-pulse">...</span>
                    ) : (
                        logs.length > 0 && logs[logs.length - 1].sender === 'Oracle' 
                        ? logs[logs.length - 1].text 
                        : "The spirits are silent."
                    )}
                </div>
                <div className="text-right mt-2 animate-bounce text-yellow-400">▼</div>
                <button 
                    onClick={closeOracle}
                    className="absolute inset-0 w-full h-full cursor-default"
                />
            </div>
          </div>
        )}
      </div>

      {/* Log Feed (Bottom Right Message Log) */}
      <div className="fixed bottom-4 right-4 w-80 pointer-events-none flex flex-col items-end gap-1 z-50 font-dq text-md">
        {logs.map((log, i) => (
            <div 
                key={log.timestamp + i}
                className="dq-window py-1 px-3 bg-black text-white text-sm"
            >
                {log.sender === 'System' && <span className="text-yellow-400 mr-2">!</span>}
                {log.text}
            </div>
        ))}
      </div>

    </div>
  );
};

export default App;