import React, { useState, useRef, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameState, Room, EntityType, LogEntry } from './types';
import { 
    CANVAS_WIDTH, 
    CANVAS_HEIGHT, 
    COLOR_PLATFORM, 
    COLOR_ENEMY_SKELETON, 
    COLOR_ENEMY_BAT, 
    COLOR_ENEMY_SLIME,
    COLOR_ENEMY_GHOST,
    COLOR_ENEMY_MAGE,
    ROOM_THEME_COLORS 
} from './constants';
import { generateLore, generateBossTaunt } from './services/geminiService';

// --- Level Design ---

const createRoom1 = (): Room => ({
  id: 'room_entry',
  name: '荒废前厅 (Entrance Hall)',
  description: 'A cold, echoing hall with broken pillars.',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  theme: 'dungeon',
  entities: [
    { id: 'p1', type: EntityType.PLATFORM, pos: { x: 0, y: 550 }, size: { x: 800, y: 50 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p2', type: EntityType.PLATFORM, pos: { x: 300, y: 450 }, size: { x: 200, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p3', type: EntityType.PLATFORM, pos: { x: 600, y: 350 }, size: { x: 150, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'e1', type: EntityType.ENEMY, pos: { x: 650, y: 310 }, size: { x: 32, y: 48 }, vel: {x:0, y:0}, color: COLOR_ENEMY_SKELETON, hp: 30, patrolStart: 600, patrolEnd: 750 },
  ]
});

const createRoom2 = (): Room => ({
  id: 'room_spire',
  name: '幽影回廊 (Shadow Gallery)',
  description: 'Bats hang from the high ceiling.',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  theme: 'tower',
  entities: [
    { id: 'p1', type: EntityType.PLATFORM, pos: { x: 0, y: 550 }, size: { x: 200, y: 50 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p2', type: EntityType.PLATFORM, pos: { x: 250, y: 450 }, size: { x: 100, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p3', type: EntityType.PLATFORM, pos: { x: 400, y: 350 }, size: { x: 100, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p4', type: EntityType.PLATFORM, pos: { x: 600, y: 550 }, size: { x: 200, y: 50 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'e1', type: EntityType.ENEMY, pos: { x: 400, y: 100 }, size: { x: 24, y: 24 }, vel: {x:0, y:0}, color: COLOR_ENEMY_BAT, hp: 20 },
    { id: 'e2', type: EntityType.ENEMY, pos: { x: 500, y: 150 }, size: { x: 24, y: 24 }, vel: {x:0, y:0}, color: COLOR_ENEMY_BAT, hp: 20 },
  ]
});

const createRoom3 = (): Room => ({
  id: 'room_cistern',
  name: '遗忘蓄水池 (Forgotten Cistern)',
  description: 'Green slime drips from the damp walls.',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  theme: 'cistern',
  entities: [
    { id: 'p1', type: EntityType.PLATFORM, pos: { x: 0, y: 550 }, size: { x: 800, y: 50 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p2', type: EntityType.PLATFORM, pos: { x: 100, y: 400 }, size: { x: 100, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p3', type: EntityType.PLATFORM, pos: { x: 300, y: 300 }, size: { x: 200, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'p4', type: EntityType.PLATFORM, pos: { x: 600, y: 200 }, size: { x: 150, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
    { id: 'e1', type: EntityType.ENEMY, pos: { x: 350, y: 270 }, size: { x: 32, y: 32 }, vel: {x:0, y:0}, color: COLOR_ENEMY_SLIME, hp: 40 },
    { id: 'e2', type: EntityType.ENEMY, pos: { x: 650, y: 170 }, size: { x: 32, y: 32 }, vel: {x:0, y:0}, color: COLOR_ENEMY_SLIME, hp: 40 },
    { id: 'e3', type: EntityType.ENEMY, pos: { x: 150, y: 500 }, size: { x: 32, y: 32 }, vel: {x:0, y:0}, color: COLOR_ENEMY_SLIME, hp: 40 },
  ]
});

const createRoom4 = (): Room => ({
    id: 'room_summit',
    name: '低语之巅 (Summit of Whispers)',
    description: 'The air is thin, and spirits roam freely.',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    theme: 'summit',
    entities: [
      { id: 'p1', type: EntityType.PLATFORM, pos: { x: 0, y: 550 }, size: { x: 150, y: 50 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
      { id: 'p2', type: EntityType.PLATFORM, pos: { x: 200, y: 450 }, size: { x: 80, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
      { id: 'p3', type: EntityType.PLATFORM, pos: { x: 350, y: 350 }, size: { x: 80, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
      { id: 'p4', type: EntityType.PLATFORM, pos: { x: 500, y: 250 }, size: { x: 80, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
      { id: 'p5', type: EntityType.PLATFORM, pos: { x: 650, y: 550 }, size: { x: 150, y: 50 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
      { id: 'e1', type: EntityType.ENEMY, pos: { x: 200, y: 200 }, size: { x: 30, y: 40 }, vel: {x:0, y:0}, color: COLOR_ENEMY_GHOST, hp: 50 },
      { id: 'e2', type: EntityType.ENEMY, pos: { x: 500, y: 100 }, size: { x: 30, y: 40 }, vel: {x:0, y:0}, color: COLOR_ENEMY_GHOST, hp: 50 },
    ]
});

const createRoom5 = (): Room => ({
    id: 'room_sanctum',
    name: '黑曜石圣所 (Obsidian Sanctum)',
    description: 'Ancient magic pulses through the dark stone.',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    theme: 'volcano',
    entities: [
        { id: 'p1', type: EntityType.PLATFORM, pos: { x: 0, y: 550 }, size: { x: 200, y: 50 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p2', type: EntityType.PLATFORM, pos: { x: 300, y: 450 }, size: { x: 200, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p3', type: EntityType.PLATFORM, pos: { x: 600, y: 350 }, size: { x: 200, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'e1', type: EntityType.ENEMY, pos: { x: 350, y: 410 }, size: { x: 32, y: 48 }, vel: {x:0, y:0}, color: COLOR_ENEMY_MAGE, hp: 60 },
        { id: 'e2', type: EntityType.ENEMY, pos: { x: 650, y: 310 }, size: { x: 32, y: 48 }, vel: {x:0, y:0}, color: COLOR_ENEMY_MAGE, hp: 60 },
        { id: 'e3', type: EntityType.ENEMY, pos: { x: 100, y: 100 }, size: { x: 30, y: 40 }, vel: {x:0, y:0}, color: COLOR_ENEMY_GHOST, hp: 50 },
    ]
});

const createRoom6 = (): Room => ({
    id: 'room_abyss',
    name: '深渊之巅 (The Abyssal Peak)',
    description: 'The void stares back.',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    theme: 'void',
    entities: [
        { id: 'p1', type: EntityType.PLATFORM, pos: { x: 0, y: 550 }, size: { x: 100, y: 50 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p2', type: EntityType.PLATFORM, pos: { x: 150, y: 450 }, size: { x: 50, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p3', type: EntityType.PLATFORM, pos: { x: 250, y: 350 }, size: { x: 50, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p4', type: EntityType.PLATFORM, pos: { x: 350, y: 250 }, size: { x: 100, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p5', type: EntityType.PLATFORM, pos: { x: 550, y: 250 }, size: { x: 100, y: 20 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'p6', type: EntityType.PLATFORM, pos: { x: 700, y: 550 }, size: { x: 100, y: 50 }, vel: {x:0, y:0}, color: COLOR_PLATFORM },
        { id: 'e1', type: EntityType.ENEMY, pos: { x: 400, y: 200 }, size: { x: 32, y: 48 }, vel: {x:0, y:0}, color: COLOR_ENEMY_SKELETON, hp: 100, patrolStart: 350, patrolEnd: 450 },
        { id: 'e2', type: EntityType.ENEMY, pos: { x: 200, y: 100 }, size: { x: 30, y: 40 }, vel: {x:0, y:0}, color: COLOR_ENEMY_MAGE, hp: 80 },
        { id: 'e3', type: EntityType.ENEMY, pos: { x: 600, y: 100 }, size: { x: 30, y: 40 }, vel: {x:0, y:0}, color: COLOR_ENEMY_MAGE, hp: 80 },
    ]
});

const ROOM_GENERATORS = [createRoom1, createRoom2, createRoom3, createRoom4, createRoom5, createRoom6];

// --- Main App ---

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [stats, setStats] = useState({ hp: 100, maxHp: 100, score: 0 });
  const [currentRoomName, setCurrentRoomName] = useState<string>('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [oracleLoading, setOracleLoading] = useState(false);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);

  const currentRoomRef = useRef<Room>(createRoom1());

  // Room transition logic
  const handleRoomChange = (direction: string) => {
    // Cycle rooms
    const nextIndex = (currentRoomIndex + 1) % ROOM_GENERATORS.length;
    setCurrentRoomIndex(nextIndex);
    
    const newRoom = ROOM_GENERATORS[nextIndex]();
    currentRoomRef.current = newRoom;
    setCurrentRoomName(newRoom.name);
    addLog('System', `Entering ${newRoom.name}...`);
    
    // Hint for difficulty increase
    if (nextIndex === 4) {
        addLog('System', 'WARNING: Enemies have grown stronger.');
    }
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
        addLog('Player', '正在聆听古灵的声音...');
        
        try {
            const lore = await generateLore(
                currentRoomRef.current.name, 
                stats.hp, 
                stats.maxHp, 
                stats.score
            );
            addLog('Oracle', lore);
        } catch (e) {
            addLog('System', 'Connection to the void failed.');
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
    
    // Reset to Room 1
    setCurrentRoomIndex(0);
    currentRoomRef.current = createRoom1();
    
    setLogs([]);
    setCurrentRoomName(createRoom1().name);
    addLog('System', 'Game Started. Climb the tower.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans bg-slate-900 scanlines relative selection:bg-purple-500 selection:text-white">
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-4 bg-black/50 backdrop-blur-sm p-3 border border-slate-700 rounded-lg">
            <div className="w-48 h-6 bg-slate-800 rounded-full overflow-hidden border border-slate-600 relative">
                <div 
                    className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300" 
                    style={{ width: `${Math.max(0, (stats.hp / stats.maxHp) * 100)}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold tracking-widest shadow-black drop-shadow-md">
                    HP {Math.round(stats.hp)}/{stats.maxHp}
                </span>
            </div>
            <div className="text-amber-400 font-pixel text-xs">
                KILLS: {stats.score}
            </div>
        </div>
        
        <div className="text-slate-400 text-xs font-pixel bg-black/50 p-2 rounded w-fit">
           LOCATION: <span className="text-white">{currentRoomName || 'Unknown'}</span>
        </div>
      </div>

      {/* Control Hints */}
      <div className="absolute bottom-4 left-4 z-10 text-slate-500 text-[10px] font-pixel pointer-events-none opacity-60">
        <p>[A/D] Move</p>
        <p>[SPACE] Jump (x2)</p>
        <p>[L-CLICK] Attack</p>
        <p>[R-CLICK] Parry (Forward)</p>
        <p>[W + R-CLICK] Parry (Upward)</p>
        <p>[F] Shoot (Need Item)</p>
        <p>[S + L-CLICK] Down Attack</p>
        <p>[W + L-CLICK] Up Attack</p>
        <p>[H] Consult Spirits</p>
      </div>

      {/* Main Game Container */}
      <div className="relative group">
        <GameCanvas 
          gameState={gameState} 
          setGameState={setGameState}
          onUpdateStats={updateStats}
          onRoomChange={handleRoomChange}
          currentRoomRef={currentRoomRef}
          onOracleTrigger={handleOracleTrigger}
          difficultyLevel={currentRoomIndex}
        />

        {/* Start Screen */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
            <h1 className="text-6xl font-serif-sc font-bold text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-slate-200 mb-8 tracking-widest drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
              幽影之塔
            </h1>
            <p className="text-slate-400 mb-12 font-serif-sc tracking-widest">ECHOES OF THE SPIRE</p>
            <button 
              onClick={startGame}
              className="px-8 py-3 bg-purple-900 hover:bg-purple-700 text-white font-pixel text-sm border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all hover:scale-105"
            >
              START GAME
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
            <h2 className="text-5xl font-pixel text-red-500 mb-4 animate-pulse">YOU DIED</h2>
            <p className="text-slate-300 mb-8">Slain by the shadows of the spire.</p>
            <button 
              onClick={startGame}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-500 font-pixel text-xs"
            >
              TRY AGAIN
            </button>
          </div>
        )}

        {/* Oracle Modal (Gemini) */}
        {gameState === GameState.ORACLE && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30 backdrop-blur-md p-8">
            <div className="bg-slate-900 border-2 border-amber-700/50 p-6 rounded-lg max-w-lg w-full shadow-2xl relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-700 to-transparent opacity-50"></div>
                
                <h3 className="text-amber-500 font-serif-sc text-xl mb-4 flex items-center gap-2">
                    <span className="text-2xl">❖</span> 古灵低语 (Whispers of the Void)
                </h3>
                
                <div className="min-h-[100px] mb-6 text-slate-300 font-serif-sc leading-relaxed italic border-l-2 border-slate-700 pl-4">
                    {oracleLoading ? (
                        <div className="flex gap-2 items-center text-slate-500 animate-pulse">
                            <span>Communing with spirits...</span>
                        </div>
                    ) : (
                        logs.length > 0 && logs[logs.length - 1].sender === 'Oracle' 
                        ? logs[logs.length - 1].text 
                        : "The spirits are silent."
                    )}
                </div>

                <div className="flex justify-end">
                    <button 
                        onClick={closeOracle}
                        className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors text-sm font-pixel"
                    >
                        [CLOSE]
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Feed (Bottom Right) */}
      <div className="fixed bottom-4 right-4 w-80 pointer-events-none flex flex-col items-end gap-1 z-50">
        {logs.map((log, i) => (
            <div 
                key={log.timestamp + i}
                className={`
                    px-3 py-1 rounded text-xs backdrop-blur-md border border-white/10 shadow-lg max-w-full break-words
                    animate-[slideIn_0.3s_ease-out]
                    ${log.sender === 'System' ? 'bg-slate-800/80 text-slate-400' : ''}
                    ${log.sender === 'Player' ? 'bg-blue-900/80 text-blue-200' : ''}
                    ${log.sender === 'Oracle' ? 'bg-amber-900/80 text-amber-200 border-amber-500/30' : ''}
                `}
            >
                <span className="font-bold opacity-50 mr-2">[{log.sender}]</span>
                {log.text}
            </div>
        ))}
      </div>

    </div>
  );
};

export default App;