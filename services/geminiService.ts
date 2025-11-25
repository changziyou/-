import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateLore = async (
  roomName: string,
  currentHp: number,
  maxHp: number,
  enemiesDefeated: number
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "古灵似乎正在沉睡... (API Key missing)";

  const hpPercent = Math.round((currentHp / maxHp) * 100);
  
  const prompt = `
    Context: The player is playing a dark fantasy Metroidvania game called "Echoes of the Spire".
    Current Location: ${roomName}.
    Player Status: ${hpPercent}% Health, ${enemiesDefeated} enemies defeated this run.
    
    Task: You are an ancient, cryptic spirit residing in the tower. 
    Provide a short, atmospheric description of the current room or a cryptic hint about the player's struggle.
    If health is low, be ominous. If health is high, be encouraging but wary.
    
    Output requirement: Plain text, maximum 2 sentences. Language: Chinese (Simplified).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "塔中的迷雾太浓了...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "古灵的声音被静电干扰了...";
  }
};

export const generateBossTaunt = async (bossName: string): Promise<string> => {
    const ai = getClient();
    if (!ai) return "Intruder...";
  
    const prompt = `
      Context: A boss battle in a dark fantasy game. Boss Name: ${bossName}.
      Task: Write a short, menacing taunt line for the boss to say before the fight starts.
      Output requirement: Plain text, 1 sentence. Language: Chinese (Simplified).
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || "受死吧！";
    } catch (error) {
      return "......";
    }
  };