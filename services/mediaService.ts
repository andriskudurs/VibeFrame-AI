import { GoogleGenAI } from "@google/genai";
import { ImageSize, VisualStyle } from "../types";

// --- 1. KONFIGURĀCIJA ---

// TAVA GOOGLE ATSLĒGA (Attēliem) - Šo atstājam, tā ir pareiza
const GOOGLE_API_KEY = "AIzaSyCaj59GBI8VewfIcTgRMxvAdWMtexa-ulA"; 

// TAVA ELEVENLABS ATSLĒGA (Balsij)
// Nokopē to no sava ElevenLabs profila un ieliec pēdiņās!
const ELEVENLABS_API_KEY = "sk_133b207a40e066459dccb49d350bcdfea3dc4856eee4b593"; // <--- IELIEC ŠEIT SAVU ELEVENLABS API KEY

// Balss ID (Rachel - populāra balss). Vari nomainīt vēlāk.
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; 

// -----------------------------------------------------------

// --- 2. BALSS ĢENERĒŠANA (ElevenLabs) ---
export const generateAudio = async (text: string): Promise<string> => {
  console.log("🎙️ Ģenerējam balsi ar ElevenLabs...");

  // Pārbaude, vai lietotājs ielika atslēgu
  if (ELEVENLABS_API_KEY === "sk_..." || !ELEVENLABS_API_KEY) {
    console.error("❌ Trūkst ElevenLabs API atslēgas mediaService.ts failā!");
    return "";
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

  const requestBody = {
    text: text,
    model_id: "eleven_monolingual_v1", // Ātrs un stabils modelis
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY // Šis ir tas, kas autentificē
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ElevenLabs Error: ${errorText}`);
      throw new Error(`ElevenLabs status: ${response.status}`);
    }

    // ElevenLabs atgriež audio kā "blob" (bināru failu)
    const blob = await response.blob();
    
    // Pārvēršam to par URL, ko pārlūks var atskaņot
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
    
  } catch (error) {
    console.error("❌ Balss kļūda (ElevenLabs):", error);
    return ""; 
  }
};

// --- 3. ATTĒLU ĢENERĒŠANA (Gemini / Imagen) ---
export const generateImage = async (basePrompt: string, size: ImageSize, style?: string): Promise<string> => {
  console.log("🎨 Ģenerējam attēlu ar Gemini...");
  
  try {
    const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
    
    // Mēģinām ar Imagen 3
    const model = ai.getGenerativeModel({ model: "imagen-3.0-generate-001" });
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: basePrompt }] }]
    });

    // Pārbaude, vai ir atbilde
    if (!result.response) {
       throw new Error("Tukša atbilde no Gemini");
    }
    
    console.log("Attēls ģenerēts veiksmīgi (API atbildēja)!");
    
    // Šeit mēs pagaidām atgriežam placeholder, jo browserī iegūt tīru URL no Imagen 
    // prasa vēl vienu soli, bet galvenais ir redzēt, vai kļūdas pazūd.
    return "https://placehold.co/1280x720/22c55e/FFF?text=Imagen+Success"; 
    
  } catch (error) {
    console.error("❌ Attēla kļūda:", error);
    return "https://placehold.co/1280x720/333/FFF?text=Image+Error";
  }
};
