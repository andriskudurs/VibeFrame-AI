import { GoogleGenAI } from "@google/genai";
import { Project, ImageSize, VisualStyle, ProjectMode, ImageAspectRatio } from "../types";
import { runMultiAgentPipeline } from "./multiAgentService";

// Vecā translateTexts funkcija paliek nemainīga (fail-safe), bet ar ENV atslēgu
export const translateTexts = async (texts: string[], targetLang: string): Promise<string[]> => {
    // Ņemam atslēgu no vides mainīgajiem
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || "";
    if (!apiKey) console.error("⚠️ Trūkst VITE_GOOGLE_API_KEY .env failā!");

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following JSON array of strings to ${targetLang}. Return ONLY the valid JSON array of strings. \n\n ${JSON.stringify(texts)}`,
             config: { responseMimeType: 'application/json' }
        });
        const json = JSON.parse(response.text || "[]");
        return Array.isArray(json) ? json : texts;
    } catch (e) {
        return texts.map(t => `[${targetLang}] ${t}`);
    }
};

// PĀRVEIDOTA generateScript FUNKCIJA
export const generateScript = async (
  topic: string,
  imageSize: ImageSize,
  visualStyle: VisualStyle,
  userTone: string,
  mode: ProjectMode = ProjectMode.EXPLAINER,
  sourceText: string = "",
  // Pievienojam callback opciju statusam (optional, lai nesalauztu vecos call)
  onStatusUpdate?: (agent: string, status: string) => void 
): Promise<Project> => {
  
  // Izmantojam vienkāršu dummy callback, ja tāds nav padots
  const statusCallback = onStatusUpdate || ((a, s) => console.log(`[${a}] ${s}`));

  // Deleģējam visu darbu Multi-Aģentam
  return await runMultiAgentPipeline(
    topic,
    mode,
    visualStyle,
    userTone,
    imageSize,
    sourceText,
    statusCallback
  );
};
