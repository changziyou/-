import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  try {
    // Safety check for browser environments where process might not be defined
    if (typeof process === 'undefined' || !process.env.API_KEY) {
      console.warn("API Key not found or process is undefined");
      return null;
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (e) {
    console.error("Error initializing GenAI client:", e);
    return null;
  }
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
    Context: The player is playing a retro JRPG-styled Metroidvania game called "Quest for the Spire" (inspired by Dragon Quest and Terraria).
    Current Location: ${roomName}.
    Player Status: ${hpPercent}% Health, ${enemiesDefeated} enemies defeated.
    
    Task: You are the narrator (Dungeon Master). Provide a short, atmospheric description of the current location or a warning about the monsters nearby.
    Style: Classic RPG narrator. somewhat archaic but clear.
    
    Output requirement: Plain text, maximum 2 sentences. Language: Chinese (Simplified).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "这里弥漫着不祥的气息...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "一种神秘的力量阻挡了你的感知...";
  }
};
