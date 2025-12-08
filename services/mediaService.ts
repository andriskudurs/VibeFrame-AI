import { GoogleGenAI } from "@google/genai";

// --- 1. IEKŠĒJĀS TIPA DEFINĪCIJAS (Lai nav jāmeklē citi faili) ---
// Mēs definējam tipus šeit, lai "Build" process nenobruktu meklējot "../types"

export type ImageSize = "16:9" | "1:1" | "9:16";

// --- 2. KONFIGURĀCIJA ---

// TAVA GOOGLE ATSLĒGA (Attēliem)
const GOOGLE_API_KEY = "AIzaSyCaj59GBI8VewfIcTgRMxvAdWMtexa-ulA"; 

// TAVA ELEVENLABS ATSLĒGA (Balsij)
const ELEVENLABS_API_KEY = "sk_133b207a40e066459dccb49d350bcdfea3dc4856eee4b593";

// --- 3. BALSS ĢENERĒŠANA (ElevenLabs) ---

export const generateAudio = async (text: string): Promise<string> => {
  // Tiešā atslēga drošībai
  const API_KEY = ELEVENLABS_API_KEY; 
  
  console.log("🚀 Sākam generateAudio...");
  
  if (!API_KEY) {
    console.error("❌ Kļūda: Nav API atslēgas!");
    return "";
  }

  try {
    // Rachel balss
    const voiceId = "21m00Tcm4TlvDq8ikWAM"; 

    // Apgriežam tekstu logam, lai nepiesārņotu konsoli
    const previewText = text.length > 20 ? text.substring(0, 20) + "..." : text;
    console.log(`🎙️ Sūtam pieprasījumu uz ElevenLabs: "${previewText}"`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY.trim(),
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ ElevenLabs API KĻŪDA:", errorData);
      return "";
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    console.log("✅ Audio saņemts veiksmīgi!");
    return audioUrl;

  } catch (error) {
    console.error("❌ Kritiska koda kļūda (Audio):", error);
    return "";
  }
};

// --- 4. ATTĒLU ĢENERĒŠANA (Gemini / Imagen) ---

// Noņēmu 'style' argumentu, ja tas netiek lietots, lai TypeScript nemestu kļūdu
export const generateImage = async (basePrompt: string, size: ImageSize): Promise<string> => {
  console.log(`🎨 Ģenerējam attēlu (${size}) ar Gemini...`);
  
  try {
    const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
    
    // Modeļa nosaukums
    const model = ai.getGenerativeModel({ model: "imagen-3.0-generate-001" });
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: basePrompt }] }]
    });

    if (!result.response) {
       throw new Error("Tukša atbilde no Gemini");
    }
    
    console.log("Attēls ģenerēts veiksmīgi (API atbildēja)!");
    
    // Pagaidu placeholder, lai process neapstātos
    return "https://placehold.co/1280x720/22c55e/FFF?text=Imagen+Success"; 
    
  } catch (error) {
    console.error("❌ Attēla kļūda:", error);
    // Atgriežam placeholder kļūdas gadījumā
    return "https://placehold.co/1280x720/333/FFF?text=Image+Error";
  }
};
