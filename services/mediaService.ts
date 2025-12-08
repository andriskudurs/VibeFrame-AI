// import { GoogleGenAI } from "@google/genai"; <--- ŠIS IR TAS, KAS GRAUJ SERVERI
// Mēs to pagaidām izslēdzam, lai dabūtu projektu dzīvu.

// --- 1. IEKŠĒJĀS TIPA DEFINĪCIJAS ---
export type ImageSize = "16:9" | "1:1" | "9:16";

// --- 2. KONFIGURĀCIJA ---
const ELEVENLABS_API_KEY = "sk_133b207a40e066459dccb49d350bcdfea3dc4856eee4b593";

// --- 3. BALSS ĢENERĒŠANA (ElevenLabs - Šim jāstrādā, jo tas neprasa bibliotēkas) ---
export const generateAudio = async (text: string): Promise<string> => {
  const API_KEY = ELEVENLABS_API_KEY; 
  console.log("🚀 Sākam generateAudio...");
  
  if (!API_KEY) {
    console.error("❌ Kļūda: Nav API atslēgas!");
    return "";
  }

  try {
    const voiceId = "21m00Tcm4TlvDq8ikWAM"; 
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

// --- 4. ATTĒLU ĢENERĒŠANA (Izslēgta Google bibliotēka drošībai) ---
export const generateImage = async (basePrompt: string, size: ImageSize): Promise<string> => {
  console.log(`🎨 Ģenerējam attēlu (${size})... (Bibliotēka atslēgta drošībai)`);
  
  // Mēs atgriežam placeholder, lai redzētu, vai serveris beidzot "uzceļas"
  // Kad "Build" būs zaļš, mēs salabosim npm instalāciju.
  return "https://placehold.co/1280x720/22c55e/FFF?text=Build+Fixed+Success"; 
};
