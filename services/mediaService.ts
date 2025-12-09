import { GoogleGenAI } from "@google/genai";

// --- 1. IEKŠĒJĀS TIPA DEFINĪCIJAS ---
export type ImageSize = "16:9" | "1:1" | "9:16";

// --- 2. KONFIGURĀCIJA ---

// Google Gemini atslēga (Attēliem)
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

// ElevenLabs atslēga (Balsij)
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || "";

// --- 3. AUDIO ILGUMA NOTEIKŠANA ---
export async function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.src = audioUrl;
    audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
    audio.addEventListener('error', () => resolve(0));
  });
}

// --- 4. BALSS ĢENERĒŠANA (ElevenLabs) ---
export const generateAudio = async (text: string): Promise<string> => {
  const API_KEY = ELEVENLABS_API_KEY.trim(); 
  
  if (!API_KEY || API_KEY.length < 10) {
    console.error("❌ Kļūda: Nav VITE_ELEVENLABS_API_KEY .env failā!");
    return "";
  }

  try {
    const voiceId = "pNInz6obpgDQGcFmaJgB"; // Adam
    console.log(`🎙️ Sūtam pieprasījumu uz ElevenLabs...`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2", 
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ ELEVENLABS KĻŪDA:", JSON.stringify(errorData, null, 2));
      return "";
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    console.log("✅ Balss saņemta!");
    return audioUrl;

  } catch (error) {
    console.error("❌ Tīkla kļūda (Audio):", error);
    return "";
  }
};

// --- 5. ATTĒLU ĢENERĒŠANA (Gemini Imagen - IZLABOTS) ---
export const generateImage = async (basePrompt: string, size: ImageSize): Promise<string> => {
  console.log(`🎨 Ģenerējam attēlu (${size}) ar Gemini...`);

  if (!GOOGLE_API_KEY) {
      console.error("❌ Trūkst VITE_GOOGLE_API_KEY!");
      return "https://placehold.co/1280x720/ef4444/FFF?text=Missing+API+Key";
  }

  try {
    // === LABOJUMS ŠEIT: ===
    // Atslēga obligāti jāpadod objektā { apiKey: ... }, nevis kā pliks teksts
    const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
    
    // Izvēlamies Imagen modeli
    const model = ai.getGenerativeModel({ model: "imagen-3.0-generate-001" });

    // Pielāgojam promptu izmēram
    let aspectRatioPrompt = "";
    if (size === "16:9") aspectRatioPrompt = "Wide landscape aspect ratio, cinematic view.";
    else if (size === "9:16") aspectRatioPrompt = "Tall vertical portrait aspect ratio.";

    const fullPrompt = `${basePrompt}. ${aspectRatioPrompt} High quality, detailed.`;

    // Sūtam pieprasījumu
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    
    const generatedText = response.text();

    if (!generatedText) {
        throw new Error("Tukša atbilde no Imagen");
    }
    
    console.log("✅ Attēls ģenerēts veiksmīgi!");

    // Drošības pārbaude
    if (!generatedText.startsWith("http") && !generatedText.startsWith("data:image")) {
        console.warn("Imagen neatgrieza tiešu URL, skatīt konsoli:", generatedText);
         return `https://placehold.co/1280x720/FFA500/FFF?text=Imagen+Generated+(Check+Console)`;
    }

    return generatedText;

  } catch (error) {
    console.error("❌ Attēla ģenerēšanas kļūda:", error);
    return "https://placehold.co/1280x720/ef4444/FFF?text=Image+Generation+Error";
  }
};
