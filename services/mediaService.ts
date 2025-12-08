// import { GoogleGenAI } from "@google/genai"; 
// Pagaidām izslēdzam Google bibliotēku, lai "Build" process būtu stabils.

// --- 1. IEKŠĒJĀS TIPA DEFINĪCIJAS ---
export type ImageSize = "16:9" | "1:1" | "9:16";

// --- 2. KONFIGURĀCIJA ---
const ELEVENLABS_API_KEY = "sk_133b207a40e066459dccb49d350bcdfea3dc4856eee4b593";

// --- 3. AUDIO ILGUMA NOTEIKŠANA (Tava atrastā funkcija - KRITISKI SVARĪGA) ---
// Šo funkciju pārējais projekts meklē, tāpēc bez tās "Build" neizdodas.
export async function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.src = audioUrl;
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration); // Atgriežam ilgumu sekundēs
    });
    audio.addEventListener('error', (e) => {
      // Ja nevar ielādēt, atgriežam 0 vai metam kļūdu, bet labāk neniķoties
      console.warn("Nevarēja noteikt audio garumu", e);
      resolve(0); 
    });
  });
}

// --- 4. BALSS ĢENERĒŠANA (ElevenLabs) ---
export const generateAudio = async (text: string): Promise<string> => {
  const API_KEY = ELEVENLABS_API_KEY; 
  console.log("🚀 Sākam generateAudio...");
  
  if (!API_KEY) {
    console.error("❌ Kļūda: Nav API atslēgas!");
    return "";
  }

  try {
    const voiceId = "21m00Tcm4TlvDq8ikWAM"; 
    // Apgriežam tekstu logam
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
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
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

// --- 5. ATTĒLU ĢENERĒŠANA (Safe Mode) ---
export const generateImage = async (basePrompt: string, size: ImageSize): Promise<string> => {
  console.log(`🎨 Ģenerējam attēlu (${size})...`);
  // Atgriežam placeholder, lai sistēma strādātu, kamēr sakārtojam Google bibliotēkas
  return "https://placehold.co/1280x720/22c55e/FFF?text=System+Online"; 
};
