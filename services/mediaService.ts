// --- 1. IEKŠĒJĀS TIPA DEFINĪCIJAS ---
export type ImageSize = "16:9" | "1:1" | "9:16";

// --- 2. KONFIGURĀCIJA ---

// ŠEIT IELIEC SAVU TIKKO NOKOPĒTO JAUNO ATSLĒGU:
const ELEVENLABS_API_KEY = "sk_f5e273047127efe00dccb8d99429cdbd4ea1504d03fef055"; // <--- IEKOPĒ RŪPĪGI STARP PĒDIŅĀM!

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
  
  // DEBUG: Parādām pirmos 5 simbolus, lai pārliecinātos, ka atslēga ir nomainīta
  console.log(`🔑 Atslēga, ko izmantojam sākas ar: ${API_KEY.substring(0, 5)}...`);
  
  if (!API_KEY || API_KEY.length < 10) {
    console.error("❌ Kļūda: API atslēga izskatās tukša vai pārāk īsa!");
    return "";
  }

  try {
    const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel
    
    // Īsāka teksta versija konsolei
    const logText = text.length > 20 ? text.substring(0, 20) + "..." : text;
    console.log(`🎙️ Sūtam pieprasījumu uz ElevenLabs (${logText})`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ ElevenLabs API KĻŪDA (401 = Nepareiza atslēga):", errorData);
      return "";
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    console.log("✅ URRĀ! Balss ir saņemta!");
    return audioUrl;

  } catch (error) {
    console.error("❌ Tīkla kļūda:", error);
    return "";
  }
};

// --- 5. ATTĒLU ĢENERĒŠANA (Safe Mode) ---
export const generateImage = async (basePrompt: string, size: ImageSize): Promise<string> => {
  return "https://placehold.co/1280x720/22c55e/FFF?text=System+Online"; 
};
