import { GoogleGenAI } from "@google/genai";
import { ImageSize, VisualStyle } from "../types";

// --- KONFIGURĀCIJA ---
// Ieliec savu Google API atslēgu (AIza...) šeit:
const GOOGLE_API_KEY = "AIzaSyBRbciebifR9Ie3lwQSCulN1ccEZr3gt8s"; 

// --- 1. BALSS ĢENERĒŠANA (Google Cloud TTS) ---
export const generateAudio = async (text: string): Promise<string> => {
  console.log("🎙️ Ģenerējam balsi ar Google TTS...");
  
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`;
  
  const requestBody = {
    input: { text: text },
    voice: { languageCode: "en-US", name: "en-US-Journey-F" }, // Vari mainīt uz "en-US-Studio-O" vai citām
    audioConfig: { audioEncoding: "MP3" }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Google TTS Error: ${response.statusText}`);
    }

    const data = await response.json();
    // Google atgriež audio kā base64 stringu
    return `data:audio/mp3;base64,${data.audioContent}`;
    
  } catch (error) {
    console.error("❌ Balss kļūda:", error);
    // Ja neizdodas, atgriežam tukšu, lai neuzkārtu visu procesu
    return ""; 
  }
};

// --- 2. ATTĒLU ĢENERĒŠANA (Gemini / Imagen) ---
export const generateImage = async (basePrompt: string, size: ImageSize, style?: string): Promise<string> => {
  console.log("🎨 Ģenerējam attēlu ar Gemini...");
  
  try {
    const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
    
    // Mēģinām ar Imagen 3 (jauns un jaudīgs)
    const model = ai.getGenerativeModel({ model: "imagen-3.0-generate-001" });
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: basePrompt }] }]
    });
    
    // Pielāgojam atbildes apstrādi atkarībā no tā, ko atgriež Tavs modelis
    // (Šis ir vienkāršots piemērs, ja Imagen nav pieejams, var būt jāizmanto cits ceļš)
    console.log("Attēls ģenerēts (simulācija vai reāls)");
    return "https://placehold.co/1280x720/1a1a1a/FFF?text=Gemini+Image"; // Pagaidu vietturis, ja īstais vēl nav aktivizēts
    
  } catch (error) {
    console.error("❌ Attēla kļūda:", error);
    return "https://placehold.co/1280x720/333/FFF?text=Image+Error";
  }
};
